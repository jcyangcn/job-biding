import re

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.application_service import user_can_access_profile
from app.db_models import JobIdentity, JobProgressionEmail, JobProfile, User
from app.models import JobProgressionEmailCreateRequest
from app.profile_service import _format_identity_label, get_profile
from app.progression_email_enums import (
    PROGRESSION_EMAIL_STATUS_VALUES,
    PROGRESSION_EMAIL_TYPE_VALUES,
)


def _validate_type_and_status(data: JobProgressionEmailCreateRequest) -> None:
    if data.type not in PROGRESSION_EMAIL_TYPE_VALUES:
        raise ValueError("Invalid progression email type")
    if data.status not in PROGRESSION_EMAIL_STATUS_VALUES:
        raise ValueError("Invalid progression email status")


def _sanitize_reference_tag(reference_tag: str | None, profile_id: int) -> str:
    raw = (reference_tag or "").strip()
    if not raw:
        raw = f"P{profile_id}"
    sanitized = re.sub(r"[^\w-]+", "_", raw, flags=re.UNICODE).strip("_")
    return sanitized or f"P{profile_id}"


def generate_reference_no(db: Session, profile: JobProfile) -> str:
    base_tag = _sanitize_reference_tag(profile.reference_tag, profile.id)
    count = db.scalar(
        select(func.count())
        .select_from(JobProgressionEmail)
        .where(JobProgressionEmail.profile_id == profile.id)
    ) or 0
    number = count + 1
    candidate = f"{base_tag}_{number}"
    while db.scalar(
        select(func.count())
        .select_from(JobProgressionEmail)
        .where(JobProgressionEmail.reference_no == candidate)
    ):
        number += 1
        candidate = f"{base_tag}_{number}"
    return candidate


def progression_email_to_response(db: Session, record: JobProgressionEmail) -> dict:
    profile = get_profile(db, record.profile_id)
    profile_label = ""
    if profile:
        identity = db.get(JobIdentity, profile.identity_id)
        profile_label = _format_identity_label(identity)

    return {
        "id": record.id,
        "profile_id": record.profile_id,
        "profile_label": profile_label,
        "reference_no": record.reference_no,
        "company": record.company,
        "type": record.type,
        "email_link": record.email_link,
        "email_date": record.email_date,
        "status": record.status,
        "log": record.log,
        "created_at": record.created_at,
    }


def preview_reference_no(db: Session, profile_id: int, user: User) -> str:
    profile = get_profile(db, profile_id)
    if not profile:
        raise ValueError("Profile not found")
    if not profile.is_active:
        raise ValueError("Profile is not active")
    if not user_can_access_profile(user, profile):
        raise PermissionError("Access denied")
    return generate_reference_no(db, profile)


def list_progression_emails_for_profile(
    db: Session, profile_id: int, user: User
) -> list[JobProgressionEmail]:
    profile = get_profile(db, profile_id)
    if not profile:
        raise ValueError("Profile not found")
    if not profile.is_active:
        raise ValueError("Profile is not active")
    if not user_can_access_profile(user, profile):
        raise PermissionError("Access denied")

    return list(
        db.scalars(
            select(JobProgressionEmail)
            .where(JobProgressionEmail.profile_id == profile_id)
            .order_by(
                JobProgressionEmail.email_date.desc(),
                JobProgressionEmail.id.desc(),
            )
        ).all()
    )


def create_progression_email(
    db: Session, data: JobProgressionEmailCreateRequest, user: User
) -> JobProgressionEmail:
    _validate_type_and_status(data)

    profile = get_profile(db, data.profile_id)
    if not profile:
        raise ValueError("Profile not found")
    if not profile.is_active:
        raise ValueError("Profile is not active")
    if not user_can_access_profile(user, profile):
        raise PermissionError("Access denied")

    record = JobProgressionEmail(
        profile_id=data.profile_id,
        reference_no=generate_reference_no(db, profile),
        company=data.company.strip(),
        type=data.type,
        email_link=data.email_link.strip(),
        email_date=data.email_date,
        status=data.status,
        log=data.log or "",
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

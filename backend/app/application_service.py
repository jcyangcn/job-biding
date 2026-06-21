from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db_models import JobApplication, JobIdentity, JobProfile, ResumeGeneration, User
from app.models import JobApplicationCreateRequest
from app.profile_service import _format_identity_label, get_profile
from app.user_roles import UserRole


def user_can_access_profile(user: User, profile: JobProfile) -> bool:
    if user.role == UserRole.admin:
        return True
    return user.id in (profile.bidder_user_id, profile.caller_user_id)


def application_to_response(db: Session, record: JobApplication) -> dict:
    profile = get_profile(db, record.profile_id)
    profile_label = ""
    if profile:
        identity = db.get(JobIdentity, profile.identity_id)
        profile_label = _format_identity_label(identity)

    return {
        "id": record.id,
        "profile_id": record.profile_id,
        "profile_label": profile_label,
        "role": record.role,
        "company": record.company,
        "link": record.link,
        "job_description": record.job_description,
        "resume_generated_id": record.resume_generated_id,
        "resume_online_link": record.resume_online_link,
        "applied_at": record.applied_at,
        "created_at": record.created_at,
    }


def _validate_resume_source(data: JobApplicationCreateRequest) -> None:
    has_generated = data.resume_generated_id is not None
    has_online = bool(data.resume_online_link and data.resume_online_link.strip())
    if has_generated and has_online:
        raise ValueError("Provide only one of resume_generated_id or resume_online_link")
    if not has_generated and not has_online:
        raise ValueError("Provide either resume_generated_id or resume_online_link")


def create_application(
    db: Session, data: JobApplicationCreateRequest, user: User
) -> JobApplication:
    _validate_resume_source(data)

    profile = get_profile(db, data.profile_id)
    if not profile:
        raise ValueError("Profile not found")
    if not profile.is_active:
        raise ValueError("Profile is not active")
    if not user_can_access_profile(user, profile):
        raise PermissionError("Access denied")

    if data.resume_generated_id is not None:
        generation = db.get(ResumeGeneration, data.resume_generated_id)
        if not generation:
            raise ValueError("Resume generation not found")

    record = JobApplication(
        profile_id=data.profile_id,
        role=data.role.strip(),
        company=data.company.strip(),
        link=data.link.strip(),
        job_description=data.job_description.strip(),
        resume_generated_id=data.resume_generated_id,
        resume_online_link=(
            data.resume_online_link.strip() if data.resume_online_link else None
        ),
        applied_at=datetime.now(UTC),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def list_applications_for_profile(
    db: Session, profile_id: int, user: User
) -> list[JobApplication]:
    profile = get_profile(db, profile_id)
    if not profile:
        raise ValueError("Profile not found")
    if not profile.is_active:
        raise ValueError("Profile is not active")
    if not user_can_access_profile(user, profile):
        raise PermissionError("Access denied")

    return list(
        db.scalars(
            select(JobApplication)
            .where(JobApplication.profile_id == profile_id)
            .order_by(JobApplication.applied_at.desc(), JobApplication.id.desc())
        ).all()
    )

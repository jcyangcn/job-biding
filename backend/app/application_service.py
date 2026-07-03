from datetime import datetime
from pathlib import Path

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.db_models import JobApplication, JobIdentity, JobProfile, ResumeGeneration, User
from app.models import JobApplicationCreateRequest, JobApplicationUpdateRequest
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

    resume_pdf_filename = None
    if record.resume_generated_id is not None:
        generation = db.get(ResumeGeneration, record.resume_generated_id)
        if generation and generation.pdf_path:
            resume_pdf_filename = Path(generation.pdf_path).name

    bidder_username = ""
    if record.bidder_user_id is not None:
        bidder = db.get(User, record.bidder_user_id)
        bidder_username = bidder.username if bidder else ""

    return {
        "id": record.id,
        "profile_id": record.profile_id,
        "profile_label": profile_label,
        "bidder_username": bidder_username,
        "role": record.role,
        "company": record.company,
        "link": record.link,
        "job_description": record.job_description,
        "resume_generated_id": record.resume_generated_id,
        "resume_pdf_filename": resume_pdf_filename,
        "resume_online_link": record.resume_online_link,
        "applied": record.applied,
        "applied_at": record.applied_at,
        "created_at": record.created_at,
    }


def _validate_resume_source_fields(
    resume_generated_id: int | None, resume_online_link: str | None
) -> None:
    has_generated = resume_generated_id is not None
    has_online = bool(resume_online_link and resume_online_link.strip())
    if has_generated and has_online:
        raise ValueError("Provide only one of resume_generated_id or resume_online_link")


def _validate_resume_source(data: JobApplicationCreateRequest) -> None:
    _validate_resume_source_fields(data.resume_generated_id, data.resume_online_link)


def get_application(db: Session, application_id: int) -> JobApplication | None:
    return db.get(JobApplication, application_id)


def next_application_number_for_profile(db: Session, profile_id: int) -> int:
    count = db.scalar(
        select(func.count())
        .select_from(JobApplication)
        .where(JobApplication.profile_id == profile_id)
    )
    return (count or 0) + 1


def _ensure_application_access(db: Session, record: JobApplication, user: User) -> JobProfile:
    profile = get_profile(db, record.profile_id)
    if not profile:
        raise ValueError("Profile not found")
    if not user_can_access_profile(user, profile):
        raise PermissionError("Access denied")
    return profile


def _resolve_applied_fields(applied: bool, applied_at: datetime | None) -> datetime | None:
    if applied:
        if applied_at is None:
            raise ValueError("applied_at is required when applied is true")
        return applied_at
    return None


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
        applied=data.applied,
        applied_at=_resolve_applied_fields(data.applied, data.applied_at),
        bidder_user_id=user.id,
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
            .order_by(
                JobApplication.applied_at.desc().nullslast(),
                JobApplication.id.desc(),
            )
        ).all()
    )


def list_applications_admin(
    db: Session, user: User, profile_id: int | None = None
) -> list[JobApplication]:
    if user.role != UserRole.admin:
        raise PermissionError("Access denied")

    query = select(JobApplication).order_by(
        JobApplication.applied_at.desc().nullslast(),
        JobApplication.id.desc(),
    )
    if profile_id is not None:
        query = query.where(JobApplication.profile_id == profile_id)

    return list(db.scalars(query).all())


def list_applications_for_user(db: Session, user: User) -> list[JobApplication]:
    return list(
        db.scalars(
            select(JobApplication)
            .join(JobProfile, JobApplication.profile_id == JobProfile.id)
            .where(
                or_(
                    JobProfile.bidder_user_id == user.id,
                    JobProfile.caller_user_id == user.id,
                )
            )
            .order_by(
                JobApplication.applied_at.desc().nullslast(),
                JobApplication.id.desc(),
            )
        ).all()
    )


def update_application(
    db: Session, application_id: int, data: JobApplicationUpdateRequest, user: User
) -> JobApplication:
    record = get_application(db, application_id)
    if not record:
        raise ValueError("Application not found")

    _ensure_application_access(db, record, user)
    _validate_resume_source_fields(data.resume_generated_id, data.resume_online_link)

    if data.resume_generated_id is not None:
        generation = db.get(ResumeGeneration, data.resume_generated_id)
        if not generation:
            raise ValueError("Resume generation not found")

    record.role = data.role.strip()
    record.company = data.company.strip()
    record.link = data.link.strip()
    record.job_description = data.job_description.strip()
    record.resume_generated_id = data.resume_generated_id
    record.resume_online_link = (
        data.resume_online_link.strip() if data.resume_online_link else None
    )
    if data.applied is not None:
        record.applied = data.applied
        if data.applied:
            applied_at = data.applied_at if data.applied_at is not None else record.applied_at
            record.applied_at = _resolve_applied_fields(True, applied_at)
        else:
            record.applied_at = None
    db.commit()
    db.refresh(record)
    return record


def delete_application(db: Session, application_id: int, user: User) -> None:
    record = get_application(db, application_id)
    if not record:
        raise ValueError("Application not found")
    _ensure_application_access(db, record, user)
    db.delete(record)
    db.commit()

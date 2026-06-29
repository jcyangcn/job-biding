from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.db_models import JobIdentity, JobProfile, User
from app.models import JobIdentityCreateRequest, JobIdentityUpdateRequest
from app.user_roles import UserRole


def identity_to_response(record: JobIdentity) -> dict:
    return {
        "id": record.id,
        "name": record.name,
        "country": record.country,
        "address": record.address,
        "city_state": record.city_state,
        "zipcode": record.zipcode,
        "linkedin": record.linkedin,
        "github": record.github,
        "dob": record.dob,
        "ssn": record.ssn,
        "answers": record.answers or {},
        "created_at": record.created_at,
    }


def list_identities(db: Session) -> list[JobIdentity]:
    return list(db.scalars(select(JobIdentity).order_by(JobIdentity.id)).all())


def user_can_access_identity(db: Session, user: User, identity_id: int) -> bool:
    if user.role == UserRole.admin:
        return True
    count = db.scalar(
        select(func.count())
        .select_from(JobProfile)
        .where(
            JobProfile.identity_id == identity_id,
            or_(
                JobProfile.bidder_user_id == user.id,
                JobProfile.caller_user_id == user.id,
            ),
        )
    )
    return (count or 0) > 0


def list_identities_for_user(db: Session, user: User) -> list[JobIdentity]:
    if user.role == UserRole.admin:
        return list_identities(db)

    identity_ids = db.scalars(
        select(JobProfile.identity_id)
        .where(
            or_(
                JobProfile.bidder_user_id == user.id,
                JobProfile.caller_user_id == user.id,
            )
        )
        .distinct()
    ).all()
    if not identity_ids:
        return []

    return list(
        db.scalars(
            select(JobIdentity)
            .where(JobIdentity.id.in_(identity_ids))
            .order_by(JobIdentity.id)
        ).all()
    )


def get_identity(db: Session, identity_id: int) -> JobIdentity | None:
    return db.get(JobIdentity, identity_id)


def create_identity(db: Session, data: JobIdentityCreateRequest) -> JobIdentity:
    record = JobIdentity(
        name=data.name,
        country=data.country,
        address=data.address,
        city_state=data.city_state or None,
        zipcode=data.zipcode or None,
        linkedin=data.linkedin or None,
        github=data.github or None,
        dob=data.dob,
        ssn=data.ssn or None,
        answers=data.answers or {},
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def update_identity(
    db: Session, record: JobIdentity, data: JobIdentityUpdateRequest
) -> JobIdentity:
    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        if field in ("linkedin", "github", "ssn", "city_state", "zipcode") and value == "":
            value = None
        if field == "answers" and value is None:
            value = {}
        setattr(record, field, value)

    db.commit()
    db.refresh(record)
    return record


def delete_identity(db: Session, record: JobIdentity) -> None:
    db.delete(record)
    db.commit()

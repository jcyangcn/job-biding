from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db_models import JobIdentity
from app.models import JobIdentityCreateRequest, JobIdentityUpdateRequest


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
        "created_at": record.created_at,
    }


def list_identities(db: Session) -> list[JobIdentity]:
    return list(db.scalars(select(JobIdentity).order_by(JobIdentity.id)).all())


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
        setattr(record, field, value)

    db.commit()
    db.refresh(record)
    return record


def delete_identity(db: Session, record: JobIdentity) -> None:
    db.delete(record)
    db.commit()

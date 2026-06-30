from sqlalchemy import or_, select
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.country_codes import format_identity_label
from app.db_models import JobIdentity, JobProfile, User
from app.models import JobProfileCreateRequest, JobProfileUpdateRequest, ResumeDetail
from app.user_roles import UserRole


def _format_identity_label(identity: JobIdentity | None) -> str:
    if not identity:
        return ""
    return format_identity_label(identity.country, identity.name)


def _related_names(db: Session, record: JobProfile) -> tuple[str, str, str]:
    identity = db.get(JobIdentity, record.identity_id)
    bidder = db.get(User, record.bidder_user_id)
    caller = db.get(User, record.caller_user_id) if record.caller_user_id else None
    return (
        _format_identity_label(identity),
        bidder.full_name if bidder else "",
        caller.full_name if caller else "",
    )


def _parse_resume_detail(raw: dict | None) -> ResumeDetail:
    if not raw:
        return ResumeDetail()
    return ResumeDetail.model_validate(raw)


def _serialize_resume_detail(detail: ResumeDetail | dict) -> dict:
    if isinstance(detail, dict):
        return ResumeDetail.model_validate(detail).model_dump(mode="json")
    return detail.model_dump(mode="json")


def profile_to_response(db: Session, record: JobProfile, *, include_admin_fields: bool = True) -> dict:
    identity_name, bidder_name, caller_name = _related_names(db, record)
    return {
        "id": record.id,
        "identity_id": record.identity_id,
        "identity_name": identity_name,
        "bidder_user_id": record.bidder_user_id,
        "bidder_name": bidder_name,
        "caller_user_id": record.caller_user_id,
        "caller_name": caller_name,
        "roles": record.roles,
        "email": record.email,
        "email_password": record.email_password,
        "phone": record.phone,
        "email_detail": record.email_detail if include_admin_fields else "",
        "phone_detail": record.phone_detail if include_admin_fields else "",
        "proxy": record.proxy,
        "reference_tag": record.reference_tag,
        "is_active": record.is_active,
        "resume_detail": _parse_resume_detail(record.resume_detail).model_dump(mode="json"),
        "created_at": record.created_at,
    }


def _validate_refs(db: Session, data: JobProfileCreateRequest) -> None:
    if not db.get(JobIdentity, data.identity_id):
        raise ValueError("Identity not found")

    bidder = db.get(User, data.bidder_user_id)
    if not bidder:
        raise ValueError("Bidder user not found")

    if data.caller_user_id is not None:
        caller = db.get(User, data.caller_user_id)
        if not caller:
            raise ValueError("Caller user not found")


def _validate_ref_updates(db: Session, updates: dict) -> None:
    identity_id = updates.get("identity_id")
    bidder_user_id = updates.get("bidder_user_id")
    caller_user_id = updates.get("caller_user_id")

    if identity_id is not None and not db.get(JobIdentity, identity_id):
        raise ValueError("Identity not found")

    if bidder_user_id is not None and not db.get(User, bidder_user_id):
        raise ValueError("Bidder user not found")

    if caller_user_id is not None and not db.get(User, caller_user_id):
        raise ValueError("Caller user not found")


def list_profiles(db: Session) -> list[JobProfile]:
    return list(db.scalars(select(JobProfile).order_by(JobProfile.id)).all())


def list_profiles_for_user(db: Session, user: User) -> list[JobProfile]:
    query = select(JobProfile).order_by(JobProfile.id)
    if user.role != UserRole.admin:
        query = query.where(
            or_(
                JobProfile.bidder_user_id == user.id,
                JobProfile.caller_user_id == user.id,
            )
        )
    return list(db.scalars(query).all())


def get_profile(db: Session, profile_id: int) -> JobProfile | None:
    return db.get(JobProfile, profile_id)


def create_profile(db: Session, data: JobProfileCreateRequest) -> JobProfile:
    _validate_refs(db, data)
    record = JobProfile(
        identity_id=data.identity_id,
        bidder_user_id=data.bidder_user_id,
        caller_user_id=data.caller_user_id,
        roles=data.roles,
        email=data.email,
        email_password=data.email_password,
        phone=data.phone,
        email_detail=data.email_detail,
        phone_detail=data.phone_detail,
        proxy=data.proxy or None,
        reference_tag=(data.reference_tag.strip() if data.reference_tag else None),
        is_active=data.is_active,
        resume_detail=_serialize_resume_detail(data.resume_detail),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def _apply_profile_detail_fields(record: JobProfile, raw_body: dict | None) -> None:
    if not raw_body:
        return
    if "email_detail" in raw_body:
        record.email_detail = str(raw_body.get("email_detail") or "")
        flag_modified(record, "email_detail")
    if "phone_detail" in raw_body:
        record.phone_detail = str(raw_body.get("phone_detail") or "")
        flag_modified(record, "phone_detail")


def update_profile(
    db: Session,
    record: JobProfile,
    data: JobProfileUpdateRequest,
    *,
    raw_body: dict | None = None,
) -> JobProfile:
    updates = data.model_dump(exclude_unset=True)
    _validate_ref_updates(db, updates)
    for field, value in updates.items():
        if field == "proxy" and value == "":
            value = None
        if field == "reference_tag" and value == "":
            value = None
        if field == "resume_detail" and value is not None:
            value = _serialize_resume_detail(value)
        setattr(record, field, value)

    _apply_profile_detail_fields(record, raw_body)

    db.commit()
    db.refresh(record)
    return record


def delete_profile(db: Session, record: JobProfile) -> None:
    db.delete(record)
    db.commit()

from pathlib import Path
import re
import secrets
from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.orm import Session, aliased
from sqlalchemy.orm.attributes import flag_modified

from app.config import UPLOADS_DIR
from app.country_codes import format_identity_label
from app.db_models import JobIdentity, JobProfile, User
from app.models import JobProfileCreateRequest, JobProfileUpdateRequest, ResumeDetail
from app.pagination import (
    normalize_page_params,
    page_dict,
    paginate_select,
    parse_optional_date,
    resolve_sort,
)
from app.user_roles import UserRole

PROFILE_RESUME_EXTENSIONS = {".pdf", ".doc", ".docx"}


def _format_identity_label(identity: JobIdentity | None) -> str:
    if not identity:
        return ""
    return format_identity_label(identity.country, identity.name)


def _normalize_bidder_user_ids(bidder_user_ids: list[int] | None) -> list[int]:
    if not bidder_user_ids:
        return []
    seen: set[int] = set()
    normalized: list[int] = []
    for user_id in bidder_user_ids:
        if user_id in seen:
            continue
        seen.add(user_id)
        normalized.append(user_id)
    return normalized


def profile_access_filter(user_id: int):
    return or_(
        JobProfile.bidder_user_ids.contains([user_id]),
        JobProfile.caller_user_id == user_id,
    )


def _bidder_names_for_ids(db: Session, bidder_user_ids: list[int]) -> tuple[list[str], str]:
    if not bidder_user_ids:
        return [], ""
    users = list(
        db.scalars(select(User).where(User.id.in_(bidder_user_ids))).all()
    )
    id_to_name = {user.id: user.full_name for user in users}
    names = [id_to_name[user_id] for user_id in bidder_user_ids if user_id in id_to_name]
    return names, ", ".join(names)


def _related_names(db: Session, record: JobProfile) -> tuple[str, list[str], str, str]:
    identity = db.get(JobIdentity, record.identity_id)
    bidder_names, bidder_label = _bidder_names_for_ids(db, record.bidder_user_ids or [])
    caller = db.get(User, record.caller_user_id) if record.caller_user_id else None
    return (
        _format_identity_label(identity),
        bidder_names,
        bidder_label,
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
    identity_name, bidder_names, bidder_name, caller_name = _related_names(db, record)
    return {
        "id": record.id,
        "identity_id": record.identity_id,
        "identity_name": identity_name,
        "bidder_user_ids": record.bidder_user_ids or [],
        "bidder_names": bidder_names,
        "bidder_name": bidder_name,
        "caller_user_id": record.caller_user_id,
        "caller_name": caller_name,
        "roles": record.roles,
        "email": record.email,
        "email_password": record.email_password,
        "phone": record.phone,
        "email_detail": record.email_detail if include_admin_fields else "",
        "phone_detail": record.phone_detail if include_admin_fields else "",
        "cover_letter": record.cover_letter,
        "default_resume_original_name": record.default_resume_original_name,
        "proxy": record.proxy,
        "proxy_detail": record.proxy_detail if include_admin_fields else "",
        "resume_fromAI": bool(record.resume_from_ai),
        "reference_tag": record.reference_tag,
        "is_active": record.is_active,
        "resume_detail": _parse_resume_detail(record.resume_detail).model_dump(mode="json"),
        "created_at": record.created_at,
    }


def user_can_access_profile(user: User, profile: JobProfile) -> bool:
    if user.role == UserRole.admin:
        return True
    return user.id in (profile.bidder_user_ids or []) or user.id == profile.caller_user_id


def _safe_stored_resume_filename(original_name: str) -> str:
    stem = Path(original_name).name
    stem = re.sub(r"[^\w.\-]+", "_", stem).strip("._")
    if not stem:
        stem = "resume.pdf"
    suffix = Path(stem).suffix.lower()
    if suffix not in PROFILE_RESUME_EXTENSIONS:
        stem = f"{stem}.pdf"
    token = secrets.token_hex(4)
    return f"{token}_{stem}"


def _resolve_profile_default_resume_path(stored_name: str) -> Path:
    safe_name = Path(stored_name).name
    if safe_name != stored_name:
        raise ValueError("Invalid filename")
    file_path = (UPLOADS_DIR / safe_name).resolve()
    if file_path.parent != UPLOADS_DIR.resolve():
        raise ValueError("Invalid filename")
    return file_path


def _remove_profile_default_resume_file(record: JobProfile) -> None:
    if not record.default_resume_stored_name:
        return
    try:
        path = _resolve_profile_default_resume_path(record.default_resume_stored_name)
    except ValueError:
        return
    if path.is_file():
        path.unlink()


def set_profile_default_resume(
    db: Session,
    record: JobProfile,
    *,
    original_name: str,
    content: bytes,
) -> JobProfile:
    suffix = Path(original_name).suffix.lower()
    if suffix not in PROFILE_RESUME_EXTENSIONS:
        allowed = ", ".join(sorted(PROFILE_RESUME_EXTENSIONS))
        raise ValueError(f"Unsupported file type. Allowed: {allowed}")

    _remove_profile_default_resume_file(record)
    stored_name = _safe_stored_resume_filename(original_name)
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    (UPLOADS_DIR / stored_name).write_bytes(content)

    record.default_resume_stored_name = stored_name
    record.default_resume_original_name = Path(original_name).name
    db.commit()
    db.refresh(record)
    return record


def resolve_profile_default_resume_path(record: JobProfile) -> Path:
    if not record.default_resume_stored_name:
        raise ValueError("Default resume not found")
    path = _resolve_profile_default_resume_path(record.default_resume_stored_name)
    if not path.is_file():
        raise ValueError("Default resume file not found")
    return path


def _validate_bidder_user_ids(db: Session, bidder_user_ids: list[int] | None) -> list[int]:
    normalized = _normalize_bidder_user_ids(bidder_user_ids)
    if not normalized:
        raise ValueError("At least one bidder is required")
    for user_id in normalized:
        if not db.get(User, user_id):
            raise ValueError("Bidder user not found")
    return normalized


def _validate_refs(db: Session, data: JobProfileCreateRequest) -> None:
    if not db.get(JobIdentity, data.identity_id):
        raise ValueError("Identity not found")

    _validate_bidder_user_ids(db, data.bidder_user_ids)

    if data.caller_user_id is not None:
        caller = db.get(User, data.caller_user_id)
        if not caller:
            raise ValueError("Caller user not found")


def _validate_ref_updates(db: Session, updates: dict) -> None:
    identity_id = updates.get("identity_id")
    bidder_user_ids = updates.get("bidder_user_ids")
    caller_user_id = updates.get("caller_user_id")

    if identity_id is not None and not db.get(JobIdentity, identity_id):
        raise ValueError("Identity not found")

    if bidder_user_ids is not None:
        _validate_bidder_user_ids(db, bidder_user_ids)

    if caller_user_id is not None and not db.get(User, caller_user_id):
        raise ValueError("Caller user not found")


def list_profiles(db: Session) -> list[JobProfile]:
    result = list_profiles_page(db, page=1, page_size=200)
    return result["items"]


def list_profiles_for_user(db: Session, user: User) -> list[JobProfile]:
    result = list_profiles_page(db, user, page=1, page_size=200)
    return result["items"]


def list_profiles_page(
    db: Session,
    user: User | None = None,
    *,
    page: int | None = None,
    page_size: int | None = None,
    search: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    role: str | None = None,
    active: str | None = None,
    sort_by: str | None = None,
    sort_dir: str | None = None,
) -> dict:
    params = normalize_page_params(page, page_size)
    caller = aliased(User)
    query = (
        select(JobProfile)
        .outerjoin(JobIdentity, JobProfile.identity_id == JobIdentity.id)
        .outerjoin(caller, JobProfile.caller_user_id == caller.id)
    )

    if user is not None and user.role != UserRole.admin:
        query = query.where(profile_access_filter(user.id))

    search_text = (search or "").strip()
    if search_text:
        pattern = f"%{search_text}%"
        query = query.where(
            or_(
                JobProfile.email.ilike(pattern),
                JobProfile.phone.ilike(pattern),
                JobProfile.roles.ilike(pattern),
                JobProfile.reference_tag.ilike(pattern),
                JobProfile.proxy.ilike(pattern),
                JobIdentity.name.ilike(pattern),
                JobIdentity.country.ilike(pattern),
                caller.full_name.ilike(pattern),
                cast(JobProfile.id, String).ilike(pattern),
            )
        )

    role_text = (role or "").strip()
    if role_text == "__empty__":
        query = query.where(or_(JobProfile.roles.is_(None), JobProfile.roles == ""))
    elif role_text:
        query = query.where(JobProfile.roles == role_text)

    active_text = (active or "").strip().lower()
    if active_text in ("true", "1", "yes"):
        query = query.where(JobProfile.is_active.is_(True))
    elif active_text in ("false", "0", "no"):
        query = query.where(JobProfile.is_active.is_(False))

    from_date = parse_optional_date(date_from)
    to_date = parse_optional_date(date_to)
    if from_date is not None:
        query = query.where(func.date(JobProfile.created_at) >= from_date)
    if to_date is not None:
        query = query.where(func.date(JobProfile.created_at) <= to_date)

    sort_map = {
        "id": JobProfile.id,
        "email": JobProfile.email,
        "phone": JobProfile.phone,
        "roles": JobProfile.roles,
        "reference_tag": JobProfile.reference_tag,
        "created_at": JobProfile.created_at,
        "is_active": JobProfile.is_active,
        "identity": JobIdentity.name,
        "identity_name": JobIdentity.name,
        "caller_name": caller.full_name,
        "bidder_name": JobProfile.bidder_user_ids,
    }
    column, descending = resolve_sort(sort_by, sort_dir, sort_map, "id")
    order_expr = column.desc() if descending else column.asc()
    if hasattr(order_expr, "nulls_last"):
        order_expr = order_expr.nulls_last()
    query = query.order_by(order_expr, JobProfile.id.asc())

    rows, total = paginate_select(db, query, params)
    return page_dict(list(rows), total, params)


def get_profile(db: Session, profile_id: int) -> JobProfile | None:
    return db.get(JobProfile, profile_id)


def create_profile(db: Session, data: JobProfileCreateRequest) -> JobProfile:
    _validate_refs(db, data)
    record = JobProfile(
        identity_id=data.identity_id,
        bidder_user_ids=_normalize_bidder_user_ids(data.bidder_user_ids),
        caller_user_id=data.caller_user_id,
        roles=data.roles,
        email=data.email,
        email_password=data.email_password,
        phone=data.phone,
        email_detail=data.email_detail,
        phone_detail=data.phone_detail,
        cover_letter=data.cover_letter,
        proxy=data.proxy or None,
        proxy_detail=data.proxy_detail,
        resume_from_ai=bool(data.resume_from_ai),
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
    if "cover_letter" in raw_body:
        record.cover_letter = str(raw_body.get("cover_letter") or "")
        flag_modified(record, "cover_letter")
    if "proxy_detail" in raw_body:
        record.proxy_detail = str(raw_body.get("proxy_detail") or "")
        flag_modified(record, "proxy_detail")


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
        if field == "bidder_user_ids" and value is not None:
            value = _normalize_bidder_user_ids(value)
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

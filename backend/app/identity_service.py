from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.orm import Session

from app.db_models import JobIdentity, JobProfile, User
from app.models import JobIdentityCreateRequest, JobIdentityUpdateRequest
from app.pagination import (
    normalize_page_params,
    page_dict,
    paginate_select,
    parse_optional_date,
    resolve_sort,
)
from app.profile_service import profile_access_filter
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
    result = list_identities_page(db, page=1, page_size=200)
    return result["items"]


def user_can_access_identity(db: Session, user: User, identity_id: int) -> bool:
    if user.role == UserRole.admin:
        return True
    count = db.scalar(
        select(func.count())
        .select_from(JobProfile)
        .where(
            JobProfile.identity_id == identity_id,
            profile_access_filter(user.id),
        )
    )
    return (count or 0) > 0


def list_identities_for_user(db: Session, user: User) -> list[JobIdentity]:
    result = list_identities_page(db, user, page=1, page_size=200)
    return result["items"]


def list_identities_page(
    db: Session,
    user: User | None = None,
    *,
    page: int | None = None,
    page_size: int | None = None,
    search: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    sort_by: str | None = None,
    sort_dir: str | None = None,
) -> dict:
    params = normalize_page_params(page, page_size)
    query = select(JobIdentity)

    if user is not None and user.role != UserRole.admin:
        identity_ids = db.scalars(
            select(JobProfile.identity_id)
            .where(profile_access_filter(user.id))
            .distinct()
        ).all()
        if not identity_ids:
            return page_dict([], 0, params)
        query = query.where(JobIdentity.id.in_(identity_ids))

    search_text = (search or "").strip()
    if search_text:
        pattern = f"%{search_text}%"
        query = query.where(
            or_(
                JobIdentity.name.ilike(pattern),
                JobIdentity.country.ilike(pattern),
                JobIdentity.address.ilike(pattern),
                JobIdentity.city_state.ilike(pattern),
                JobIdentity.zipcode.ilike(pattern),
                JobIdentity.linkedin.ilike(pattern),
                JobIdentity.github.ilike(pattern),
                JobIdentity.ssn.ilike(pattern),
                cast(JobIdentity.id, String).ilike(pattern),
            )
        )

    from_date = parse_optional_date(date_from)
    to_date = parse_optional_date(date_to)
    if from_date is not None:
        query = query.where(func.date(JobIdentity.created_at) >= from_date)
    if to_date is not None:
        query = query.where(func.date(JobIdentity.created_at) <= to_date)

    sort_map = {
        "id": JobIdentity.id,
        "name": JobIdentity.name,
        "country": JobIdentity.country,
        "address": JobIdentity.address,
        "city_state": JobIdentity.city_state,
        "zipcode": JobIdentity.zipcode,
        "linkedin": JobIdentity.linkedin,
        "github": JobIdentity.github,
        "dob": JobIdentity.dob,
        "ssn": JobIdentity.ssn,
        "created_at": JobIdentity.created_at,
    }
    column, descending = resolve_sort(sort_by, sort_dir, sort_map, "id")
    order_expr = column.desc() if descending else column.asc()
    if hasattr(order_expr, "nulls_last"):
        order_expr = order_expr.nulls_last()
    query = query.order_by(order_expr, JobIdentity.id.asc())

    rows, total = paginate_select(db, query, params)
    return page_dict(list(rows), total, params)


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

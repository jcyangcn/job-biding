from sqlalchemy import String, cast, delete, or_, select
from sqlalchemy.orm import Session

from app.db_models import JobSkill
from app.models import SkillBulkReplaceRequest, SkillCreateRequest, SkillUpdateRequest
from app.pagination import (
    normalize_page_params,
    page_dict,
    paginate_select,
    resolve_sort,
)


def skill_to_response(record: JobSkill) -> dict:
    return {
        "id": record.id,
        "role": record.role or "",
        "field": record.field or "",
        "keyword": record.keyword or "",
        "weight": float(record.weight if record.weight is not None else 1.0),
    }


def list_skills(db: Session) -> list[JobSkill]:
    result = list_skills_page(db, page=1, page_size=200)
    return result["items"]


def list_skills_page(
    db: Session,
    *,
    page: int | None = None,
    page_size: int | None = None,
    search: str | None = None,
    role: str | None = None,
    field: str | None = None,
    sort_by: str | None = None,
    sort_dir: str | None = None,
) -> dict:
    params = normalize_page_params(page, page_size)
    query = select(JobSkill)

    search_text = (search or "").strip()
    if search_text:
        pattern = f"%{search_text}%"
        query = query.where(
            or_(
                JobSkill.role.ilike(pattern),
                JobSkill.field.ilike(pattern),
                JobSkill.keyword.ilike(pattern),
                cast(JobSkill.weight, String).ilike(pattern),
                cast(JobSkill.id, String).ilike(pattern),
            )
        )

    role_text = (role or "").strip()
    if role_text:
        query = query.where(JobSkill.role.ilike(role_text))

    field_text = (field or "").strip()
    if field_text:
        query = query.where(JobSkill.field.ilike(field_text))

    sort_map = {
        "id": JobSkill.id,
        "role": JobSkill.role,
        "field": JobSkill.field,
        "keyword": JobSkill.keyword,
        "weight": JobSkill.weight,
    }
    column, descending = resolve_sort(sort_by, sort_dir, sort_map, "id")
    order_expr = column.desc() if descending else column.asc()
    query = query.order_by(order_expr, JobSkill.id.asc())

    rows, total = paginate_select(db, query, params)
    return page_dict(list(rows), total, params)


def list_skill_keywords(db: Session, *, role: str | None = None) -> list[str]:
    """Return keyword strings in stable id order, optionally filtered by role."""
    return [keyword for keyword, _ in list_skill_vector_entries(db, role=role)]


def list_skill_vector_entries(
    db: Session, *, role: str | None = None
) -> list[tuple[str, float]]:
    """Return (keyword, weight) pairs in stable id order for job_vector scoring."""
    query = select(JobSkill).order_by(JobSkill.id.asc())
    role_text = (role or "").strip()
    if role_text:
        matched = list(db.scalars(query.where(JobSkill.role.ilike(role_text))).all())
        if not matched:
            matched = list(db.scalars(query).all())
    else:
        matched = list(db.scalars(query).all())

    entries: list[tuple[str, float]] = []
    for row in matched:
        keyword = (row.keyword or "").strip()
        if keyword:
            entries.append((keyword, float(row.weight if row.weight is not None else 1.0)))
    return entries


def get_skill(db: Session, skill_id: int) -> JobSkill | None:
    return db.get(JobSkill, skill_id)


def create_skill(db: Session, data: SkillCreateRequest) -> JobSkill:
    record = JobSkill(
        role=(data.role or "").strip(),
        field=(data.field or "").strip(),
        keyword=(data.keyword or "").strip(),
        weight=float(data.weight if data.weight is not None else 1.0),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def update_skill(db: Session, record: JobSkill, data: SkillUpdateRequest) -> JobSkill:
    updates = data.model_dump(exclude_unset=True)
    for field_name, value in updates.items():
        if isinstance(value, str):
            value = value.strip()
        if field_name == "weight" and value is not None:
            value = float(value)
        setattr(record, field_name, value)
    db.commit()
    db.refresh(record)
    return record


def delete_skill(db: Session, record: JobSkill) -> None:
    db.delete(record)
    db.commit()


def replace_skills_for_role(db: Session, data: SkillBulkReplaceRequest) -> int:
    role = (data.role or "").strip()
    db.execute(delete(JobSkill).where(JobSkill.role.ilike(role)))
    for item in data.items:
        db.add(
            JobSkill(
                role=role,
                field=(item.field or "").strip(),
                keyword=(item.keyword or "").strip(),
                weight=float(item.weight if item.weight is not None else 1.0),
            )
        )
    db.commit()
    return len(data.items)

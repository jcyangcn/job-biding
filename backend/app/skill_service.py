from sqlalchemy import String, cast, or_, select
from sqlalchemy.orm import Session

from app.db_models import Skill
from app.models import SkillCreateRequest, SkillUpdateRequest
from app.pagination import (
    normalize_page_params,
    page_dict,
    paginate_select,
    resolve_sort,
)


def skill_to_response(record: Skill) -> dict:
    return {
        "id": record.id,
        "role": record.role or "",
        "field": record.field or "",
        "keyword": record.keyword or "",
        "weight": None if record.weight is None else float(record.weight),
        "created_at": record.created_at,
    }


def list_skills(db: Session) -> list[Skill]:
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
    query = select(Skill)

    search_text = (search or "").strip()
    if search_text:
        pattern = f"%{search_text}%"
        query = query.where(
            or_(
                Skill.role.ilike(pattern),
                Skill.field.ilike(pattern),
                Skill.keyword.ilike(pattern),
                cast(Skill.weight, String).ilike(pattern),
                cast(Skill.id, String).ilike(pattern),
            )
        )

    role_text = (role or "").strip()
    if role_text:
        query = query.where(Skill.role == role_text)

    field_text = (field or "").strip()
    if field_text:
        query = query.where(Skill.field == field_text)

    sort_map = {
        "id": Skill.id,
        "role": Skill.role,
        "field": Skill.field,
        "keyword": Skill.keyword,
        "weight": Skill.weight,
        "created_at": Skill.created_at,
    }
    column, descending = resolve_sort(sort_by, sort_dir, sort_map, "id")
    order_expr = column.desc() if descending else column.asc()
    query = query.order_by(order_expr, Skill.id.asc())

    rows, total = paginate_select(db, query, params)
    return page_dict(list(rows), total, params)


def list_skill_keywords(db: Session, *, role: str | None = None) -> list[str]:
    """Flatten skill keywords in stable id order, optionally filtered by role."""
    from app.job_vector import parse_keyword_entries

    query = select(Skill).order_by(Skill.id.asc())
    role_text = (role or "").strip()
    if role_text:
        matched = list(db.scalars(query.where(Skill.role.ilike(role_text))).all())
        if not matched:
            matched = list(db.scalars(query).all())
    else:
        matched = list(db.scalars(query).all())

    keywords: list[str] = []
    for row in matched:
        keywords.extend(parse_keyword_entries(row.keyword))
    return keywords


def get_skill(db: Session, skill_id: int) -> Skill | None:
    return db.get(Skill, skill_id)


def create_skill(db: Session, data: SkillCreateRequest) -> Skill:
    record = Skill(
        role=(data.role or "").strip(),
        field=(data.field or "").strip(),
        keyword=(data.keyword or "").strip(),
        weight=1.0 if data.weight is None else float(data.weight),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def update_skill(db: Session, record: Skill, data: SkillUpdateRequest) -> Skill:
    updates = data.model_dump(exclude_unset=True)
    for field_name, value in updates.items():
        if isinstance(value, str):
            value = value.strip()
        if field_name == "weight":
            value = None if value is None else float(value)
        setattr(record, field_name, value)
    db.commit()
    db.refresh(record)
    return record


def delete_skill(db: Session, record: Skill) -> None:
    db.delete(record)
    db.commit()

from sqlalchemy import String, cast, or_, select
from sqlalchemy.orm import Session

from app.db_models import Company
from app.job_vector import build_job_vector
from app.models import CompanyCreateRequest, CompanyUpdateRequest
from app.pagination import (
    normalize_page_params,
    page_dict,
    paginate_select,
    resolve_sort,
)
from app.skill_service import list_skill_keywords


def company_to_response(record: Company) -> dict:
    return {
        "id": record.id,
        "company": record.company or "",
        "url": record.url or "",
        "job_description": record.job_description or "",
        "job_vector": list(record.job_vector or []),
        "created_at": record.created_at,
    }


def _resolve_job_vector(
    db: Session,
    *,
    job_description: str,
    provided: list[float] | None,
) -> list[float]:
    keywords = list_skill_keywords(db)
    if provided is not None and len(provided) == len(keywords):
        return [float(value) for value in provided]
    return build_job_vector(job_description, keywords)


def list_companies_page(
    db: Session,
    *,
    page: int | None = None,
    page_size: int | None = None,
    search: str | None = None,
    sort_by: str | None = None,
    sort_dir: str | None = None,
) -> dict:
    params = normalize_page_params(page, page_size)
    query = select(Company)

    search_text = (search or "").strip()
    if search_text:
        pattern = f"%{search_text}%"
        query = query.where(
            or_(
                Company.company.ilike(pattern),
                Company.url.ilike(pattern),
                Company.job_description.ilike(pattern),
                cast(Company.id, String).ilike(pattern),
            )
        )

    sort_map = {
        "id": Company.id,
        "company": Company.company,
        "url": Company.url,
        "job_description": Company.job_description,
        "created_at": Company.created_at,
    }
    column, descending = resolve_sort(sort_by, sort_dir, sort_map, "id")
    order_expr = column.desc() if descending else column.asc()
    query = query.order_by(order_expr, Company.id.asc())

    rows, total = paginate_select(db, query, params)
    return page_dict(list(rows), total, params)


def get_company(db: Session, company_id: int) -> Company | None:
    return db.get(Company, company_id)


def create_company(db: Session, data: CompanyCreateRequest) -> Company:
    job_description = (data.job_description or "").strip()
    record = Company(
        company=(data.company or "").strip(),
        url=(data.url or "").strip(),
        job_description=job_description,
        job_vector=_resolve_job_vector(
            db,
            job_description=job_description,
            provided=data.job_vector,
        ),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def update_company(db: Session, record: Company, data: CompanyUpdateRequest) -> Company:
    updates = data.model_dump(exclude_unset=True)
    provided_vector = updates.pop("job_vector", None)

    if "company" in updates and updates["company"] is not None:
        record.company = str(updates["company"]).strip()
    if "url" in updates and updates["url"] is not None:
        record.url = str(updates["url"]).strip()
    if "job_description" in updates and updates["job_description"] is not None:
        record.job_description = str(updates["job_description"]).strip()

    record.job_vector = _resolve_job_vector(
        db,
        job_description=record.job_description or "",
        provided=provided_vector,
    )
    db.commit()
    db.refresh(record)
    return record


def delete_company(db: Session, record: Company) -> None:
    db.delete(record)
    db.commit()

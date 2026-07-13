from sqlalchemy import String, cast, delete, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db_models import JobApplication, JobPost, ResumeGeneration
from app.job_vector import build_job_vector_weighted
from app.models import JobPostCreateRequest, JobPostUpdateRequest
from app.pagination import (
    normalize_page_params,
    page_dict,
    paginate_select,
    resolve_sort,
)
from app.skill_service import list_skill_vector_entries


def job_post_to_response(record: JobPost) -> dict:
    return {
        "id": record.id,
        "company": record.company or "",
        "role": record.role or "",
        "url": record.url or "",
        "job_description": record.job_description or "",
        "job_vector": list(record.job_vector or []),
        "created_at": record.created_at,
    }


def _resolve_job_vector(
    db: Session,
    *,
    job_description: str,
    role: str | None = None,
) -> list[float]:
    role_text = (role or "").strip()
    entries = list_skill_vector_entries(db, role=role_text or None)
    return build_job_vector_weighted(job_description, entries)


def list_job_posts_page(
    db: Session,
    *,
    page: int | None = None,
    page_size: int | None = None,
    search: str | None = None,
    sort_by: str | None = None,
    sort_dir: str | None = None,
) -> dict:
    params = normalize_page_params(page, page_size)
    query = select(JobPost)

    search_text = (search or "").strip()
    if search_text:
        pattern = f"%{search_text}%"
        query = query.where(
            or_(
                JobPost.company.ilike(pattern),
                JobPost.role.ilike(pattern),
                JobPost.url.ilike(pattern),
                JobPost.job_description.ilike(pattern),
                cast(JobPost.id, String).ilike(pattern),
            )
        )

    sort_map = {
        "id": JobPost.id,
        "company": JobPost.company,
        "role": JobPost.role,
        "url": JobPost.url,
        "job_description": JobPost.job_description,
        "created_at": JobPost.created_at,
    }
    column, descending = resolve_sort(sort_by, sort_dir, sort_map, "id")
    order_expr = column.desc() if descending else column.asc()
    query = query.order_by(order_expr, JobPost.id.asc())

    rows, total = paginate_select(db, query, params)
    return page_dict(list(rows), total, params)


def get_job_post(db: Session, post_id: int) -> JobPost | None:
    return db.get(JobPost, post_id)


def create_job_post(db: Session, data: JobPostCreateRequest) -> JobPost:
    job_description = (data.job_description or "").strip()
    record = JobPost(
        company=(data.company or "").strip(),
        role=(data.role or "").strip(),
        url=(data.url or "").strip(),
        job_description=job_description,
        job_vector=_resolve_job_vector(
            db,
            job_description=job_description,
            role=data.role,
        ),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def update_job_post(db: Session, record: JobPost, data: JobPostUpdateRequest) -> JobPost:
    updates = data.model_dump(exclude_unset=True)
    updates.pop("job_vector", None)

    if "company" in updates and updates["company"] is not None:
        record.company = str(updates["company"]).strip()
    if "role" in updates and updates["role"] is not None:
        record.role = str(updates["role"]).strip()
    if "url" in updates and updates["url"] is not None:
        record.url = str(updates["url"]).strip()
    if "job_description" in updates and updates["job_description"] is not None:
        record.job_description = str(updates["job_description"]).strip()

    record.job_vector = _resolve_job_vector(
        db,
        job_description=record.job_description or "",
        role=record.role,
    )
    db.commit()
    db.refresh(record)
    return record


def recompute_all_job_post_vectors(db: Session) -> int:
    rows = list(db.scalars(select(JobPost)).all())
    for record in rows:
        record.job_vector = _resolve_job_vector(
            db,
            job_description=record.job_description or "",
            role=record.role,
        )
    db.commit()
    return len(rows)


def delete_job_post(db: Session, record: JobPost) -> None:
    application_count = db.scalar(
        select(func.count())
        .select_from(JobApplication)
        .where(JobApplication.post_id == record.id)
    ) or 0
    if application_count:
        raise ValueError(
            f"Cannot delete this post because {application_count} job application(s) "
            "are linked to it."
        )

    db.execute(delete(ResumeGeneration).where(ResumeGeneration.post_id == record.id))
    db.delete(record)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ValueError(
            "Cannot delete this post because it is still referenced by other records."
        ) from exc

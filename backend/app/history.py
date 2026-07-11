from pathlib import Path

from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.orm import Session

from app.db_models import JobIdentity, JobProfile, ResumeGeneration
from app.job_vector import build_job_vector
from app.models import ResumeContent
from app.pagination import (
    normalize_page_params,
    page_dict,
    paginate_select,
    parse_optional_date,
    resolve_sort,
)
from app.skill_service import list_skill_keywords


def build_resume_content_payload(content: ResumeContent) -> dict:
    """Persist summary, skills, and work experience from AI output."""
    return {
        "summary": content.summary,
        "skills": [skill.model_dump(mode="json") for skill in content.skills],
        "experience": [job.model_dump(mode="json") for job in content.experience],
    }


def resume_content_to_match_text(resume_content: dict | None) -> str:
    """Flatten resume_content into text used for resume_vector matching."""
    if not resume_content or not isinstance(resume_content, dict):
        return ""

    parts: list[str] = []
    summary = resume_content.get("summary")
    if summary:
        parts.append(str(summary))

    for skill in resume_content.get("skills") or []:
        if isinstance(skill, dict):
            label = skill.get("label")
            value = skill.get("value")
            if label:
                parts.append(str(label))
            if value:
                parts.append(str(value))
        elif skill:
            parts.append(str(skill))

    for job in resume_content.get("experience") or []:
        if not isinstance(job, dict):
            continue
        for key in ("company", "city", "role", "mode", "period"):
            value = job.get(key)
            if value:
                parts.append(str(value))
        for bullet in job.get("bullets") or []:
            if bullet:
                parts.append(str(bullet))

    return "\n".join(parts)


def build_resume_vector(
    db: Session,
    *,
    resume_content: dict,
    role: str | None = None,
) -> list[float]:
    keywords = list_skill_keywords(db, role=role)
    return build_job_vector(resume_content_to_match_text(resume_content), keywords)


def resume_generation_to_response(db: Session, row: ResumeGeneration) -> dict:
    profile_label = ""
    if row.profile_id is not None:
        profile = db.get(JobProfile, row.profile_id)
        if profile:
            identity = db.get(JobIdentity, profile.identity_id)
            if identity:
                parts = [identity.name or "", identity.country or ""]
                profile_label = " · ".join(part for part in parts if part) or f"Profile #{profile.id}"
            else:
                profile_label = profile.email or f"Profile #{profile.id}"

    return {
        "id": row.id,
        "job_details": row.job_details,
        "profile_id": row.profile_id,
        "profile_label": profile_label,
        "resume_content": row.resume_content or {},
        "resume_vector": list(row.resume_vector or []),
        "pdf_path": row.pdf_path,
        "created_at": row.created_at,
    }


def save_resume_generation(
    db: Session,
    *,
    job_details: str,
    profile_id: int | None,
    resume_content: dict,
    resume_vector: list[float],
    pdf_path: Path,
    repo_root: Path,
) -> ResumeGeneration:
    try:
        relative = pdf_path.relative_to(repo_root)
        path_str = relative.as_posix()
    except ValueError:
        path_str = pdf_path.as_posix()

    row = ResumeGeneration(
        job_details=job_details,
        profile_id=profile_id,
        resume_content=resume_content or {},
        resume_vector=list(resume_vector or []),
        pdf_path=path_str,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_resume_generations_page(
    db: Session,
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
    query = select(ResumeGeneration)

    search_text = (search or "").strip()
    if search_text:
        pattern = f"%{search_text}%"
        query = query.where(
            or_(
                ResumeGeneration.job_details.ilike(pattern),
                ResumeGeneration.pdf_path.ilike(pattern),
                cast(ResumeGeneration.resume_content, String).ilike(pattern),
                cast(ResumeGeneration.id, String).ilike(pattern),
            )
        )

    from_date = parse_optional_date(date_from)
    to_date = parse_optional_date(date_to)
    if from_date is not None:
        query = query.where(func.date(ResumeGeneration.created_at) >= from_date)
    if to_date is not None:
        query = query.where(func.date(ResumeGeneration.created_at) <= to_date)

    sort_map = {
        "id": ResumeGeneration.id,
        "job_details": ResumeGeneration.job_details,
        "pdf_path": ResumeGeneration.pdf_path,
        "created_at": ResumeGeneration.created_at,
        "profile_id": ResumeGeneration.profile_id,
    }
    column, descending = resolve_sort(sort_by, sort_dir, sort_map, "created_at")
    order_expr = column.desc() if descending else column.asc()
    query = query.order_by(order_expr, ResumeGeneration.id.desc())

    rows, total = paginate_select(db, query, params)
    return page_dict(list(rows), total, params)

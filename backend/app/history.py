from pathlib import Path

from sqlalchemy import String, cast, func, or_, select, update
from sqlalchemy.orm import Session

from app.application_service import get_application
from app.db_models import JobIdentity, JobPost, JobProfile, ResumeGeneration
from app.job_post_service import create_job_post, get_job_post
from app.job_vector import build_job_vector_weighted
from app.models import JobPostCreateRequest, ResumeContent
from app.pagination import (
    normalize_page_params,
    page_dict,
    paginate_select,
    parse_optional_date,
    resolve_sort,
)
from app.skill_service import list_skill_vector_entries


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
    entries = list_skill_vector_entries(db, role=role)
    return build_job_vector_weighted(resume_content_to_match_text(resume_content), entries)


def vector_dot_product(job_vector: list[float], resume_vector: list[float]) -> float:
    """Dot product: a1*b1 + a2*b2 + ... (missing dimensions treated as 0)."""
    left = list(job_vector or [])
    right = list(resume_vector or [])
    length = max(len(left), len(right))
    total = 0.0
    for index in range(length):
        a = float(left[index]) if index < len(left) else 0.0
        b = float(right[index]) if index < len(right) else 0.0
        total += a * b
    return total


def match_best_resume_for_profile(
    db: Session,
    *,
    profile_id: int,
    job_vector: list[float],
) -> tuple[ResumeGeneration, float, list[dict]]:
    """
    Score all resume generations for a profile against job_vector (dot product)
    and return the highest-scoring generation.
    """
    rows = db.scalars(
        select(ResumeGeneration)
        .where(ResumeGeneration.profile_id == profile_id)
        .order_by(ResumeGeneration.id.asc())
    ).all()

    if not rows:
        raise ValueError("No resume generations found for this profile")

    scored: list[dict] = []
    best_row: ResumeGeneration | None = None
    best_score = float("-inf")

    print("=" * 72)
    print(f"[resume-match] profile_id={profile_id}")
    print(f"[resume-match] job_vector={list(job_vector or [])}")
    print(f"[resume-match] proper resume list count={len(rows)}")

    for row in rows:
        resume_vector = list(row.resume_vector or [])
        score = vector_dot_product(job_vector, resume_vector)
        entry = {
            "generation_id": row.id,
            "score": score,
            "pdf_path": row.pdf_path,
            "resume_vector": resume_vector,
        }
        scored.append(entry)
        print(
            f"[resume-match] generation_id={row.id} "
            f"score={score} resume_vector={resume_vector} pdf={row.pdf_path}"
        )
        if (
            best_row is None
            or score > best_score
            or (score == best_score and row.id > best_row.id)
        ):
            best_score = score
            best_row = row

    print(
        f"[resume-match] BEST generation_id={best_row.id} "
        f"score={best_score} pdf={best_row.pdf_path}"
    )
    print("=" * 72)

    return best_row, best_score, scored


def find_or_create_job_post_by_description(
    db: Session,
    job_description: str,
    *,
    company: str = "Resume generation",
    role: str = "",
    url: str = "",
) -> JobPost:
    jd = (job_description or "").strip()
    existing = db.scalar(
        select(JobPost)
        .where(JobPost.job_description == jd)
        .order_by(JobPost.id.asc())
        .limit(1)
    )
    if existing:
        return existing

    return create_job_post(
        db,
        JobPostCreateRequest(
            company=company,
            role=role,
            url=url,
            job_description=jd,
        ),
    )


def resolve_resume_generation_post(
    db: Session,
    *,
    job_description: str,
    post_id: int | None = None,
    application_id: int | None = None,
) -> JobPost:
    if post_id is not None:
        post = get_job_post(db, post_id)
        if not post:
            raise ValueError("Job post not found")
        return post

    if application_id is not None:
        application = get_application(db, application_id)
        if not application:
            raise ValueError("Application not found")
        post = get_job_post(db, application.post_id)
        if not post:
            raise ValueError("Linked job post not found")
        return post

    return find_or_create_job_post_by_description(db, job_description)


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

    post = row.job_post or db.get(JobPost, row.post_id)

    return {
        "id": row.id,
        "post_id": row.post_id,
        "company": (post.company if post else "") or "",
        "role": (post.role if post else "") or "",
        "url": (post.url if post else "") or "",
        "job_description": (post.job_description if post else "") or "",
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
    post_id: int,
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
        post_id=post_id,
        profile_id=profile_id,
        resume_content=resume_content or {},
        resume_vector=list(resume_vector or []),
        pdf_path=path_str,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def bump_profile_resume_count(db: Session, profile_id: int) -> int:
    """Atomically increment the profile's monotonic resume counter and return it.

    The counter only ever increases — deleting resumes never decrements it — so
    the returned number is unique per profile and safe for resume filenames.
    A profile whose counter is at 5 returns 6, giving ``<name>_006<random>.pdf``.
    """
    new_count = db.execute(
        update(JobProfile)
        .where(JobProfile.id == profile_id)
        .values(resume_count=JobProfile.resume_count + 1)
        .returning(JobProfile.resume_count)
    ).scalar_one()
    db.commit()
    return new_count


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
    query = select(ResumeGeneration).join(JobPost, ResumeGeneration.post_id == JobPost.id)

    search_text = (search or "").strip()
    if search_text:
        pattern = f"%{search_text}%"
        query = query.where(
            or_(
                JobPost.company.ilike(pattern),
                JobPost.role.ilike(pattern),
                JobPost.url.ilike(pattern),
                JobPost.job_description.ilike(pattern),
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
        "post_id": ResumeGeneration.post_id,
        "company": JobPost.company,
        "role": JobPost.role,
        "url": JobPost.url,
        "job_description": JobPost.job_description,
        "pdf_path": ResumeGeneration.pdf_path,
        "created_at": ResumeGeneration.created_at,
        "profile_id": ResumeGeneration.profile_id,
    }
    column, descending = resolve_sort(sort_by, sort_dir, sort_map, "created_at")
    order_expr = column.desc() if descending else column.asc()
    query = query.order_by(order_expr, ResumeGeneration.id.desc())

    rows, total = paginate_select(db, query, params)
    return page_dict(list(rows), total, params)

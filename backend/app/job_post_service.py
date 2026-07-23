from sqlalchemy import String, cast, delete, func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db_models import (
    JobApplication,
    JobIdentity,
    JobPost,
    JobProfile,
    ResumeGeneration,
)
from app.job_vector import build_job_vector
from app.models import JobPostCreateRequest, JobPostUpdateRequest
from app.pagination import (
    normalize_page_params,
    page_dict,
    paginate_select,
    resolve_sort,
)
from app.skill_service import list_skill_vector_entries
from app.text_sanitizer import strip_html_tags


def job_post_to_response(
    record: JobPost,
    applications: list[dict] | None = None,
) -> dict:
    return {
        "id": record.id,
        "company": record.company or "",
        "role": record.role or "",
        "url": record.url or "",
        "job_description": record.job_description or "",
        "job_vector": list(record.job_vector or []),
        "applications": applications or [],
        "created_at": record.created_at,
    }


def job_posts_to_responses(db: Session, records: list[JobPost]) -> list[dict]:
    if not records:
        return []

    summaries_by_post_id: dict[int, list[dict]] = {
        record.id: [] for record in records
    }
    rows = db.execute(
        select(JobApplication, JobProfile, JobIdentity)
        .join(JobProfile, JobProfile.id == JobApplication.profile_id)
        .join(JobIdentity, JobIdentity.id == JobProfile.identity_id)
        .where(JobApplication.post_id.in_(summaries_by_post_id))
        .order_by(
            JobApplication.post_id.asc(),
            JobApplication.applied.desc(),
            JobIdentity.name.asc(),
        )
    ).all()

    seen_profiles: set[tuple[int, int]] = set()
    for application, profile, identity in rows:
        relation_key = (application.post_id, profile.id)
        if relation_key in seen_profiles:
            continue
        seen_profiles.add(relation_key)
        summaries_by_post_id[application.post_id].append(
            {
                "application_id": application.id,
                "profile_id": profile.id,
                "profile_name": identity.name or f"Profile #{profile.id}",
                "profile_country": identity.country or "",
                "applied": bool(application.applied),
                "applied_at": application.applied_at,
            }
        )

    return [
        job_post_to_response(record, summaries_by_post_id.get(record.id))
        for record in records
    ]


def _resolve_job_vector(
    db: Session,
    *,
    job_description: str,
    role: str | None = None,
) -> list[float]:
    role_text = (role or "").strip()
    entries = list_skill_vector_entries(db, role=role_text or None)
    return build_job_vector(
        job_description,
        [keyword for keyword, _weight in entries],
    )


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


def _duplicate_key(company: str, role: str, url: str) -> tuple[str, str, str]:
    return (
        (company or "").strip().lower(),
        (role or "").strip().lower(),
        (url or "").strip().lower(),
    )


def find_duplicate_job_post(
    db: Session,
    *,
    company: str,
    role: str,
    url: str,
) -> JobPost | None:
    company_key, role_key, url_key = _duplicate_key(company, role, url)
    matches = list(
        db.scalars(
            select(JobPost)
            .where(func.lower(func.trim(JobPost.company)) == company_key)
            .where(func.lower(func.trim(JobPost.role)) == role_key)
            .where(func.lower(func.trim(JobPost.url)) == url_key)
            .order_by(JobPost.id.asc())
        ).all()
    )
    if not matches:
        return None

    match_ids = [post.id for post in matches]
    applied_post_ids = set(
        db.scalars(
            select(JobApplication.post_id)
            .where(JobApplication.post_id.in_(match_ids))
            .where(JobApplication.applied.is_(True))
        ).all()
    )
    return next(
        (post for post in matches if post.id in applied_post_ids),
        matches[0],
    )


def create_job_post(db: Session, data: JobPostCreateRequest) -> JobPost:
    company = strip_html_tags(data.company)
    role = strip_html_tags(data.role)
    url = strip_html_tags(data.url)
    job_description = strip_html_tags(data.job_description)
    existing = find_duplicate_job_post(
        db,
        company=company,
        role=role,
        url=url,
    )
    if existing:
        return existing

    record = JobPost(
        company=company,
        role=role,
        url=url,
        job_description=job_description,
        job_vector=_resolve_job_vector(
            db,
            job_description=job_description,
            role=role,
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
        record.company = strip_html_tags(str(updates["company"]))
    if "role" in updates and updates["role"] is not None:
        record.role = strip_html_tags(str(updates["role"]))
    if "url" in updates and updates["url"] is not None:
        record.url = strip_html_tags(str(updates["url"]))
    if "job_description" in updates and updates["job_description"] is not None:
        record.job_description = strip_html_tags(str(updates["job_description"]))

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


def _is_blank(value: str | None) -> bool:
    return not (value or "").strip()


def deduplicate_job_posts(db: Session) -> dict:
    """Merge exact company/role/URL duplicates while preserving applied posts."""
    posts = list(db.scalars(select(JobPost).order_by(JobPost.id.asc())).all())
    applications = list(db.scalars(select(JobApplication)).all())
    generations = list(db.scalars(select(ResumeGeneration)).all())

    applications_by_post: dict[int, list[JobApplication]] = {}
    for application in applications:
        applications_by_post.setdefault(application.post_id, []).append(application)

    generations_by_post: dict[int, list[ResumeGeneration]] = {}
    for generation in generations:
        generations_by_post.setdefault(generation.post_id, []).append(generation)

    groups: dict[tuple[str, str, str], list[JobPost]] = {}
    for post in posts:
        groups.setdefault(
            _duplicate_key(post.company, post.role, post.url),
            [],
        ).append(post)

    duplicate_groups = 0
    deleted = 0
    preserved_applied = 0
    reassigned_applications = 0
    reassigned_resumes = 0

    try:
        for group in groups.values():
            if len(group) <= 1:
                continue
            duplicate_groups += 1

            applied_posts = [
                post
                for post in group
                if any(
                    application.applied
                    for application in applications_by_post.get(post.id, [])
                )
            ]
            preserved_applied += len(applied_posts)

            if applied_posts:
                keeper = min(applied_posts, key=lambda post: post.id)
                losers = [post for post in group if post not in applied_posts]
            else:
                def score(post: JobPost) -> tuple[int, int, int, int]:
                    return (
                        len(applications_by_post.get(post.id, [])),
                        len(generations_by_post.get(post.id, [])),
                        1 if (post.job_description or "").strip() else 0,
                        -post.id,
                    )

                keeper = max(group, key=score)
                losers = [post for post in group if post.id != keeper.id]

            for loser in losers:
                app_count = len(applications_by_post.get(loser.id, []))
                resume_count = len(generations_by_post.get(loser.id, []))
                if app_count:
                    db.execute(
                        update(JobApplication)
                        .where(JobApplication.post_id == loser.id)
                        .values(post_id=keeper.id)
                    )
                    reassigned_applications += app_count
                if resume_count:
                    db.execute(
                        update(ResumeGeneration)
                        .where(ResumeGeneration.post_id == loser.id)
                        .values(post_id=keeper.id)
                    )
                    reassigned_resumes += resume_count
                db.delete(loser)
                deleted += 1

        db.commit()
    except Exception:
        db.rollback()
        raise

    return {
        "duplicate_groups": duplicate_groups,
        "deleted": deleted,
        "preserved_applied": preserved_applied,
        "reassigned_applications": reassigned_applications,
        "reassigned_resumes": reassigned_resumes,
        "remaining": db.scalar(select(func.count()).select_from(JobPost)) or 0,
    }


def cleanup_job_posts(db: Session) -> dict:
    """Delete empty role/URL posts and keep one post per company name."""
    posts = list(db.scalars(select(JobPost).order_by(JobPost.id.asc())).all())
    app_counts = dict(
        db.execute(
            select(JobApplication.post_id, func.count()).group_by(JobApplication.post_id)
        ).all()
    )

    delete_ids: list[int] = []
    empty_role_or_url = 0
    duplicate_company = 0
    skipped_linked = 0
    remaining: list[JobPost] = []

    for post in posts:
        if _is_blank(post.role) or _is_blank(post.url):
            if app_counts.get(post.id, 0):
                skipped_linked += 1
                remaining.append(post)
                continue
            delete_ids.append(post.id)
            empty_role_or_url += 1
            continue
        remaining.append(post)

    by_company: dict[str, list[JobPost]] = {}
    for post in remaining:
        key = (post.company or "").strip().lower()
        if not key:
            key = f"__empty_company_{post.id}"
        by_company.setdefault(key, []).append(post)

    for group in by_company.values():
        if len(group) <= 1:
            continue

        def score(post: JobPost) -> tuple[int, int, int]:
            apps = int(app_counts.get(post.id, 0) or 0)
            has_desc = 1 if (post.job_description or "").strip() else 0
            return (apps, has_desc, int(post.id))

        ranked = sorted(group, key=score, reverse=True)
        for loser in ranked[1:]:
            if app_counts.get(loser.id, 0):
                skipped_linked += 1
                continue
            delete_ids.append(loser.id)
            duplicate_company += 1

    # Preserve order uniqueness while deleting
    seen: set[int] = set()
    deleted = 0
    failed = 0
    for post_id in delete_ids:
        if post_id in seen:
            continue
        seen.add(post_id)
        record = db.get(JobPost, post_id)
        if not record:
            continue
        try:
            delete_job_post(db, record)
            deleted += 1
        except ValueError:
            failed += 1

    remaining_count = db.scalar(select(func.count()).select_from(JobPost)) or 0
    return {
        "deleted": deleted,
        "failed": failed,
        "empty_role_or_url": empty_role_or_url,
        "duplicate_company": duplicate_company,
        "skipped_linked": skipped_linked,
        "remaining": remaining_count,
    }

from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session, defer, joinedload

from app.config import APPLICATION_SCREENSHOT_DIR, REPO_ROOT
from app.db_models import JobApplication, JobIdentity, JobPost, JobProfile, ResumeGeneration, User
from app.models import (
    CitizenImageInfo,
    JobApplicationCreateRequest,
    JobApplicationUpdateRequest,
)
from app.job_vector import build_job_vector_weighted
from app.job_post_service import get_job_post
from app.pagination import parse_optional_date
from app.profile_service import (
    _format_identity_label,
    get_profile,
    profile_access_filter,
    user_can_access_profile,
)
from app.skill_service import list_skill_vector_entries
from app.user_roles import UserRole

_APPLICATION_SCREENSHOT_STORAGE_PREFIX = "/storage/uploads/application screenshot/"


def list_application_post_ids(
    db: Session,
    *,
    profile_id: int | None = None,
    bidder_user_id: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    without_profile: bool = False,
) -> dict:
    """Return post IDs matching related-application or unassigned-post filters."""
    if (
        profile_id is None
        and bidder_user_id is None
        and not date_from
        and not date_to
        and not without_profile
    ):
        raise ValueError("Provide at least one application filter")

    from_date = parse_optional_date(date_from)
    to_date = parse_optional_date(date_to)
    if from_date is not None and to_date is not None and from_date > to_date:
        raise ValueError("Post created from date cannot be after created to date")

    if without_profile:
        if profile_id is not None or bidder_user_id is not None or from_date or to_date:
            raise ValueError(
                "No profile related cannot be combined with application filters"
            )
        post_ids = list(
            db.scalars(
                select(JobPost.id)
                .outerjoin(
                    JobApplication,
                    JobApplication.post_id == JobPost.id,
                )
                .where(JobApplication.id.is_(None))
                .order_by(JobPost.id.asc())
            ).all()
        )
        return {
            "post_ids": post_ids,
            "post_count": len(post_ids),
            "matched_application_count": 0,
        }

    if profile_id is not None and db.get(JobProfile, profile_id) is None:
        raise ValueError("Profile not found")
    if bidder_user_id is not None and db.get(User, bidder_user_id) is None:
        raise ValueError("Bidder not found")

    query = select(JobApplication.id, JobApplication.post_id).join(
        JobPost, JobPost.id == JobApplication.post_id
    )
    if profile_id is not None:
        query = query.where(JobApplication.profile_id == profile_id)
    if bidder_user_id is not None:
        query = query.where(JobApplication.bidder_user_id == bidder_user_id)
    if from_date is not None:
        query = query.where(func.date(JobPost.created_at) >= from_date)
    if to_date is not None:
        query = query.where(func.date(JobPost.created_at) <= to_date)

    rows = db.execute(query.order_by(JobApplication.post_id.asc())).all()
    post_ids = sorted({int(row.post_id) for row in rows})
    return {
        "post_ids": post_ids,
        "post_count": len(post_ids),
        "matched_application_count": len(rows),
    }


def _resolve_application_bidder(db: Session, record: JobApplication) -> User | None:
    """Return the bidder who actually applied to this job, if any.

    A bidder is only recorded once an application is actually applied, so this
    intentionally ignores ``created_by_user_id`` (who assigned/created the row).
    """
    user_id = record.bidder_user_id
    if user_id is None:
        return None
    return db.get(User, user_id)


def _load_job_post(db: Session, record: JobApplication) -> JobPost:
    post = record.job_post
    if post is None:
        post = db.get(JobPost, record.post_id)
    if post is None:
        raise ValueError("Job post not found")
    return post


def _application_load_options(*, include_job_description: bool):
    loader = joinedload(JobApplication.job_post)
    if not include_job_description:
        loader = loader.options(defer(JobPost.job_description))
    return loader


def _parse_application_screenshot(raw: dict | None) -> CitizenImageInfo | None:
    if not raw:
        return None
    image = CitizenImageInfo.model_validate(raw)
    if image.path:
        return image
    if image.filename:
        return image.model_copy(
            update={"path": f"{_APPLICATION_SCREENSHOT_STORAGE_PREFIX}{image.filename}"}
        )
    return image


def _resolve_application_screenshot_path(image: CitizenImageInfo) -> Path:
    if image.path:
        relative = image.path.lstrip("/\\")
        if relative.startswith("storage/"):
            relative = relative[len("storage/") :]
        candidate = (REPO_ROOT / "storage" / relative).resolve()
        if candidate.is_file():
            return candidate
    return (APPLICATION_SCREENSHOT_DIR / Path(image.filename).name).resolve()


def _build_application_screenshot_filename(application_id: int, original_name: str) -> str:
    ext = Path(original_name or "image.png").suffix or ".png"
    return f"app-{application_id}-{uuid4().hex[:10]}{ext}"


def application_to_response(
    db: Session,
    record: JobApplication,
    *,
    include_job_description: bool = True,
) -> dict:
    profile = get_profile(db, record.profile_id)
    profile_label = ""
    if profile:
        identity = db.get(JobIdentity, profile.identity_id)
        profile_label = _format_identity_label(identity)

    resume_pdf_filename = None
    if record.resume_generated_id is not None:
        generation = db.get(ResumeGeneration, record.resume_generated_id)
        if generation and generation.pdf_path:
            resume_pdf_filename = Path(generation.pdf_path).name

    bidder = _resolve_application_bidder(db, record)
    bidder_username = bidder.username if bidder else ""
    bidder_name = bidder.full_name if bidder else ""

    post = _load_job_post(db, record)
    screenshot = _parse_application_screenshot(record.applied_screenshot)

    return {
        "id": record.id,
        "profile_id": record.profile_id,
        "post_id": record.post_id,
        "profile_label": profile_label,
        "bidder_username": bidder_username,
        "bidder_name": bidder_name,
        "role": post.role or "",
        "company": post.company or "",
        "link": post.url or "",
        "job_description": post.job_description if include_job_description else "",
        "job_vector": list(post.job_vector or []),
        "resume_generated_id": record.resume_generated_id,
        "resume_pdf_filename": resume_pdf_filename,
        "resume_online_link": record.resume_online_link,
        "resume_generation_status": record.resume_generation_status,
        "applied": record.applied,
        "applied_at": record.applied_at,
        "success_link": record.success_link,
        "applied_screenshot": screenshot.model_dump(mode="json") if screenshot else None,
        "created_at": record.created_at,
    }


def _validate_resume_source_fields(
    resume_generated_id: int | None, resume_online_link: str | None
) -> None:
    has_generated = resume_generated_id is not None
    has_online = bool(resume_online_link and resume_online_link.strip())
    if has_generated and has_online:
        raise ValueError("Provide only one of resume_generated_id or resume_online_link")


def _validate_resume_source(data: JobApplicationCreateRequest) -> None:
    _validate_resume_source_fields(data.resume_generated_id, data.resume_online_link)


def get_application(db: Session, application_id: int) -> JobApplication | None:
    return db.get(JobApplication, application_id)


def next_application_number_for_profile(db: Session, profile_id: int) -> int:
    count = db.scalar(
        select(func.count())
        .select_from(JobApplication)
        .where(JobApplication.profile_id == profile_id)
    )
    return (count or 0) + 1


def _ensure_application_access(db: Session, record: JobApplication, user: User) -> JobProfile:
    profile = get_profile(db, record.profile_id)
    if not profile:
        raise ValueError("Profile not found")
    if not user_can_access_profile(user, profile):
        raise PermissionError("Access denied")
    return profile


def _resolve_applied_fields(applied: bool, applied_at: datetime | None) -> datetime | None:
    if applied:
        if applied_at is None:
            raise ValueError("applied_at is required when applied is true")
        return applied_at
    return None


def _resolve_applied_state(
    *,
    applied: bool,
    applied_at: datetime | None,
    success_link: str | None,
    has_screenshot: bool,
) -> tuple[bool, datetime | None]:
    has_link = bool(success_link and success_link.strip())
    if has_link or has_screenshot:
        return True, applied_at or datetime.now(timezone.utc)
    if applied:
        return True, _resolve_applied_fields(True, applied_at)
    return False, None


def _resolve_job_vector(
    db: Session,
    *,
    job_description: str,
    role: str | None,
    provided: list[float] | None,
) -> list[float]:
    entries = list_skill_vector_entries(db, role=role)
    if provided is not None and len(provided) == len(entries):
        return [float(value) for value in provided]
    return build_job_vector_weighted(job_description, entries)


def _sync_job_post(
    db: Session,
    post: JobPost | None,
    *,
    role: str,
    company: str,
    link: str,
    job_description: str,
    skill_role: str,
    provided_vector: list[float] | None,
) -> JobPost:
    job_vector = _resolve_job_vector(
        db,
        job_description=job_description,
        role=skill_role,
        provided=provided_vector,
    )
    if post is None:
        post = JobPost(
            company=company.strip(),
            role=role.strip(),
            url=link.strip(),
            job_description=job_description.strip(),
            job_vector=job_vector,
        )
        db.add(post)
        db.flush()
        return post

    post.company = company.strip()
    post.role = role.strip()
    post.url = link.strip()
    post.job_description = job_description.strip()
    post.job_vector = job_vector
    return post


def create_application(
    db: Session, data: JobApplicationCreateRequest, user: User
) -> JobApplication:
    _validate_resume_source(data)

    profile = get_profile(db, data.profile_id)
    if not profile:
        raise ValueError("Profile not found")
    if not profile.is_active:
        raise ValueError("Profile is not active")
    if not user_can_access_profile(user, profile):
        raise PermissionError("Access denied")

    if data.resume_generated_id is not None:
        generation = db.get(ResumeGeneration, data.resume_generated_id)
        if not generation:
            raise ValueError("Resume generation not found")

    job_description = data.job_description.strip()
    skill_role = (data.role or "").strip() or (profile.roles or "").strip()
    post = _sync_job_post(
        db,
        None,
        role=data.role,
        company=data.company,
        link=data.link,
        job_description=job_description,
        skill_role=skill_role,
        provided_vector=data.job_vector,
    )

    success_link = data.success_link.strip() if data.success_link else None
    applied, applied_at = _resolve_applied_state(
        applied=data.applied,
        applied_at=data.applied_at,
        success_link=success_link,
        has_screenshot=False,
    )

    record = JobApplication(
        profile_id=data.profile_id,
        post_id=post.id,
        resume_generated_id=data.resume_generated_id,
        resume_online_link=(
            data.resume_online_link.strip() if data.resume_online_link else None
        ),
        success_link=success_link,
        applied=applied,
        applied_at=applied_at,
        bidder_user_id=user.id if applied else None,
        created_by_user_id=user.id,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def list_applications_for_profile(
    db: Session, profile_id: int, user: User, *, include_job_description: bool = False
) -> list[JobApplication]:
    profile = get_profile(db, profile_id)
    if not profile:
        raise ValueError("Profile not found")
    if not profile.is_active:
        raise ValueError("Profile is not active")
    if not user_can_access_profile(user, profile):
        raise PermissionError("Access denied")

    query = (
        select(JobApplication)
        .where(JobApplication.profile_id == profile_id)
        .options(_application_load_options(include_job_description=include_job_description))
    )
    return list(db.scalars(query.order_by(JobApplication.id.desc())).all())


def list_applications_admin(
    db: Session,
    user: User,
    profile_id: int | None = None,
    *,
    include_job_description: bool = False,
) -> list[JobApplication]:
    if user.role != UserRole.admin:
        raise PermissionError("Access denied")

    query = select(JobApplication).options(
        _application_load_options(include_job_description=include_job_description)
    )
    if profile_id is not None:
        query = query.where(JobApplication.profile_id == profile_id)
    return list(db.scalars(query.order_by(JobApplication.id.desc())).all())


def list_applications_for_user(
    db: Session, user: User, *, include_job_description: bool = False
) -> list[JobApplication]:
    query = (
        select(JobApplication)
        .join(JobProfile, JobApplication.profile_id == JobProfile.id)
        .where(profile_access_filter(user.id))
        .options(_application_load_options(include_job_description=include_job_description))
    )
    return list(db.scalars(query.order_by(JobApplication.id.desc())).all())


def get_application_for_user(db: Session, application_id: int, user: User) -> JobApplication:
    record = get_application(db, application_id)
    if not record:
        raise ValueError("Application not found")
    _ensure_application_access(db, record, user)
    return record


def update_application(
    db: Session, application_id: int, data: JobApplicationUpdateRequest, user: User
) -> JobApplication:
    record = get_application(db, application_id)
    if not record:
        raise ValueError("Application not found")

    _ensure_application_access(db, record, user)
    _validate_resume_source_fields(data.resume_generated_id, data.resume_online_link)

    if data.resume_generated_id is not None:
        generation = db.get(ResumeGeneration, data.resume_generated_id)
        if not generation:
            raise ValueError("Resume generation not found")

    post = _load_job_post(db, record)
    skill_role = (data.role or "").strip()
    _sync_job_post(
        db,
        post,
        role=data.role,
        company=data.company,
        link=data.link,
        job_description=data.job_description.strip(),
        skill_role=skill_role,
        provided_vector=data.job_vector,
    )

    record.resume_generated_id = data.resume_generated_id
    record.resume_online_link = (
        data.resume_online_link.strip() if data.resume_online_link else None
    )
    record.success_link = data.success_link.strip() if data.success_link else None

    has_screenshot = _parse_application_screenshot(record.applied_screenshot) is not None
    applied = data.applied if data.applied is not None else record.applied
    applied_at = data.applied_at if data.applied_at is not None else record.applied_at
    applied, applied_at = _resolve_applied_state(
        applied=applied,
        applied_at=applied_at,
        success_link=record.success_link,
        has_screenshot=has_screenshot,
    )
    record.applied = applied
    record.applied_at = applied_at

    # The bidder is only attributed once an application is actually applied.
    # Editing a non-applied application must never stamp the editor as bidder.
    if applied:
        if record.bidder_user_id is None:
            record.bidder_user_id = user.id
    else:
        record.bidder_user_id = None

    db.commit()
    db.refresh(record)
    return record


def delete_application(db: Session, application_id: int, user: User) -> None:
    record = get_application(db, application_id)
    if not record:
        raise ValueError("Application not found")
    _ensure_application_access(db, record, user)
    db.delete(record)
    db.commit()


def set_application_resume_generation_status(
    db: Session,
    application_id: int,
    status: str | None,
    user: User,
) -> JobApplication:
    record = get_application(db, application_id)
    if not record:
        raise ValueError("Application not found")
    _ensure_application_access(db, record, user)
    record.resume_generation_status = status
    db.commit()
    db.refresh(record)
    return record


def attach_generated_resume_to_application(
    db: Session,
    application_id: int,
    generation_id: int,
    user: User,
    *,
    job_description: str | None = None,
) -> JobApplication:
    """Link a finished resume generation to an application (auto-save after PDF)."""
    record = get_application(db, application_id)
    if not record:
        raise ValueError("Application not found")
    _ensure_application_access(db, record, user)

    generation = db.get(ResumeGeneration, generation_id)
    if not generation:
        raise ValueError("Resume generation not found")

    record.resume_generated_id = generation_id
    record.resume_online_link = None
    record.resume_generation_status = "generated"
    if job_description is not None:
        post = _load_job_post(db, record)
        post.job_description = job_description.strip()

    db.commit()
    db.refresh(record)
    return record


def set_application_screenshot(
    db: Session,
    record: JobApplication,
    *,
    original_name: str,
    content: bytes,
    user: User,
) -> JobApplication:
    if not content:
        raise ValueError("Empty file")
    if len(content) > 10 * 1024 * 1024:
        raise ValueError("Maximum file size is 10MB")

    APPLICATION_SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
    stored_name = _build_application_screenshot_filename(record.id, original_name)
    target = APPLICATION_SCREENSHOT_DIR / stored_name
    target.write_bytes(content)

    record.applied_screenshot = CitizenImageInfo(
        filename=stored_name,
        original_name=original_name or stored_name,
        uploaded_at=datetime.now(timezone.utc),
        path=f"{_APPLICATION_SCREENSHOT_STORAGE_PREFIX}{stored_name}",
    ).model_dump(mode="json")

    applied, applied_at = _resolve_applied_state(
        applied=record.applied,
        applied_at=record.applied_at,
        success_link=record.success_link,
        has_screenshot=True,
    )
    record.applied = applied
    record.applied_at = applied_at

    # Uploading proof of application makes the acting user the bidder.
    if applied:
        if record.bidder_user_id is None:
            record.bidder_user_id = user.id
    else:
        record.bidder_user_id = None

    db.commit()
    db.refresh(record)
    return record


def remove_application_screenshot(db: Session, record: JobApplication) -> JobApplication:
    image = _parse_application_screenshot(record.applied_screenshot)
    if image:
        path = _resolve_application_screenshot_path(image)
        if path.is_file():
            path.unlink(missing_ok=True)

    record.applied_screenshot = None
    applied, applied_at = _resolve_applied_state(
        applied=False,
        applied_at=None,
        success_link=record.success_link,
        has_screenshot=False,
    )
    record.applied = applied
    record.applied_at = applied_at

    # If there is no remaining proof of application, the bidder attribution
    # is cleared as well (applied ⇒ bidder invariant).
    if not applied:
        record.bidder_user_id = None

    db.commit()
    db.refresh(record)
    return record


def resolve_application_screenshot_file(record: JobApplication) -> Path:
    image = _parse_application_screenshot(record.applied_screenshot)
    if not image:
        raise ValueError("Screenshot not found")
    path = _resolve_application_screenshot_path(image)
    if not path.is_file():
        raise ValueError("Screenshot file not found")
    return path


def _latest_resume_generation_for_post(
    db: Session, *, profile_id: int, post_id: int
) -> ResumeGeneration | None:
    return db.scalar(
        select(ResumeGeneration)
        .where(
            ResumeGeneration.profile_id == profile_id,
            ResumeGeneration.post_id == post_id,
        )
        .order_by(ResumeGeneration.id.desc())
        .limit(1)
    )


def _normalize_company_name(value: str | None) -> str:
    return (value or "").strip().casefold()


def _existing_company_names_for_profile(db: Session, profile_id: int) -> set[str]:
    rows = db.scalars(
        select(JobPost.company)
        .join(JobApplication, JobApplication.post_id == JobPost.id)
        .where(JobApplication.profile_id == profile_id)
    ).all()
    return {_normalize_company_name(company) for company in rows if _normalize_company_name(company)}


def assign_posts_to_profile(
    db: Session,
    *,
    profile_id: int,
    post_ids: list[int],
    user: User,
) -> dict:
    profile = get_profile(db, profile_id)
    if not profile:
        raise ValueError("Profile not found")
    if not profile.is_active:
        raise ValueError("Profile is not active")
    if not user_can_access_profile(user, profile):
        raise PermissionError("Access denied")

    created: list[dict] = []
    skipped: list[dict] = []
    seen_post_ids: set[int] = set()
    seen_company_names = _existing_company_names_for_profile(db, profile_id)

    for post_id in post_ids:
        if post_id in seen_post_ids:
            skipped.append(
                {
                    "post_id": post_id,
                    "application_id": None,
                    "company": "",
                    "role": "",
                    "reason": "Duplicate post in request",
                }
            )
            continue
        seen_post_ids.add(post_id)

        post = get_job_post(db, post_id)
        if not post:
            skipped.append(
                {
                    "post_id": post_id,
                    "application_id": None,
                    "company": "",
                    "role": "",
                    "reason": "Post not found",
                }
            )
            continue

        existing = db.scalar(
            select(JobApplication).where(
                JobApplication.profile_id == profile_id,
                JobApplication.post_id == post.id,
            )
        )
        if existing:
            skipped.append(
                {
                    "post_id": post.id,
                    "application_id": existing.id,
                    "company": post.company or "",
                    "role": post.role or "",
                    "reason": "Application already exists",
                }
            )
            continue

        company_key = _normalize_company_name(post.company)
        if company_key and company_key in seen_company_names:
            skipped.append(
                {
                    "post_id": post.id,
                    "application_id": None,
                    "company": post.company or "",
                    "role": post.role or "",
                    "reason": "Application with this company already exists",
                }
            )
            continue

        generation = _latest_resume_generation_for_post(
            db, profile_id=profile_id, post_id=post.id
        )

        record = JobApplication(
            profile_id=profile_id,
            post_id=post.id,
            resume_generated_id=generation.id if generation else None,
            applied=False,
            applied_at=None,
            # Assigning a post does not make anyone the bidder; that is only
            # attributed once the application is actually applied.
            bidder_user_id=None,
            created_by_user_id=user.id,
        )
        db.add(record)
        db.flush()
        if company_key:
            seen_company_names.add(company_key)
        created.append(
            {
                "post_id": post.id,
                "application_id": record.id,
                "company": post.company or "",
                "role": post.role or "",
                "reason": "",
            }
        )

    db.commit()
    return {"created": created, "skipped": skipped}


def batch_select_resumes_for_posts(
    db: Session,
    *,
    profile_id: int,
    post_ids: list[int],
    user: User,
) -> dict:
    """Match and attach resumes to applications for the given profile/posts."""
    from urllib.parse import quote

    from app.history import match_best_resume_for_profile

    profile = get_profile(db, profile_id)
    if not profile:
        raise ValueError("Profile not found")
    if not profile.is_active:
        raise ValueError("Profile is not active")
    if not user_can_access_profile(user, profile):
        raise PermissionError("Access denied")

    default_resume_name = (profile.default_resume_original_name or "").strip()
    default_resume_ref = (
        f"profile-default-resume:{profile.id}:{quote(default_resume_name, safe='')}"
        if default_resume_name
        else None
    )

    updated: list[dict] = []
    skipped: list[dict] = []
    seen_post_ids: set[int] = set()

    for post_id in post_ids:
        if post_id in seen_post_ids:
            skipped.append(
                {
                    "post_id": post_id,
                    "application_id": None,
                    "company": "",
                    "role": "",
                    "reason": "Duplicate post in request",
                    "generation_id": None,
                    "resume_online_link": None,
                }
            )
            continue
        seen_post_ids.add(post_id)

        post = get_job_post(db, post_id)
        if not post:
            skipped.append(
                {
                    "post_id": post_id,
                    "application_id": None,
                    "company": "",
                    "role": "",
                    "reason": "Post not found",
                    "generation_id": None,
                    "resume_online_link": None,
                }
            )
            continue

        application = db.scalar(
            select(JobApplication).where(
                JobApplication.profile_id == profile_id,
                JobApplication.post_id == post.id,
            )
        )
        if not application:
            skipped.append(
                {
                    "post_id": post.id,
                    "application_id": None,
                    "company": post.company or "",
                    "role": post.role or "",
                    "reason": "Assign the post first to create an application",
                    "generation_id": None,
                    "resume_online_link": None,
                }
            )
            continue

        job_vector = list(post.job_vector or [])
        if not job_vector and (post.job_description or "").strip():
            entries = list_skill_vector_entries(db, role=(post.role or "").strip() or None)
            job_vector = build_job_vector_weighted(post.job_description or "", entries)
            post.job_vector = job_vector

        generation_id: int | None = None
        resume_online_link: str | None = None
        attach_error = ""

        try:
            best_row, _best_score, _scores = match_best_resume_for_profile(
                db,
                profile_id=profile_id,
                job_vector=job_vector,
            )
            attach_generated_resume_to_application(
                db,
                application.id,
                best_row.id,
                user,
            )
            generation_id = best_row.id
        except ValueError as exc:
            attach_error = str(exc)
            if default_resume_ref:
                application.resume_generated_id = None
                application.resume_online_link = default_resume_ref
                application.resume_generation_status = None
                db.commit()
                resume_online_link = default_resume_ref
            else:
                skipped.append(
                    {
                        "post_id": post.id,
                        "application_id": application.id,
                        "company": post.company or "",
                        "role": post.role or "",
                        "reason": attach_error or "No matching resume available",
                        "generation_id": None,
                        "resume_online_link": None,
                    }
                )
                continue

        updated.append(
            {
                "post_id": post.id,
                "application_id": application.id,
                "company": post.company or "",
                "role": post.role or "",
                "reason": "",
                "generation_id": generation_id,
                "resume_online_link": resume_online_link,
            }
        )

    return {"updated": updated, "skipped": skipped}

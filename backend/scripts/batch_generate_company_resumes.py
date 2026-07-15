"""
Batch-generate resume_generations for one job profile against every job post JD.

Usage (from backend/):
  python scripts/batch_generate_company_resumes.py
  python scripts/batch_generate_company_resumes.py --profile-id 3
"""

from __future__ import annotations

import argparse
import sys
from datetime import date
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai_generator import generate_resume_content
from app.config import GENERATED_DIR, REPO_ROOT, settings
from app.database import SessionLocal, init_db
from app.db_models import JobIdentity, JobPost, JobProfile
from app.history import (
    build_resume_content_payload,
    build_resume_vector,
    bump_profile_resume_count,
    save_resume_generation,
)
from app.models import Profile, ProfileEducation, ProfileJob, ResumeDetail
from app.pdf_renderer import build_resume_path, render_resume_pdf
from app.profile_service import _parse_resume_detail


def _format_month_year(value: date | None) -> str:
    if not value:
        return ""
    return value.strftime("%b, %Y")


def _format_year(value: date | None) -> str:
    if not value:
        return ""
    return value.strftime("%Y")


def _experience_period(start: date | None, end: date | None) -> str:
    left = _format_month_year(start)
    right = _format_month_year(end)
    if left and right:
        return f"{left} - {right}"
    return left or right


def _education_period(start: date | None, end: date | None) -> str:
    left = _format_year(start)
    right = _format_year(end)
    if left and right:
        return f"{left}-{right}"
    return left or right


def _normalize_mode(method: str | None) -> str:
    text = (method or "Remote").strip().title()
    if text not in {"Remote", "Onsite", "Hybrid"}:
        return "Remote"
    return text


def build_profile_from_job_profile(
    job_profile: JobProfile,
    identity: JobIdentity | None,
) -> Profile:
    detail: ResumeDetail = _parse_resume_detail(job_profile.resume_detail)
    experience: list[ProfileJob] = []
    for item in detail.work_experience:
        if not any(
            [
                item.company_name,
                item.role,
                item.location,
                item.start_date,
                item.end_date,
            ]
        ):
            continue
        experience.append(
            ProfileJob(
                company=item.company_name or "",
                city=item.location or "",
                role=item.role or "",
                mode=_normalize_mode(item.method),
                period=_experience_period(item.start_date, item.end_date),
            )
        )

    education_row = next(
        (
            item
            for item in detail.education
            if any([item.university_name, item.degree, item.start_date, item.end_date])
        ),
        detail.education[0] if detail.education else None,
    )
    education = ProfileEducation(
        school=(education_row.university_name if education_row else "") or "",
        degree=(education_row.degree if education_row else "") or "",
        period=_education_period(
            education_row.start_date if education_row else None,
            education_row.end_date if education_row else None,
        ),
    )

    certifications = [cert for cert in detail.certifications if cert]
    projects: list[str] = []
    for item in detail.projects:
        if item.project_name and item.stack:
            projects.append(f"{item.project_name} ({item.stack})")
        elif item.project_name or item.stack:
            projects.append(item.project_name or item.stack)

    location = ""
    if identity:
        location = ", ".join(
            part for part in [identity.city_state, identity.country] if part
        )

    return Profile(
        name=(identity.name if identity else "") or "",
        title=(job_profile.roles or "").strip(),
        email=(job_profile.email or "").strip(),
        phone=(job_profile.phone or "").strip(),
        location=location,
        linkedin=(identity.linkedin if identity else "") or "",
        portfolio=(identity.github if identity else "") or "",
        experience=experience,
        education=education,
        certifications=certifications,
        projects=projects,
    )


def find_jeremiah_profile(db: Session) -> JobProfile:
    profiles = db.scalars(select(JobProfile).order_by(JobProfile.id.asc())).all()
    for profile in profiles:
        identity = db.get(JobIdentity, profile.identity_id)
        name = (identity.name if identity else "").lower()
        if "jeremiah" in name and "larocco" in name:
            return profile
    raise ValueError("Jeremiah Sol Larocco profile not found")


def generate_one(
    db: Session,
    *,
    profile: Profile,
    profile_id: int,
    job_post: JobPost,
    provider: str,
) -> dict:
    job_description = (job_post.job_description or "").strip()
    if len(job_description) < 50:
        raise ValueError(
            f"Post #{job_post.id} ({job_post.company}) JD is too short ({len(job_description)} chars)"
        )

    label = f"{job_post.company} · {job_post.role}".strip(" ·")
    print(f"\n=== Generating for post #{job_post.id} {label!r} ===")
    print(f"JD length: {len(job_description)} | provider: {provider}")

    content = generate_resume_content(profile, job_description, provider=provider)
    app_number = bump_profile_resume_count(db, profile_id)
    output_path = build_resume_path(profile.name, app_number, GENERATED_DIR)
    render_resume_pdf(profile, content, output_path)

    resume_content = build_resume_content_payload(content)
    role = (db.get(JobProfile, profile_id).roles or "").strip() or None
    resume_vector = build_resume_vector(db, resume_content=resume_content, role=role)

    record = save_resume_generation(
        db,
        post_id=job_post.id,
        profile_id=profile_id,
        resume_content=resume_content,
        resume_vector=resume_vector,
        pdf_path=output_path,
        repo_root=REPO_ROOT,
    )

    print(
        f"OK generation_id={record.id} pdf={output_path.name} "
        f"vector_len={len(resume_vector)} summary_chars={len(content.summary)}"
    )
    return {
        "post_id": job_post.id,
        "company": job_post.company,
        "role": job_post.role,
        "generation_id": record.id,
        "filename": output_path.name,
        "vector_len": len(resume_vector),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--profile-id", type=int, default=None)
    parser.add_argument(
        "--provider",
        default=None,
        help="cursor|openai (default: settings AI provider)",
    )
    args = parser.parse_args()

    init_db()
    provider = args.provider or settings.resolved_provider()
    db = SessionLocal()
    try:
        if args.profile_id is not None:
            job_profile = db.get(JobProfile, args.profile_id)
            if not job_profile:
                raise ValueError(f"Profile #{args.profile_id} not found")
        else:
            job_profile = find_jeremiah_profile(db)

        identity = db.get(JobIdentity, job_profile.identity_id)
        profile = build_profile_from_job_profile(job_profile, identity)
        job_posts = db.scalars(select(JobPost).order_by(JobPost.id.asc())).all()

        print(
            f"Profile #{job_profile.id} {profile.name!r} ({profile.title!r}) "
            f"-> {len(job_posts)} job posts"
        )
        if not job_posts:
            print("No job posts found. Add posts first.")
            return 1

        results = []
        errors = []
        for job_post in job_posts:
            try:
                results.append(
                    generate_one(
                        db,
                        profile=profile,
                        profile_id=job_profile.id,
                        job_post=job_post,
                        provider=provider,
                    )
                )
            except Exception as exc:
                message = f"FAILED post #{job_post.id} {job_post.company!r}: {exc}"
                print(message)
                errors.append(message)

        print("\n========== SUMMARY ==========")
        for row in results:
            print(
                f"  company={row['company']!r} role={row['role']!r} "
                f"generation_id={row['generation_id']} "
                f"file={row['filename']} vector_len={row['vector_len']}"
            )
        if errors:
            print(f"\n{len(errors)} failure(s):")
            for err in errors:
                print(f"  - {err}")
            return 1

        print(f"\nDone. Generated {len(results)} resume(s) for profile #{job_profile.id}.")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())

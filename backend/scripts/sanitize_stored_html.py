"""Remove HTML tags from job posts and stored generated-resume content."""

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import select

from app.database import SessionLocal
from app.db_models import JobPost, JobProfile, ResumeGeneration
from app.history import build_resume_vector
from app.job_post_service import recompute_all_job_post_vectors
from app.text_sanitizer import sanitize_nested_text, strip_html_tags


def sanitize_stored_html() -> dict[str, int]:
    db = SessionLocal()
    changed_posts = 0
    changed_resumes = 0

    try:
        posts = list(db.scalars(select(JobPost)).all())
        for post in posts:
            clean_values = {
                "company": strip_html_tags(post.company),
                "role": strip_html_tags(post.role),
                "url": strip_html_tags(post.url),
                "job_description": strip_html_tags(post.job_description),
            }
            if any(getattr(post, field) != value for field, value in clean_values.items()):
                for field, value in clean_values.items():
                    setattr(post, field, value)
                changed_posts += 1

        generations = list(db.scalars(select(ResumeGeneration)).all())
        for generation in generations:
            original = generation.resume_content or {}
            clean_content = sanitize_nested_text(original)
            if clean_content == original:
                continue

            profile = (
                db.get(JobProfile, generation.profile_id)
                if generation.profile_id is not None
                else None
            )
            role = (profile.roles or "").strip() if profile else None
            generation.resume_content = clean_content
            generation.resume_vector = build_resume_vector(
                db,
                resume_content=clean_content,
                role=role,
            )
            changed_resumes += 1

        db.commit()
        recompute_all_job_post_vectors(db)
        return {
            "job_posts_scanned": len(posts),
            "job_posts_changed": changed_posts,
            "resume_generations_scanned": len(generations),
            "resume_generations_changed": changed_resumes,
        }
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    result = sanitize_stored_html()
    for key, value in result.items():
        print(f"{key}: {value}")

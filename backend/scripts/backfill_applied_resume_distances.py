"""Calculate resume distances for applied applications with generated resumes."""

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import select

from app.database import SessionLocal
from app.db_models import JobApplication, JobProfile, JobPost, ResumeGeneration
from app.history import weighted_vector_distance
from app.skill_service import list_skill_vector_entries


def backfill_applied_resume_distances() -> dict[str, int]:
    db = SessionLocal()
    updated = 0
    skipped = 0
    try:
        applications = list(
            db.scalars(
                select(JobApplication).where(
                    JobApplication.applied.is_(True),
                    JobApplication.resume_generated_id.is_not(None),
                )
            ).all()
        )
        for application in applications:
            profile = db.get(JobProfile, application.profile_id)
            post = db.get(JobPost, application.post_id)
            generation = db.get(ResumeGeneration, application.resume_generated_id)
            if not profile or not post or not generation:
                skipped += 1
                continue

            entries = list_skill_vector_entries(
                db,
                role=(profile.roles or "").strip() or None,
            )
            application.resume_distance = weighted_vector_distance(
                list(post.job_vector or []),
                list(generation.resume_vector or []),
                [weight for _keyword, weight in entries],
            )
            db.add(application)
            updated += 1

        db.commit()
        return {"updated": updated, "skipped": skipped}
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    result = backfill_applied_resume_distances()
    print(
        f"Updated {result['updated']} applied application distance(s); "
        f"skipped {result['skipped']}."
    )

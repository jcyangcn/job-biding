"""Recompute stored job and resume vectors as unweighted mention-score vectors."""

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import select

from app.database import SessionLocal
from app.db_models import JobProfile, ResumeGeneration
from app.history import build_resume_vector
from app.job_post_service import recompute_all_job_post_vectors


def recompute_match_vectors() -> dict[str, int]:
    db = SessionLocal()
    try:
        job_post_count = recompute_all_job_post_vectors(db)
        resumes = list(db.scalars(select(ResumeGeneration)).all())
        for resume in resumes:
            profile = (
                db.get(JobProfile, resume.profile_id)
                if resume.profile_id is not None
                else None
            )
            role = (profile.roles or "").strip() if profile else None
            resume.resume_vector = build_resume_vector(
                db,
                resume_content=resume.resume_content or {},
                role=role,
            )
            db.add(resume)
        db.commit()
        return {"job_posts": job_post_count, "resumes": len(resumes)}
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    result = recompute_match_vectors()
    print(
        f"Recomputed {result['job_posts']} job vector(s) and "
        f"{result['resumes']} resume vector(s)."
    )

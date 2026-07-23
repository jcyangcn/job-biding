"""Rebuild missing Ryan Cho PDFs from stored resume content without using AI."""

import os
import sys
from pathlib import Path
from uuid import uuid4

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import select

from app.database import SessionLocal
from app.db_models import JobPost, ResumeGeneration
from app.models import ResumeContent
from app.pdf_renderer import render_resume_pdf
from app.profile_service import build_profile_from_job_profile
from app.resume_management_service import resolve_resume_generation_pdf
from app.text_sanitizer import sanitize_resume_content


def rebuild_missing_ryan_pdfs(profile_id: int = 2) -> dict[str, int]:
    db = SessionLocal()
    rebuilt = 0
    skipped_existing = 0

    try:
        profile = build_profile_from_job_profile(db, profile_id)
        if not profile:
            raise RuntimeError(f"Profile {profile_id} not found")

        rows = list(
            db.scalars(
                select(ResumeGeneration)
                .where(ResumeGeneration.profile_id == profile_id)
                .order_by(
                    ResumeGeneration.created_at.asc(),
                    ResumeGeneration.id.asc(),
                )
            ).all()
        )

        for row in rows:
            target = resolve_resume_generation_pdf(row)
            if target.is_file():
                skipped_existing += 1
                continue

            stored = dict(row.resume_content or {})
            post = db.get(JobPost, row.post_id)
            stored.setdefault(
                "title",
                ((post.role if post else "") or profile.title or "").strip(),
            )
            stored.setdefault("projects", [])
            content = sanitize_resume_content(ResumeContent.model_validate(stored))

            target.parent.mkdir(parents=True, exist_ok=True)
            temporary = target.with_name(
                f".{target.stem}.{uuid4().hex}.tmp.pdf"
            )
            try:
                render_resume_pdf(profile, content, temporary)
                os.replace(temporary, target)
                rebuilt += 1
            finally:
                temporary.unlink(missing_ok=True)

        return {
            "resume_records": len(rows),
            "rebuilt": rebuilt,
            "skipped_existing": skipped_existing,
        }
    finally:
        db.close()


if __name__ == "__main__":
    result = rebuild_missing_ryan_pdfs()
    for key, value in result.items():
        print(f"{key}: {value}")

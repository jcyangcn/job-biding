"""Renumber Ryan Cho resume database paths without touching PDF files."""

import re
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import select

from app.database import SessionLocal
from app.db_models import JobIdentity, JobProfile, ResumeGeneration

TARGET_DIRECTORY = "storage/downloads/generated_resumes"
SUFFIX_PATTERN = re.compile(r"([A-Za-z0-9]{4})\.pdf$", re.IGNORECASE)


def rename_ryan_resume_db_paths() -> dict[str, int]:
    db = SessionLocal()
    try:
        profile = db.scalar(
            select(JobProfile)
            .join(JobIdentity, JobIdentity.id == JobProfile.identity_id)
            .where(JobIdentity.name == "Ryan Cho")
        )
        if not profile:
            raise RuntimeError("Ryan Cho profile not found")

        rows = list(
            db.scalars(
                select(ResumeGeneration)
                .where(ResumeGeneration.profile_id == profile.id)
                .order_by(
                    ResumeGeneration.created_at.asc(),
                    ResumeGeneration.id.asc(),
                )
            ).all()
        )
        if not rows:
            raise RuntimeError("Ryan Cho has no resume generations")

        planned: list[tuple[ResumeGeneration, str]] = []
        target_paths: set[str] = set()
        for sequence, row in enumerate(rows, start=1):
            filename = Path(row.pdf_path or "").name
            match = SUFFIX_PATTERN.search(filename)
            if not match:
                raise RuntimeError(
                    f"Generation {row.id} has no four-character filename suffix"
                )
            suffix = match.group(1)
            target = f"{TARGET_DIRECTORY}/Ryan_Cho_{sequence:03d}{suffix}.pdf"
            if target.lower() in target_paths:
                raise RuntimeError(f"Duplicate target path: {target}")
            target_paths.add(target.lower())
            planned.append((row, target))

        changed = 0
        for row, target in planned:
            if row.pdf_path != target:
                row.pdf_path = target
                changed += 1

        profile.resume_count = max(int(profile.resume_count or 0), len(rows))
        db.commit()
        return {
            "profile_id": profile.id,
            "resume_count": len(rows),
            "paths_changed": changed,
        }
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    result = rename_ryan_resume_db_paths()
    for key, value in result.items():
        print(f"{key}: {value}")

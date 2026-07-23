"""Apply the current filename rule to Ryan Cho's stored resume records.

This script never creates PDF content. It moves an exact source PDF when one
exists and otherwise updates only the database path.
"""

import os
import re
import secrets
import string
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import select

from app.config import GENERATED_DIR
from app.database import SessionLocal
from app.db_models import JobIdentity, JobProfile, ResumeGeneration

_SUFFIX_PATTERN = re.compile(r"_\d{3}([A-Za-z0-9]{4})\.pdf$", re.IGNORECASE)
_RANDOM_CHARS = string.ascii_letters + string.digits


def _suffix_from_filename(filename: str, used: set[str]) -> str:
    match = _SUFFIX_PATTERN.search(filename)
    suffix = match.group(1) if match else ""
    while not suffix or suffix.lower() in used:
        suffix = "".join(secrets.choice(_RANDOM_CHARS) for _ in range(4))
    used.add(suffix.lower())
    return suffix


def _stored_source_path(raw_path: str) -> Path:
    path = Path(raw_path)
    return path if path.is_absolute() else REPO_ROOT / path


def rename_ryan_resumes() -> dict[str, int]:
    db = SessionLocal()
    completed_moves: list[tuple[Path, Path]] = []

    try:
        profiles = list(
            db.scalars(
                select(JobProfile)
                .join(JobIdentity, JobIdentity.id == JobProfile.identity_id)
                .where(JobIdentity.name == "Ryan Cho")
            ).all()
        )
        if len(profiles) != 1:
            raise RuntimeError(
                f"Expected exactly one Ryan Cho profile, found {len(profiles)}"
            )
        profile = profiles[0]
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

        GENERATED_DIR.mkdir(parents=True, exist_ok=True)
        used_suffixes: set[str] = set()
        renamed_files = 0
        missing_files = 0

        for sequence, row in enumerate(rows, start=1):
            old_filename = Path(row.pdf_path or "").name
            suffix = _suffix_from_filename(old_filename, used_suffixes)
            new_filename = f"Ryan_Cho_{sequence:03d}{suffix}.pdf"
            source = _stored_source_path(row.pdf_path or "")
            target = GENERATED_DIR / new_filename

            if source.is_file():
                if target.exists() and source.resolve() != target.resolve():
                    raise RuntimeError(f"Target PDF already exists: {target}")
                if source.resolve() != target.resolve():
                    os.replace(source, target)
                    completed_moves.append((target, source))
                    renamed_files += 1
            else:
                missing_files += 1

            try:
                stored_path = target.relative_to(REPO_ROOT).as_posix()
            except ValueError:
                stored_path = target.as_posix()
            row.pdf_path = stored_path

        profile.resume_count = max(profile.resume_count or 0, len(rows))
        db.commit()
        return {
            "profile_id": profile.id,
            "database_records_renamed": len(rows),
            "physical_files_renamed": renamed_files,
            "missing_source_files": missing_files,
            "resume_count": profile.resume_count,
        }
    except Exception:
        db.rollback()
        for target, source in reversed(completed_moves):
            if target.is_file() and not source.exists():
                source.parent.mkdir(parents=True, exist_ok=True)
                os.replace(target, source)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    result = rename_ryan_resumes()
    for key, value in result.items():
        print(f"{key}: {value}")

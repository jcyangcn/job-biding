import os
import shutil
from pathlib import Path
from uuid import uuid4

from sqlalchemy.orm import Session

from app.config import GENERATED_DIR
from app.db_models import ResumeGeneration
from app.history import build_resume_content_payload, build_resume_vector
from app.models import Profile, ResumeContent
from app.pdf_renderer import render_resume_pdf
from app.text_sanitizer import sanitize_resume_content


def get_resume_generation(db: Session, generation_id: int) -> ResumeGeneration | None:
    return db.get(ResumeGeneration, generation_id)


def resolve_resume_generation_pdf(row: ResumeGeneration) -> Path:
    """Resolve a stored PDF by basename and keep it inside GENERATED_DIR."""
    filename = Path(row.pdf_path or "").name
    if not filename or filename in {".", ".."}:
        raise ValueError("Resume PDF path is invalid")

    generated_root = GENERATED_DIR.resolve()
    target = (generated_root / filename).resolve()
    if target.parent != generated_root:
        raise ValueError("Resume PDF path is outside the generated resume directory")
    return target


def rebuild_resume_generation(
    db: Session,
    row: ResumeGeneration,
    *,
    profile: Profile,
    content: ResumeContent,
    role: str | None = None,
) -> ResumeGeneration:
    """Atomically replace the PDF and update the existing generation record."""
    content = sanitize_resume_content(content)
    target = resolve_resume_generation_pdf(row)
    target.parent.mkdir(parents=True, exist_ok=True)
    token = uuid4().hex
    temporary = target.with_name(f".{target.stem}.{token}.tmp.pdf")
    backup = target.with_name(f".{target.stem}.{token}.backup.pdf")
    had_original = target.is_file()
    replaced = False

    try:
        render_resume_pdf(profile, content, temporary)
        if had_original:
            shutil.copy2(target, backup)
        os.replace(temporary, target)
        replaced = True

        payload = build_resume_content_payload(content)
        row.resume_content = payload
        row.resume_vector = build_resume_vector(
            db,
            resume_content=payload,
            role=role,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return row
    except Exception:
        db.rollback()
        if replaced:
            if backup.is_file():
                os.replace(backup, target)
            elif not had_original:
                target.unlink(missing_ok=True)
        raise
    finally:
        temporary.unlink(missing_ok=True)
        backup.unlink(missing_ok=True)


def delete_resume_generation(db: Session, row: ResumeGeneration) -> None:
    """Delete a generation and its PDF, restoring the file if DB deletion fails."""
    target = resolve_resume_generation_pdf(row)
    tombstone = target.with_name(f".{target.stem}.{uuid4().hex}.deleted.pdf")
    moved = False

    try:
        if target.is_file():
            os.replace(target, tombstone)
            moved = True
        db.delete(row)
        db.commit()
    except Exception:
        db.rollback()
        if moved and tombstone.is_file():
            os.replace(tombstone, target)
        raise
    else:
        tombstone.unlink(missing_ok=True)

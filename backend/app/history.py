from pathlib import Path

from sqlalchemy.orm import Session

from app.db_models import ResumeGeneration
from app.models import Profile


def save_resume_generation(
    db: Session,
    *,
    job_details: str,
    profile: Profile,
    pdf_path: Path,
    repo_root: Path,
) -> ResumeGeneration:
    try:
        relative = pdf_path.relative_to(repo_root)
        path_str = relative.as_posix()
    except ValueError:
        path_str = pdf_path.as_posix()

    row = ResumeGeneration(
        job_details=job_details,
        profile=profile.model_dump(mode="json"),
        pdf_path=path_str,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

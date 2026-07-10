import re
import secrets
from datetime import date, datetime, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import CITIZEN_IMAGE_DIR, CITIZEN_REVIEW_DIR, UPLOADS_DIR
from app.db_models import Citizen
from app.models import CitizenCreateRequest, CitizenImageInfo, CitizenUpdateRequest

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".pdf"}
ALLOWED_REVIEW_FILE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".bmp",
    ".pdf",
    ".doc",
    ".docx",
    ".txt",
    ".csv",
    ".xlsx",
    ".zip",
}


def _parse_files(raw: list | None) -> list[CitizenImageInfo]:
    if not raw:
        return []
    return [CitizenImageInfo.model_validate(item) for item in raw]


def citizen_to_response(record: Citizen) -> dict:
    return {
        "id": record.id,
        "country": record.country,
        "name": record.name,
        "linkedin": record.linkedin,
        "details": record.details or "",
        "review_status": record.review_status or "None",
        "reviewer": record.reviewer,
        "reviewed_at": record.reviewed_at,
        "review_log": record.review_log or "",
        "images": [item.model_dump(mode="json") for item in _parse_files(record.images)],
        "review_files": [item.model_dump(mode="json") for item in _parse_files(record.review_files)],
        "created_at": record.created_at,
        "updated_at": record.updated_at,
    }


def list_citizens(db: Session) -> list[Citizen]:
    return list(
        db.scalars(select(Citizen).order_by(Citizen.id.desc())).all()
    )


def get_citizen(db: Session, citizen_id: int) -> Citizen | None:
    return db.get(Citizen, citizen_id)


def create_citizen(db: Session, data: CitizenCreateRequest) -> Citizen:
    record = Citizen(
        country=data.country.strip(),
        name=data.name.strip(),
        linkedin=data.linkedin.strip() if data.linkedin and data.linkedin.strip() else None,
        details=data.details or "",
        review_status=data.review_status or "None",
        reviewer=data.reviewer.strip() if data.reviewer and data.reviewer.strip() else None,
        reviewed_at=data.reviewed_at,
        review_log=data.review_log or "",
        images=[],
        review_files=[],
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def update_citizen(db: Session, record: Citizen, data: CitizenUpdateRequest) -> Citizen:
    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        if field in ("country", "name") and isinstance(value, str):
            value = value.strip()
        if field == "linkedin":
            value = value.strip() if isinstance(value, str) and value.strip() else None
        if field == "reviewer":
            value = value.strip() if isinstance(value, str) and value.strip() else None
        if field == "details" and value is None:
            value = ""
        if field == "review_log" and value is None:
            value = ""
        setattr(record, field, value)

    record.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(record)
    return record


def delete_citizen(db: Session, record: Citizen) -> None:
    db.delete(record)
    db.commit()


def _safe_stored_filename(original_name: str, *, default_stem: str, allowed_extensions: set[str]) -> str:
    stem = Path(original_name).name
    stem = re.sub(r"[^\w.\-]+", "_", stem).strip("._")
    if not stem:
        stem = default_stem
    suffix = Path(stem).suffix.lower()
    if suffix not in allowed_extensions:
        stem = f"{stem}.bin"
    token = secrets.token_hex(4)
    return f"{token}_{stem}"


def _citizen_scope_dir(root: Path, citizen_id: int) -> Path:
    return root / str(citizen_id)


def _resolve_scoped_file_path(root: Path, citizen_id: int, filename: str) -> Path:
    """Resolve a citizen file stored under ``root/{citizen_id}/{filename}``.

    Falls back to the legacy flat uploads directory so previously uploaded
    files keep resolving after the storage layout change.
    """
    safe_name = Path(filename).name
    if safe_name != filename:
        raise ValueError("Invalid filename")

    scope_dir = _citizen_scope_dir(root, citizen_id).resolve()
    candidate = (scope_dir / safe_name).resolve()
    if candidate.parent != scope_dir:
        raise ValueError("Invalid filename")
    if candidate.is_file():
        return candidate

    legacy = (UPLOADS_DIR / safe_name).resolve()
    if legacy.parent == UPLOADS_DIR.resolve() and legacy.is_file():
        return legacy

    return candidate


def resolve_citizen_image_path(citizen_id: int, filename: str) -> Path:
    return _resolve_scoped_file_path(CITIZEN_IMAGE_DIR, citizen_id, filename)


def resolve_citizen_review_file_path(citizen_id: int, filename: str) -> Path:
    return _resolve_scoped_file_path(CITIZEN_REVIEW_DIR, citizen_id, filename)


def _add_citizen_file(
    db: Session,
    record: Citizen,
    *,
    field_name: str,
    root: Path,
    original_name: str,
    content: bytes,
    allowed_extensions: set[str],
    default_stem: str,
) -> CitizenImageInfo:
    suffix = Path(original_name).suffix.lower()
    if suffix not in allowed_extensions:
        raise ValueError(
            f"Unsupported file type. Allowed: {', '.join(sorted(allowed_extensions))}"
        )

    stored_name = _safe_stored_filename(
        original_name,
        default_stem=default_stem,
        allowed_extensions=allowed_extensions,
    )
    scope_dir = _citizen_scope_dir(root, record.id)
    scope_dir.mkdir(parents=True, exist_ok=True)
    target = scope_dir / stored_name
    target.write_bytes(content)

    file_info = CitizenImageInfo(
        filename=stored_name,
        original_name=Path(original_name).name,
        uploaded_at=datetime.now(timezone.utc),
        path=f"/storage/uploads/{root.name}/{record.id}/{stored_name}",
    )
    files = _parse_files(getattr(record, field_name))
    files.append(file_info)
    setattr(record, field_name, [item.model_dump(mode="json") for item in files])
    record.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(record)
    return file_info


def _remove_citizen_file(
    db: Session,
    record: Citizen,
    *,
    field_name: str,
    root: Path,
    filename: str,
) -> None:
    safe_name = Path(filename).name
    files = _parse_files(getattr(record, field_name))
    if not any(item.filename == safe_name for item in files):
        raise ValueError("File not found")

    path = _resolve_scoped_file_path(root, record.id, safe_name)
    if path.is_file():
        path.unlink()

    setattr(
        record,
        field_name,
        [item.model_dump(mode="json") for item in files if item.filename != safe_name],
    )
    record.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(record)


def add_citizen_image(
    db: Session,
    record: Citizen,
    *,
    original_name: str,
    content: bytes,
) -> CitizenImageInfo:
    return _add_citizen_file(
        db,
        record,
        field_name="images",
        root=CITIZEN_IMAGE_DIR,
        original_name=original_name,
        content=content,
        allowed_extensions=ALLOWED_IMAGE_EXTENSIONS,
        default_stem="image",
    )


def remove_citizen_image(db: Session, record: Citizen, filename: str) -> None:
    _remove_citizen_file(
        db,
        record,
        field_name="images",
        root=CITIZEN_IMAGE_DIR,
        filename=filename,
    )


def add_citizen_review_file(
    db: Session,
    record: Citizen,
    *,
    original_name: str,
    content: bytes,
) -> CitizenImageInfo:
    return _add_citizen_file(
        db,
        record,
        field_name="review_files",
        root=CITIZEN_REVIEW_DIR,
        original_name=original_name,
        content=content,
        allowed_extensions=ALLOWED_REVIEW_FILE_EXTENSIONS,
        default_stem="file",
    )


def remove_citizen_review_file(db: Session, record: Citizen, filename: str) -> None:
    _remove_citizen_file(
        db,
        record,
        field_name="review_files",
        root=CITIZEN_REVIEW_DIR,
        filename=filename,
    )

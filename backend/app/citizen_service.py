import re
import secrets
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import CITIZEN_IMAGES_DIR
from app.db_models import Citizen
from app.models import CitizenCreateRequest, CitizenImageInfo, CitizenUpdateRequest

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".pdf"}


def _citizen_images_root(citizen_id: int) -> Path:
    return CITIZEN_IMAGES_DIR / str(citizen_id)


def _parse_images(raw: list | None) -> list[CitizenImageInfo]:
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
        "status": record.status or "None",
        "images": [item.model_dump(mode="json") for item in _parse_images(record.images)],
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
        status=data.status or "None",
        images=[],
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
        if field == "details" and value is None:
            value = ""
        setattr(record, field, value)

    record.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(record)
    return record


def _remove_citizen_files(citizen_id: int) -> None:
    root = _citizen_images_root(citizen_id)
    if root.is_dir():
        for path in root.iterdir():
            if path.is_file():
                path.unlink(missing_ok=True)
        root.rmdir()


def delete_citizen(db: Session, record: Citizen) -> None:
    citizen_id = record.id
    db.delete(record)
    db.commit()
    _remove_citizen_files(citizen_id)


def _safe_stored_filename(original_name: str) -> str:
    stem = Path(original_name).name
    stem = re.sub(r"[^\w.\-]+", "_", stem).strip("._")
    if not stem:
        stem = "image"
    suffix = Path(stem).suffix.lower()
    if suffix not in ALLOWED_IMAGE_EXTENSIONS:
        stem = f"{stem}.jpg"
    token = secrets.token_hex(4)
    return f"{token}_{stem}"


def resolve_citizen_image_path(citizen_id: int, filename: str) -> Path:
    safe_name = Path(filename).name
    if safe_name != filename:
        raise ValueError("Invalid filename")

    image_path = (_citizen_images_root(citizen_id) / safe_name).resolve()
    root = _citizen_images_root(citizen_id).resolve()
    if image_path.parent != root:
        raise ValueError("Invalid filename")
    return image_path


def add_citizen_image(
    db: Session,
    record: Citizen,
    *,
    original_name: str,
    content: bytes,
) -> CitizenImageInfo:
    suffix = Path(original_name).suffix.lower()
    if suffix not in ALLOWED_IMAGE_EXTENSIONS:
        raise ValueError(
            f"Unsupported file type. Allowed: {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}"
        )

    stored_name = _safe_stored_filename(original_name)
    root = _citizen_images_root(record.id)
    root.mkdir(parents=True, exist_ok=True)
    target = root / stored_name
    target.write_bytes(content)

    image_info = CitizenImageInfo(
        filename=stored_name,
        original_name=Path(original_name).name,
        uploaded_at=datetime.now(timezone.utc),
    )
    images = _parse_images(record.images)
    images.append(image_info)
    record.images = [item.model_dump(mode="json") for item in images]
    record.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(record)
    return image_info


def remove_citizen_image(db: Session, record: Citizen, filename: str) -> None:
    safe_name = Path(filename).name
    images = _parse_images(record.images)
    if not any(item.filename == safe_name for item in images):
        raise ValueError("Image not found")

    path = resolve_citizen_image_path(record.id, safe_name)
    if path.is_file():
        path.unlink()

    record.images = [
        item.model_dump(mode="json")
        for item in images
        if item.filename != safe_name
    ]
    record.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(record)

import re
import secrets
import string
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import LINKEDIN_IMAGE_DIR, REPO_ROOT, UPLOADS_DIR
from app.country_codes import get_country_code
from app.db_models import LinkedInAccount
from app.models import (
    CitizenImageInfo,
    LinkedInAccountCreateRequest,
    LinkedInAccountUpdateRequest,
)

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}
_LINKEDIN_IMAGE_STORAGE_PREFIX = "/storage/uploads/linkedin image/"
_RANDOM_CHARS = string.ascii_letters + string.digits


def _optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def _upload_storage_path(stored_name: str) -> str:
    safe_name = Path(stored_name).name
    return f"{_LINKEDIN_IMAGE_STORAGE_PREFIX}{safe_name}"


def _sanitize_title_part(title: str) -> str:
    return re.sub(r"[^\w]+", "_", title.strip()).strip("_") or "untitled"


def _random_suffix(length: int = 4) -> str:
    return "".join(secrets.choice(_RANDOM_CHARS) for _ in range(length))


def _build_linkedin_upload_filename(country: str, title: str, original_name: str) -> str:
    country_code = get_country_code(country) or "XX"
    safe_title = _sanitize_title_part(title)
    suffix = Path(original_name).suffix.lower()
    if suffix not in ALLOWED_IMAGE_EXTENSIONS:
        suffix = ".png"
    LINKEDIN_IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    while True:
        filename = f"{country_code}_{safe_title}_{_random_suffix()}{suffix}"
        if not (LINKEDIN_IMAGE_DIR / filename).exists():
            return filename


def _parse_image(raw: dict | None) -> CitizenImageInfo | None:
    if not raw:
        return None
    image = CitizenImageInfo.model_validate(raw)
    if image.path:
        return image
    if image.filename:
        return image.model_copy(update={"path": _upload_storage_path(image.filename)})
    return image


def _resolve_stored_image_path(image: CitizenImageInfo) -> Path:
    if image.path:
        relative = image.path.lstrip("/\\")
        candidate = (REPO_ROOT / relative).resolve()
        if candidate.is_file():
            return candidate

    try:
        linkedin_path = _resolve_file_path(LINKEDIN_IMAGE_DIR, image.filename)
        if linkedin_path.is_file():
            return linkedin_path
    except ValueError:
        pass

    return _resolve_file_path(UPLOADS_DIR, image.filename)


def linkedin_account_to_response(record: LinkedInAccount) -> dict:
    image = _parse_image(record.image)
    return {
        "id": record.id,
        "title": record.title,
        "country": record.country,
        "email": record.email,
        "email_password": record.email_password,
        "email_recovery_email": record.email_recovery_email,
        "email_secured": record.email_secured,
        "recovery_email": record.recovery_email,
        "recovery_email_password": record.recovery_email_password,
        "recovery_email_recovery": record.recovery_email_recovery,
        "linkedin_email": record.linkedin_email,
        "linkedin_password": record.linkedin_password,
        "linkedin_link": record.linkedin_link,
        "second_email": record.second_email,
        "linkedin_secured": record.linkedin_secured,
        "browser": record.browser,
        "profile_no": record.profile_no,
        "provider": record.provider,
        "order_id": record.order_id,
        "proxy_info": record.proxy_info or "",
        "proxy_expired_by": record.proxy_expired_by,
        "purchased_from": record.purchased_from,
        "renting_to": record.renting_to,
        "renting_by": record.renting_by,
        "linkedin_created_at": record.linkedin_created_at,
        "image": image.model_dump(mode="json") if image else None,
        "status": record.status,
        "need_action": record.need_action,
        "logs": record.logs or "",
        "created_at": record.created_at,
        "updated_at": record.updated_at,
    }


def list_linkedin_accounts(db: Session) -> list[LinkedInAccount]:
    return list(
        db.scalars(select(LinkedInAccount).order_by(LinkedInAccount.id.desc())).all()
    )


def get_linkedin_account(db: Session, account_id: int) -> LinkedInAccount | None:
    return db.get(LinkedInAccount, account_id)


def _apply_text_fields(record: LinkedInAccount, data: dict) -> None:
    text_fields = (
        "title",
        "country",
        "email",
        "email_password",
        "email_recovery_email",
        "recovery_email",
        "recovery_email_password",
        "recovery_email_recovery",
        "linkedin_email",
        "linkedin_password",
        "linkedin_link",
        "second_email",
        "browser",
        "provider",
        "order_id",
        "proxy_info",
        "purchased_from",
        "renting_to",
        "logs",
    )
    optional_text_fields = {
        "email_recovery_email",
        "recovery_email",
        "recovery_email_password",
        "recovery_email_recovery",
        "linkedin_email",
        "linkedin_password",
        "linkedin_link",
        "second_email",
        "browser",
        "provider",
        "order_id",
        "purchased_from",
        "renting_to",
    }

    for field in text_fields:
        if field not in data:
            continue
        value = data[field]
        if field == "title" and isinstance(value, str):
            value = value.strip()
        if field == "country" and isinstance(value, str):
            value = value.strip()
        if field == "email" and isinstance(value, str):
            value = value.strip()
        if field == "email_password" and isinstance(value, str):
            value = value.strip()
        if field in optional_text_fields:
            value = _optional_text(value if isinstance(value, str) else value)
        if field == "proxy_info" and value is None:
            value = ""
        if field == "logs" and value is None:
            value = ""
        setattr(record, field, value)


def create_linkedin_account(db: Session, data: LinkedInAccountCreateRequest) -> LinkedInAccount:
    record = LinkedInAccount(
        title=data.title.strip(),
        country=data.country.strip(),
        email=data.email.strip(),
        email_password=data.email_password.strip(),
        email_recovery_email=_optional_text(data.email_recovery_email),
        email_secured=data.email_secured,
        recovery_email=_optional_text(data.recovery_email),
        recovery_email_password=_optional_text(data.recovery_email_password),
        recovery_email_recovery=_optional_text(data.recovery_email_recovery),
        linkedin_email=_optional_text(data.linkedin_email),
        linkedin_password=_optional_text(data.linkedin_password),
        linkedin_link=_optional_text(data.linkedin_link),
        second_email=_optional_text(data.second_email),
        linkedin_secured=data.linkedin_secured,
        browser=_optional_text(data.browser),
        profile_no=data.profile_no,
        provider=data.provider,
        order_id=_optional_text(data.order_id),
        proxy_info=data.proxy_info or "",
        proxy_expired_by=data.proxy_expired_by,
        purchased_from=_optional_text(data.purchased_from),
        renting_to=_optional_text(data.renting_to),
        renting_by=data.renting_by,
        linkedin_created_at=data.linkedin_created_at,
        image=None,
        status=data.status,
        need_action=data.need_action,
        logs=data.logs or "",
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def update_linkedin_account(
    db: Session, record: LinkedInAccount, data: LinkedInAccountUpdateRequest
) -> LinkedInAccount:
    updates = data.model_dump(exclude_unset=True)
    if "email_password" in updates and not str(updates["email_password"] or "").strip():
        updates.pop("email_password")
    if "linkedin_password" in updates and not str(updates["linkedin_password"] or "").strip():
        updates.pop("linkedin_password")
    if "recovery_email_password" in updates and not str(
        updates["recovery_email_password"] or ""
    ).strip():
        updates.pop("recovery_email_password")

    _apply_text_fields(record, updates)

    for field in (
        "email_secured",
        "linkedin_secured",
        "profile_no",
        "proxy_expired_by",
        "renting_by",
        "linkedin_created_at",
        "status",
        "need_action",
    ):
        if field in updates:
            setattr(record, field, updates[field])

    record.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(record)
    return record


def delete_linkedin_account(db: Session, record: LinkedInAccount) -> None:
    db.delete(record)
    db.commit()


def _resolve_file_path(root: Path, filename: str) -> Path:
    safe_name = Path(filename).name
    if safe_name != filename:
        raise ValueError("Invalid filename")

    file_path = (root / safe_name).resolve()
    resolved_root = root.resolve()
    if file_path.parent != resolved_root:
        raise ValueError("Invalid filename")
    return file_path


def resolve_linkedin_image_path(account_id: int, filename: str) -> Path:
    del account_id
    return _resolve_file_path(LINKEDIN_IMAGE_DIR, filename)


def _resolve_import_image_path(raw_path: str) -> Path | None:
    text = str(raw_path or "").strip()
    if not text:
        return None

    normalized = text.replace("\\", "/").strip()
    candidates: list[Path] = []

    lower = normalized.lower()
    if "storage/uploads/" in lower:
        idx = lower.index("storage/uploads/")
        relative = normalized[idx:]
        candidates.append((REPO_ROOT / relative).resolve())

    path = Path(text)
    if path.is_absolute():
        candidates.append(path.resolve())

    filename = Path(normalized).name
    if filename:
        for root in (LINKEDIN_IMAGE_DIR, UPLOADS_DIR):
            try:
                candidates.append(_resolve_file_path(root, filename))
            except ValueError:
                pass

    seen: set[Path] = set()
    for candidate in candidates:
        if candidate in seen:
            continue
        seen.add(candidate)
        if candidate.is_file():
            return candidate
    return None


def _link_linkedin_image(
    db: Session,
    record: LinkedInAccount,
    *,
    stored_name: str,
    original_name: str,
) -> CitizenImageInfo:
    file_info = CitizenImageInfo(
        filename=stored_name,
        original_name=original_name,
        uploaded_at=datetime.now(timezone.utc),
        path=_upload_storage_path(stored_name),
    )
    record.image = file_info.model_dump(mode="json")
    record.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(record)
    return file_info


def set_linkedin_image_from_storage_path(
    db: Session,
    record: LinkedInAccount,
    *,
    storage_path: str,
) -> CitizenImageInfo:
    file_path = _resolve_import_image_path(storage_path)
    if file_path is None:
        raise ValueError(f"Image file not found: {storage_path}")

    suffix = file_path.suffix.lower()
    if suffix not in ALLOWED_IMAGE_EXTENSIONS:
        raise ValueError(
            f"Unsupported file type. Allowed: {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}"
        )

    linkedin_root = LINKEDIN_IMAGE_DIR.resolve()
    if file_path.parent == linkedin_root:
        return _link_linkedin_image(
            db,
            record,
            stored_name=file_path.name,
            original_name=file_path.name,
        )

    return set_linkedin_image(
        db,
        record,
        original_name=file_path.name,
        content=file_path.read_bytes(),
    )


def set_linkedin_image(
    db: Session,
    record: LinkedInAccount,
    *,
    original_name: str,
    content: bytes,
) -> CitizenImageInfo:
    suffix = Path(original_name).suffix.lower()
    if suffix not in ALLOWED_IMAGE_EXTENSIONS:
        raise ValueError(
            f"Unsupported file type. Allowed: {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}"
        )

    LINKEDIN_IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    stored_name = _build_linkedin_upload_filename(
        record.country,
        record.title,
        original_name,
    )
    target = LINKEDIN_IMAGE_DIR / stored_name
    target.write_bytes(content)

    return _link_linkedin_image(
        db,
        record,
        stored_name=stored_name,
        original_name=Path(original_name).name,
    )


def resolve_linkedin_image_file(image: dict | None) -> Path:
    parsed = _parse_image(image)
    if not parsed:
        raise ValueError("Image not found")
    path = _resolve_stored_image_path(parsed)
    if not path.is_file():
        raise ValueError("Image file not found")
    return path


def remove_linkedin_image(db: Session, record: LinkedInAccount) -> None:
    if not _parse_image(record.image):
        raise ValueError("Image not found")

    record.image = None
    record.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(record)

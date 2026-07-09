import csv
import io
import re
from datetime import date, datetime
from pathlib import Path

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.linkedin_service import (
    create_linkedin_account,
    get_linkedin_account,
    list_linkedin_accounts,
    set_linkedin_image_from_storage_path,
    update_linkedin_account,
)
from app.models import (
    CitizenImageInfo,
    LinkedInAccountCreateRequest,
    LinkedInAccountUpdateRequest,
)

LINKEDIN_CSV_HEADERS = [
    "ID",
    "Title",
    "Image",
    "Country",
    "Email",
    "Email password",
    "Email recovery email",
    "Email secured",
    "Recovery email",
    "Recovery email password",
    "Recovery email recovery",
    "LinkedIn email",
    "LinkedIn password",
    "LinkedIn link",
    "LinkedIn created at",
    "Second email",
    "LinkedIn secured",
    "Browser",
    "Profile no",
    "Provider",
    "Order ID",
    "Proxy info",
    "Proxy expired by",
    "Purchased from",
    "Renting to",
    "Renting by",
    "Status",
    "Need action",
    "Logs",
    "Created at",
    "Updated at",
]

HEADER_TO_FIELD = {
    "id": "id",
    "title": "title",
    "image": "image",
    "country": "country",
    "email": "email",
    "email password": "email_password",
    "email recovery email": "email_recovery_email",
    "email secured": "email_secured",
    "recovery email": "recovery_email",
    "recovery email password": "recovery_email_password",
    "recovery email recovery": "recovery_email_recovery",
    "linkedin email": "linkedin_email",
    "linkedin password": "linkedin_password",
    "linkedin link": "linkedin_link",
    "linkedin created at": "linkedin_created_at",
    "second email": "second_email",
    "linkedin secured": "linkedin_secured",
    "browser": "browser",
    "profile no": "profile_no",
    "provider": "provider",
    "order id": "order_id",
    "proxy info": "proxy_info",
    "proxy expired by": "proxy_expired_by",
    "purchased from": "purchased_from",
    "renting to": "renting_to",
    "renting by": "renting_by",
    "status": "status",
    "need action": "need_action",
    "logs": "logs",
    "created at": "created_at",
    "updated at": "updated_at",
}

VALID_STATUSES = {"Pending", "Created", "Renting", "Sold", "Suspended"}
VALID_NEED_ACTIONS = {"None", "Need Reverify", "Email out of control"}
VALID_PROVIDERS = {"proxyo.io", "ixbrowser", "iproyal"}


def _normalize_header(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip().lower())


def _format_bool(value: bool) -> str:
    return "true" if value else "false"


def _format_date(value: date | None) -> str:
    return value.isoformat() if value else ""


def _format_datetime(value: datetime | None) -> str:
    return value.isoformat() if value else ""


def _format_image(raw: dict | None) -> str:
    if not raw:
        return ""
    try:
        image = CitizenImageInfo.model_validate(raw)
    except ValidationError:
        return str(raw.get("path") or raw.get("original_name") or raw.get("filename") or "")
    if image.path:
        return image.path
    if image.filename:
        return f"/storage/uploads/linkedin image/{Path(image.filename).name}"
    return image.original_name or image.filename or ""


def _parse_bool(value: str | None) -> bool | None:
    text = str(value or "").strip().lower()
    if not text:
        return None
    if text in {"true", "1", "yes", "y"}:
        return True
    if text in {"false", "0", "no", "n"}:
        return False
    raise ValueError(f"Invalid boolean value: {value}")


def _parse_date(value: str | None) -> date | None:
    text = str(value or "").strip()
    if not text:
        return None
    try:
        return date.fromisoformat(text[:10])
    except ValueError as exc:
        raise ValueError(f"Invalid date value: {value}") from exc


def _parse_int(value: str | None) -> int | None:
    text = str(value or "").strip()
    if not text:
        return None
    try:
        return int(text)
    except ValueError as exc:
        raise ValueError(f"Invalid integer value: {value}") from exc


def _parse_id(value: str | None) -> int | None:
    text = str(value or "").strip()
    if not text:
        return None
    try:
        parsed = int(text)
    except ValueError as exc:
        raise ValueError(f"Invalid ID value: {value}") from exc
    if parsed <= 0:
        raise ValueError(f"Invalid ID value: {value}")
    return parsed


def _normalize_status(value: str | None) -> str | None:
    text = str(value or "").strip()
    if not text:
        return None
    if text == "Secured":
        return "Sold"
    if text not in VALID_STATUSES:
        raise ValueError(f"Invalid status: {value}")
    return text


def _normalize_need_action(value: str | None) -> str | None:
    text = str(value or "").strip()
    if not text:
        return None
    if text not in VALID_NEED_ACTIONS:
        raise ValueError(f"Invalid need action: {value}")
    return text


def _normalize_provider(value: str | None) -> str | None:
    text = str(value or "").strip()
    if not text:
        return None
    if text not in VALID_PROVIDERS:
        raise ValueError(f"Invalid provider: {value}")
    return text


def _optional_text(value: str | None) -> str | None:
    text = str(value or "").strip()
    return text or None


def _row_is_empty(row: dict[str, str]) -> bool:
    return not any(str(value or "").strip() for value in row.values())


def export_linkedin_accounts_csv(db: Session) -> str:
    records = list_linkedin_accounts(db)
    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator="\r\n")
    writer.writerow(LINKEDIN_CSV_HEADERS)

    for record in records:
        writer.writerow(
            [
                record.id,
                record.title or "",
                _format_image(record.image),
                record.country or "United States",
                record.email or "",
                record.email_password or "",
                record.email_recovery_email or "",
                _format_bool(record.email_secured),
                record.recovery_email or "",
                record.recovery_email_password or "",
                record.recovery_email_recovery or "",
                record.linkedin_email or "",
                record.linkedin_password or "",
                record.linkedin_link or "",
                _format_date(record.linkedin_created_at),
                record.second_email or "",
                _format_bool(record.linkedin_secured),
                record.browser or "",
                record.profile_no if record.profile_no is not None else "",
                record.provider or "",
                record.order_id or "",
                record.proxy_info or "",
                _format_date(record.proxy_expired_by),
                record.purchased_from or "",
                record.renting_to or "",
                _format_date(record.renting_by),
                record.status or "Pending",
                record.need_action or "None",
                record.logs or "",
                _format_datetime(record.created_at),
                _format_datetime(record.updated_at),
            ]
        )

    return buffer.getvalue()


def _records_from_csv(content: str) -> list[dict[str, str]]:
    text = content.lstrip("\ufeff")
    reader = csv.reader(io.StringIO(text))
    rows = list(reader)
    if not rows:
        return []

    headers = [_normalize_header(header) for header in rows[0]]
    records: list[dict[str, str]] = []
    for row in rows[1:]:
        record: dict[str, str] = {}
        for index, header in enumerate(headers):
            if not header:
                continue
            record[header] = row[index] if index < len(row) else ""
        if not _row_is_empty(record):
            records.append(record)
    return records


def _map_csv_row(record: dict[str, str]) -> dict[str, object]:
    mapped: dict[str, object] = {}
    for header, value in record.items():
        field = HEADER_TO_FIELD.get(header)
        if not field or field in {"created_at", "updated_at"}:
            continue
        mapped[field] = value
    return mapped


def _build_create_payload(data: dict[str, object]) -> LinkedInAccountCreateRequest:
    title = str(data.get("title") or "").strip()
    if not title:
        raise ValueError("Title is required")

    payload: dict[str, object] = {
        "title": title,
        "country": str(data.get("country") or "United States").strip() or "United States",
        "email": str(data.get("email") or "").strip(),
        "email_password": str(data.get("email_password") or "").strip(),
        "email_recovery_email": _optional_text(str(data.get("email_recovery_email") or "")),
        "email_secured": _parse_bool(str(data.get("email_secured") or "")) or False,
        "recovery_email": _optional_text(str(data.get("recovery_email") or "")),
        "recovery_email_password": _optional_text(str(data.get("recovery_email_password") or "")),
        "recovery_email_recovery": _optional_text(str(data.get("recovery_email_recovery") or "")),
        "linkedin_email": _optional_text(str(data.get("linkedin_email") or "")),
        "linkedin_password": _optional_text(str(data.get("linkedin_password") or "")),
        "linkedin_link": _optional_text(str(data.get("linkedin_link") or "")),
        "linkedin_created_at": _parse_date(str(data.get("linkedin_created_at") or "")),
        "second_email": _optional_text(str(data.get("second_email") or "")),
        "linkedin_secured": _parse_bool(str(data.get("linkedin_secured") or "")) or False,
        "browser": _optional_text(str(data.get("browser") or "")),
        "profile_no": _parse_int(str(data.get("profile_no") or "")),
        "provider": _normalize_provider(str(data.get("provider") or "")),
        "order_id": _optional_text(str(data.get("order_id") or "")),
        "proxy_info": str(data.get("proxy_info") or ""),
        "proxy_expired_by": _parse_date(str(data.get("proxy_expired_by") or "")),
        "purchased_from": _optional_text(str(data.get("purchased_from") or "")),
        "renting_to": _optional_text(str(data.get("renting_to") or "")),
        "renting_by": _parse_date(str(data.get("renting_by") or "")),
        "status": _normalize_status(str(data.get("status") or "")) or "Pending",
        "need_action": _normalize_need_action(str(data.get("need_action") or "")) or "None",
        "logs": str(data.get("logs") or ""),
    }
    return LinkedInAccountCreateRequest.model_validate(payload)


def _build_update_payload(data: dict[str, object]) -> LinkedInAccountUpdateRequest:
    payload: dict[str, object] = {}

    if "title" in data:
        title = str(data.get("title") or "").strip()
        if not title:
            raise ValueError("Title is required")
        payload["title"] = title
    if "country" in data:
        country = str(data.get("country") or "").strip()
        if country:
            payload["country"] = country
    if "email" in data:
        payload["email"] = str(data.get("email") or "").strip()
    if "email_password" in data:
        password = str(data.get("email_password") or "").strip()
        if password:
            payload["email_password"] = password
    if "email_recovery_email" in data:
        payload["email_recovery_email"] = _optional_text(str(data.get("email_recovery_email") or ""))
    if "email_secured" in data:
        parsed = _parse_bool(str(data.get("email_secured") or ""))
        if parsed is not None:
            payload["email_secured"] = parsed
    if "recovery_email" in data:
        payload["recovery_email"] = _optional_text(str(data.get("recovery_email") or ""))
    if "recovery_email_password" in data:
        password = str(data.get("recovery_email_password") or "").strip()
        if password:
            payload["recovery_email_password"] = password
    if "recovery_email_recovery" in data:
        payload["recovery_email_recovery"] = _optional_text(
            str(data.get("recovery_email_recovery") or "")
        )
    if "linkedin_email" in data:
        payload["linkedin_email"] = _optional_text(str(data.get("linkedin_email") or ""))
    if "linkedin_password" in data:
        password = str(data.get("linkedin_password") or "").strip()
        if password:
            payload["linkedin_password"] = password
    if "linkedin_link" in data:
        payload["linkedin_link"] = _optional_text(str(data.get("linkedin_link") or ""))
    if "linkedin_created_at" in data:
        payload["linkedin_created_at"] = _parse_date(str(data.get("linkedin_created_at") or ""))
    if "second_email" in data:
        payload["second_email"] = _optional_text(str(data.get("second_email") or ""))
    if "linkedin_secured" in data:
        parsed = _parse_bool(str(data.get("linkedin_secured") or ""))
        if parsed is not None:
            payload["linkedin_secured"] = parsed
    if "browser" in data:
        payload["browser"] = _optional_text(str(data.get("browser") or ""))
    if "profile_no" in data:
        payload["profile_no"] = _parse_int(str(data.get("profile_no") or ""))
    if "provider" in data:
        payload["provider"] = _normalize_provider(str(data.get("provider") or ""))
    if "order_id" in data:
        payload["order_id"] = _optional_text(str(data.get("order_id") or ""))
    if "proxy_info" in data:
        payload["proxy_info"] = str(data.get("proxy_info") or "")
    if "proxy_expired_by" in data:
        payload["proxy_expired_by"] = _parse_date(str(data.get("proxy_expired_by") or ""))
    if "purchased_from" in data:
        payload["purchased_from"] = _optional_text(str(data.get("purchased_from") or ""))
    if "renting_to" in data:
        payload["renting_to"] = _optional_text(str(data.get("renting_to") or ""))
    if "renting_by" in data:
        payload["renting_by"] = _parse_date(str(data.get("renting_by") or ""))
    if "status" in data:
        status = _normalize_status(str(data.get("status") or ""))
        if status:
            payload["status"] = status
    if "need_action" in data:
        need_action = _normalize_need_action(str(data.get("need_action") or ""))
        if need_action:
            payload["need_action"] = need_action
    if "logs" in data:
        payload["logs"] = str(data.get("logs") or "")

    return LinkedInAccountUpdateRequest.model_validate(payload)


def import_linkedin_accounts_csv(db: Session, content: str) -> dict[str, object]:
    records = _records_from_csv(content)
    if not records:
        raise ValueError("No rows found in CSV")

    created = 0
    updated = 0
    failed = 0
    errors: list[str] = []

    for index, record in enumerate(records, start=2):
        try:
            mapped = _map_csv_row(record)
            image_path = str(mapped.pop("image", "") or "").strip() or None
            account_id = _parse_id(str(mapped.get("id") or "")) if "id" in mapped else None
            existing = get_linkedin_account(db, account_id) if account_id else None

            if existing:
                update_payload = _build_update_payload(mapped)
                account = update_linkedin_account(db, existing, update_payload)
                updated += 1
            else:
                create_payload = _build_create_payload(mapped)
                account = create_linkedin_account(db, create_payload)
                created += 1

            if image_path:
                set_linkedin_image_from_storage_path(db, account, storage_path=image_path)
        except (ValueError, ValidationError) as exc:
            failed += 1
            message = str(exc)
            if isinstance(exc, ValidationError):
                message = "; ".join(
                    f"{'.'.join(str(part) for part in error.get('loc', ()))}: {error.get('msg')}"
                    for error in exc.errors()
                )
            errors.append(f"Row {index}: {message}")

    return {
        "created": created,
        "updated": updated,
        "failed": failed,
        "errors": errors[:20],
    }

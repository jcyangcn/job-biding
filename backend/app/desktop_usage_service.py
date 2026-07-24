from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
import re
import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import DESKTOP_USAGE_SCREENSHOT_DIR
from app.db_models import DesktopScreenshot, DesktopUsageSession, User
from app.models import (
    DesktopScreenshotResponse,
    DesktopUsageDailyPoint,
    DesktopUsageSessionResponse,
    DesktopUsageSessionUpsertRequest,
    DesktopUsageUserAnalyticsResponse,
)


def _as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def usage_session_to_response(record: DesktopUsageSession) -> DesktopUsageSessionResponse:
    return DesktopUsageSessionResponse(
        id=record.id,
        client_session_id=record.client_session_id,
        app_name=record.app_name,
        edition=record.edition,
        started_at=record.started_at,
        ended_at=record.ended_at,
        client_updated_at=record.client_updated_at,
        active_ms=record.active_ms,
        focused_ms=record.focused_ms,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


def screenshot_to_response(record: DesktopScreenshot) -> DesktopScreenshotResponse:
    return DesktopScreenshotResponse(
        id=record.id,
        client_file_id=record.client_file_id,
        client_session_id=record.client_session_id,
        reason=record.reason,
        screen_index=record.screen_index,
        screen_name=record.screen_name,
        original_filename=record.original_filename,
        relative_path=record.relative_path,
        file_size=record.file_size,
        captured_at=record.captured_at,
        uploaded_at=record.uploaded_at,
    )


def upsert_usage_session(
    db: Session,
    user: User,
    data: DesktopUsageSessionUpsertRequest,
) -> DesktopUsageSession:
    client_session_id = data.client_session_id.strip()
    record = db.scalar(
        select(DesktopUsageSession).where(
            DesktopUsageSession.user_id == user.id,
            DesktopUsageSession.client_session_id == client_session_id,
        )
    )

    started_at = _as_utc(data.started_at)
    ended_at = _as_utc(data.ended_at)
    client_updated_at = _as_utc(data.updated_at)

    if record is None:
        record = DesktopUsageSession(
            user_id=user.id,
            client_session_id=client_session_id,
            app_name=(data.app_name or "HuntFlow").strip()[:100],
            edition=(data.edition or "bidder").strip()[:50],
            started_at=started_at or datetime.now(timezone.utc),
            ended_at=ended_at,
            client_updated_at=client_updated_at,
            active_ms=max(0, int(data.active_ms or 0)),
            focused_ms=max(0, int(data.focused_ms or 0)),
        )
        db.add(record)
    else:
        # Keep the densest/latest client snapshot.
        record.app_name = (data.app_name or record.app_name or "HuntFlow").strip()[:100]
        record.edition = (data.edition or record.edition or "bidder").strip()[:50]
        if started_at:
            record.started_at = started_at
        if ended_at is not None:
            record.ended_at = ended_at
        if client_updated_at is not None:
            record.client_updated_at = client_updated_at
        record.active_ms = max(record.active_ms or 0, int(data.active_ms or 0))
        record.focused_ms = max(record.focused_ms or 0, int(data.focused_ms or 0))

    db.commit()
    db.refresh(record)
    return record


def _safe_filename(name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", name).strip("._")
    return (cleaned or "screenshot.png")[:180]


def save_desktop_screenshot(
    db: Session,
    user: User,
    *,
    content: bytes,
    original_filename: str,
    client_file_id: str,
    client_session_id: str | None = None,
    reason: str = "interval",
    screen_index: int = 1,
    screen_name: str = "",
    captured_at: datetime | None = None,
) -> DesktopScreenshot:
    client_file_id = (client_file_id or "").strip()
    if not client_file_id:
        raise ValueError("client_file_id is required")

    existing = db.scalar(
        select(DesktopScreenshot).where(
            DesktopScreenshot.user_id == user.id,
            DesktopScreenshot.client_file_id == client_file_id,
        )
    )
    if existing is not None:
        return existing

    DESKTOP_USAGE_SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
    user_dir = DESKTOP_USAGE_SCREENSHOT_DIR / str(user.id)
    user_dir.mkdir(parents=True, exist_ok=True)

    original = _safe_filename(original_filename or "screenshot.png")
    if not original.lower().endswith(".png"):
        original = f"{original}.png"
    stored = f"{uuid.uuid4().hex}_{original}"
    target = user_dir / stored
    target.write_bytes(content)

    relative = f"desktop usage screenshots/{user.id}/{stored}"
    record = DesktopScreenshot(
        user_id=user.id,
        client_file_id=client_file_id,
        client_session_id=(client_session_id or None),
        reason=(reason or "interval")[:50],
        screen_index=max(1, int(screen_index or 1)),
        screen_name=(screen_name or "")[:100],
        original_filename=original,
        stored_filename=stored,
        relative_path=relative,
        file_size=len(content),
        captured_at=_as_utc(captured_at),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def resolve_desktop_screenshot_path(record: DesktopScreenshot) -> Path:
    return DESKTOP_USAGE_SCREENSHOT_DIR / str(record.user_id) / record.stored_filename


def get_user_usage_analytics(
    db: Session,
    user: User,
    *,
    days: int = 14,
) -> DesktopUsageUserAnalyticsResponse:
    days = max(1, min(int(days or 14), 90))
    sessions = list(
        db.scalars(
            select(DesktopUsageSession)
            .where(DesktopUsageSession.user_id == user.id)
            .order_by(DesktopUsageSession.started_at.desc())
        ).all()
    )
    screenshots = list(
        db.scalars(
            select(DesktopScreenshot)
            .where(DesktopScreenshot.user_id == user.id)
            .order_by(DesktopScreenshot.uploaded_at.desc())
            .limit(24)
        ).all()
    )

    total_active = sum(int(item.active_ms or 0) for item in sessions)
    total_focused = sum(int(item.focused_ms or 0) for item in sessions)
    last_seen = None
    for item in sessions:
        candidate = item.client_updated_at or item.ended_at or item.updated_at or item.started_at
        if candidate and (last_seen is None or candidate > last_seen):
            last_seen = candidate

    # Build last N days buckets (including empty days).
    now = datetime.now(timezone.utc)
    day_keys: list[str] = []
    buckets: dict[str, DesktopUsageDailyPoint] = {}
    for offset in range(days - 1, -1, -1):
        day = (now - timedelta(days=offset)).date()
        key = day.isoformat()
        day_keys.append(key)
        buckets[key] = DesktopUsageDailyPoint(
            date=key, active_ms=0, focused_ms=0, sessions=0
        )

    for item in sessions:
        started = _as_utc(item.started_at)
        if not started:
            continue
        key = started.date().isoformat()
        if key not in buckets:
            continue
        buckets[key].active_ms += int(item.active_ms or 0)
        buckets[key].focused_ms += int(item.focused_ms or 0)
        buckets[key].sessions += 1

    screenshot_count = int(
        db.scalar(
            select(func.count())
            .select_from(DesktopScreenshot)
            .where(DesktopScreenshot.user_id == user.id)
        )
        or 0
    )

    return DesktopUsageUserAnalyticsResponse(
        user_id=user.id,
        full_name=user.full_name,
        username=user.username,
        role=str(user.role.value if hasattr(user.role, "value") else user.role),
        total_active_ms=total_active,
        total_focused_ms=total_focused,
        session_count=len(sessions),
        screenshot_count=screenshot_count,
        last_seen_at=last_seen,
        daily=[buckets[key] for key in day_keys],
        recent_sessions=[usage_session_to_response(item) for item in sessions[:12]],
        recent_screenshots=[screenshot_to_response(item) for item in screenshots],
    )

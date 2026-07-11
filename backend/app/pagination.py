from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Any, Sequence

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session


DEFAULT_PAGE = 1
DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE = 200


@dataclass(frozen=True)
class PageParams:
    page: int
    page_size: int

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


def normalize_page_params(
    page: int | None = None,
    page_size: int | None = None,
) -> PageParams:
    resolved_page = DEFAULT_PAGE if page is None else int(page)
    resolved_size = DEFAULT_PAGE_SIZE if page_size is None else int(page_size)
    resolved_page = max(1, resolved_page)
    resolved_size = max(1, min(resolved_size, MAX_PAGE_SIZE))
    return PageParams(page=resolved_page, page_size=resolved_size)


def parse_optional_date(value: str | date | datetime | None) -> date | None:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    text = str(value).strip()
    if not text:
        return None
    # Accept YYYY-MM-DD or full ISO datetime.
    if "T" in text:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).date()
    return date.fromisoformat(text[:10])


def resolve_sort(
    sort_by: str | None,
    sort_dir: str | None,
    allowed: dict[str, Any],
    default_key: str,
) -> tuple[Any, bool]:
    """Return (column_or_expr, descending)."""
    key = (sort_by or default_key).strip()
    if key not in allowed:
        key = default_key
    descending = (sort_dir or "desc").strip().lower() == "desc"
    return allowed[key], descending


def paginate_select(
    db: Session,
    stmt: Select[Any],
    params: PageParams,
) -> tuple[Sequence[Any], int]:
    count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
    total = int(db.scalar(count_stmt) or 0)
    items = list(
        db.scalars(stmt.offset(params.offset).limit(params.page_size)).all()
    )
    return items, total


def page_dict(
    items: list[Any],
    total: int,
    params: PageParams,
) -> dict[str, Any]:
    return {
        "items": items,
        "total": total,
        "page": params.page,
        "page_size": params.page_size,
    }

"""Build job_vector scores from a job description and skill keywords."""

from __future__ import annotations

import json
import re
from typing import Any


def mention_score(count: int) -> float:
    if count <= 0:
        return 0.0
    if count == 1:
        return 1.0
    if count == 2:
        return 1.5
    if count == 3:
        return 2.0
    return 2.5


def count_mentions(job_description: str, keyword: str) -> int:
    text = (keyword or "").strip()
    if not text:
        return 0
    pattern = re.compile(re.escape(text), re.IGNORECASE)
    return len(pattern.findall(job_description or ""))


def build_job_vector(job_description: str, keywords: list[str]) -> list[float]:
    return [mention_score(count_mentions(job_description, keyword)) for keyword in keywords]


def build_job_vector_weighted(
    job_description: str,
    entries: list[tuple[str, float]],
) -> list[float]:
    scores: list[float] = []
    for keyword, weight in entries:
        score = mention_score(count_mentions(job_description, keyword))
        multiplier = float(weight if weight is not None else 1.0)
        scores.append(score * multiplier)
    return scores


def _entry_to_keyword(entry: Any) -> str:
    if entry is None:
        return ""
    if isinstance(entry, (str, int, float)):
        return str(entry).strip()
    if isinstance(entry, dict):
        item = entry.get("item")
        if item is not None and str(item).strip():
            return str(item).strip()
        keyword = entry.get("keyword")
        if keyword is not None and str(keyword).strip():
            return str(keyword).strip()
    return ""


def _normalize_keyword_json_text(text: str) -> str:
    """Quote bare keys so {item : "react", weight:1} becomes valid JSON."""
    return re.sub(
        r"([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:",
        r'\1"\2":',
        text.strip(),
    )


def _extract_items_by_regex(text: str) -> list[str]:
    return [
        value.strip()
        for value in re.findall(r'\bitem\s*:\s*"([^"]+)"', text, flags=re.IGNORECASE)
        if value.strip()
    ]


def parse_keyword_weight_entries(raw: Any, *, default_weight: float = 1.0) -> list[tuple[str, float]]:
    """Normalize legacy keyword payloads into (keyword, weight) pairs."""
    if raw is None:
        return []

    if isinstance(raw, list):
        entries: list[tuple[str, float]] = []
        for item in raw:
            if isinstance(item, dict):
                keyword = _entry_to_keyword(item)
                if not keyword:
                    continue
                weight_raw = item.get("weight")
                weight = (
                    default_weight
                    if weight_raw is None
                    else float(weight_raw)
                )
                entries.append((keyword, weight))
            else:
                keyword = _entry_to_keyword(item)
                if keyword:
                    entries.append((keyword, default_weight))
        return entries

    if isinstance(raw, dict):
        nested = raw.get("items") or raw.get("keywords")
        if isinstance(nested, list):
            return parse_keyword_weight_entries(nested, default_weight=default_weight)
        keyword = _entry_to_keyword(raw)
        return [(keyword, default_weight)] if keyword else []

    text = str(raw).strip()
    if not text:
        return []

    try:
        return parse_keyword_weight_entries(json.loads(text), default_weight=default_weight)
    except json.JSONDecodeError:
        pass

    try:
        return parse_keyword_weight_entries(
            json.loads(_normalize_keyword_json_text(text)),
            default_weight=default_weight,
        )
    except json.JSONDecodeError:
        pass

    from_regex = _extract_items_by_regex(text)
    if from_regex:
        return [(value, default_weight) for value in from_regex]

    return [(text, default_weight)]


def parse_keyword_entries(raw: Any) -> list[str]:
    """
    Normalize skill.keyword into keyword strings.

    Expected shape: [{ "item": "react", "weight": 1 }, ...]
    Also accepts lenient unquoted-key text used in the UI.
    """
    if raw is None:
        return []
    if isinstance(raw, list):
        return [value for value in (_entry_to_keyword(item) for item in raw) if value]
    if isinstance(raw, dict):
        items = raw.get("items") or raw.get("keywords")
        if isinstance(items, list):
            return [value for value in (_entry_to_keyword(item) for item in items) if value]
        single = _entry_to_keyword(raw)
        return [single] if single else []

    text = str(raw).strip()
    if not text:
        return []

    try:
        return parse_keyword_entries(json.loads(text))
    except json.JSONDecodeError:
        pass

    try:
        return parse_keyword_entries(json.loads(_normalize_keyword_json_text(text)))
    except json.JSONDecodeError:
        pass

    from_regex = _extract_items_by_regex(text)
    if from_regex:
        return from_regex

    return [text]

"""Import job posts from spreadsheet URLs (newest dates first)."""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from dataclasses import dataclass
from datetime import datetime
from html import unescape
from pathlib import Path

import httpx
from sqlalchemy import select

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal
from app.db_models import JobPost
from app.job_post_service import create_job_post
from app.models import JobPostCreateRequest

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
}

DEAD_PHRASES = (
    "no longer available",
    "page not found",
    "job is closed",
    "posting has expired",
    "position has been filled",
    "job not found",
    "this job is no longer",
    "opening is closed",
)

DEFAULT_CSV = Path(__file__).resolve().parents[2] / "storage" / "sheet.csv"


@dataclass
class SpreadsheetRow:
    date: datetime
    role: str
    company: str
    url: str


@dataclass
class FetchedJob:
    title: str
    description: str


def strip_html(html: str) -> str:
    text = re.sub(r"<[^>]+>", " ", html or "")
    return unescape(re.sub(r"\s+", " ", text)).strip()


def parse_date(value: str) -> datetime | None:
    raw = (value or "").strip()
    if not raw:
        return None
    for fmt in ("%m/%d/%Y", "%m/%d/%y", "%Y-%m-%d"):
        try:
            return datetime.strptime(raw, fmt)
        except ValueError:
            continue
    return None


def load_spreadsheet_rows(csv_path: Path) -> list[SpreadsheetRow]:
    rows: list[SpreadsheetRow] = []
    with csv_path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for raw in reader:
            date = parse_date(raw.get("Date Applied") or "")
            url = (raw.get("Company/External URL") or "").strip()
            if not date or not url or not url.startswith("http"):
                continue
            rows.append(
                SpreadsheetRow(
                    date=date,
                    role=(raw.get("Roles") or "").strip(),
                    company=(raw.get("Company") or "").strip(),
                    url=url,
                )
            )
    rows.sort(key=lambda row: row.date, reverse=True)
    return rows


def fetch_greenhouse(url: str, client: httpx.Client) -> FetchedJob | None:
    match = re.search(r"greenhouse\.io/([^/?#]+)/jobs/(\d+)", url) or re.search(
        r"gh_jid=(\d+)", url
    )
    if not match:
        return None
    if match.lastindex == 2:
        board, job_id = match.group(1), match.group(2)
    else:
        job_id = match.group(1)
        board_match = re.search(r"greenhouse\.io/([^/?#]+)", url)
        if not board_match:
            host_match = re.search(r"//([^.]+)\.(?:com|io)/", url)
            board = host_match.group(1) if host_match else None
        else:
            board = board_match.group(1)
        if not board:
            return None
    response = client.get(
        f"https://boards-api.greenhouse.io/v1/boards/{board}/jobs/{job_id}"
    )
    if response.status_code != 200:
        return None
    payload = response.json()
    description = strip_html(payload.get("content") or "")
    if len(description) < 50:
        return None
    return FetchedJob(title=payload.get("title") or "", description=description)


def fetch_lever(url: str, client: httpx.Client) -> FetchedJob | None:
    match = re.search(r"jobs\.lever\.co/([^/]+)/([^/?#]+)", url)
    if not match:
        return None
    response = client.get(
        f"https://api.lever.co/v0/postings/{match.group(1)}/{match.group(2)}?mode=json"
    )
    if response.status_code != 200:
        return None
    payload = response.json()
    description = strip_html(payload.get("description") or "") or (
        payload.get("descriptionPlain") or ""
    ).strip()
    if len(description) < 50:
        return None
    return FetchedJob(title=payload.get("text") or "", description=description)


def fetch_ashby(url: str, client: httpx.Client) -> FetchedJob | None:
    match = re.search(r"jobs\.ashbyhq\.com/([^/]+)/([^/?#]+)", url)
    if not match:
        return None
    org, slug = match.group(1), match.group(2)
    response = client.get(f"https://api.ashbyhq.com/posting-api/job-board/{org}")
    if response.status_code != 200:
        return None
    for job in response.json().get("jobs", []):
        blob = json.dumps(job)
        if slug not in blob:
            continue
        description = (job.get("descriptionPlain") or "").strip() or strip_html(
            job.get("descriptionHtml") or ""
        )
        if len(description) < 50:
            continue
        return FetchedJob(title=job.get("title") or "", description=description)
    return None


def fetch_smartrecruiters(url: str, client: httpx.Client) -> FetchedJob | None:
    match = re.search(r"smartrecruiters\.com/([^/]+)/(\d+)-", url)
    if not match:
        return None
    company, job_id = match.group(1), match.group(2)
    response = client.get(
        f"https://api.smartrecruiters.com/v1/companies/{company}/postings/{job_id}"
    )
    if response.status_code != 200:
        return None
    payload = response.json()
    sections = payload.get("jobAd", {}).get("sections", {})
    parts: list[str] = []
    for section in sections.values():
        if isinstance(section, dict) and section.get("text"):
            parts.append(strip_html(section["text"]))
    description = "\n\n".join(part for part in parts if part)
    if len(description) < 50:
        return None
    return FetchedJob(title=payload.get("name") or "", description=description)


def fetch_jsonld(url: str, client: httpx.Client) -> FetchedJob | None:
    response = client.get(url)
    if response.status_code >= 400:
        return None
    if "error=true" in str(response.url):
        return None
    html = response.text
    lowered = html.lower()
    if any(phrase in lowered for phrase in DEAD_PHRASES) and len(html) < 100_000:
        return None
    for block in re.findall(
        r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>',
        html,
        re.S | re.I,
    ):
        try:
            data = json.loads(block)
        except json.JSONDecodeError:
            continue
        items = data if isinstance(data, list) else [data]
        for item in items:
            if not isinstance(item, dict):
                continue
            item_type = item.get("@type", "")
            if item_type == "JobPosting" or (
                isinstance(item_type, list) and "JobPosting" in item_type
            ):
                description = strip_html(item.get("description") or "")
                if len(description) >= 50:
                    return FetchedJob(
                        title=item.get("title") or "",
                        description=description,
                    )
    return None


def fetch_job(url: str, client: httpx.Client) -> FetchedJob | None:
    url_lower = url.lower()
    fetchers = []
    if "greenhouse.io" in url_lower or "gh_jid=" in url_lower:
        fetchers.append(fetch_greenhouse)
    if "ashbyhq.com" in url_lower:
        fetchers.append(fetch_ashby)
    if "lever.co" in url_lower:
        fetchers.append(fetch_lever)
    if "smartrecruiters.com" in url_lower:
        fetchers.append(fetch_smartrecruiters)
    fetchers.append(fetch_jsonld)

    seen: set[str] = set()
    for fetcher in fetchers:
        key = fetcher.__name__
        if key in seen:
            continue
        seen.add(key)
        try:
            result = fetcher(url, client)
        except httpx.HTTPError:
            result = None
        if result and len(result.description) >= 50:
            return result
    return None


def normalize_company(name: str) -> str:
    cleaned = (name or "").strip()
    if not cleaned:
        return "Unknown"
    return cleaned[:255]


def existing_urls(db) -> set[str]:
    return {
        (url or "").strip()
        for url in db.scalars(select(JobPost.url)).all()
        if (url or "").strip()
    }


def import_posts(limit: int = 200, csv_path: Path = DEFAULT_CSV) -> None:
    if not csv_path.exists():
        raise FileNotFoundError(f"Spreadsheet CSV not found: {csv_path}")

    rows = load_spreadsheet_rows(csv_path)
    print(f"Loaded {len(rows)} spreadsheet rows from {csv_path}")
    if rows:
        print(
            f"Date range (newest->oldest): "
            f"{rows[0].date.date()} -> {rows[-1].date.date()}"
        )

    created = 0
    skipped_dead = 0
    skipped_dup = 0
    scanned = 0

    with httpx.Client(headers=HEADERS, follow_redirects=True, timeout=30) as client:
        with SessionLocal() as db:
            known_urls = existing_urls(db)
            print(f"Existing posts in DB: {len(known_urls)}")

            for row in rows:
                if created >= limit:
                    break
                scanned += 1
                url = row.url.strip()
                if url in known_urls:
                    skipped_dup += 1
                    continue

                fetched = fetch_job(url, client)
                if not fetched:
                    skipped_dead += 1
                    print(
                        f"SKIP  {row.date.date()} | {row.company} — "
                        f"{(row.role or '')[:50]}"
                    )
                    continue

                role = (row.role or fetched.title or "Software Engineer").strip()[:255]
                company = normalize_company(row.company)
                description = fetched.description.strip()
                if fetched.title and fetched.title.lower() not in role.lower():
                    description = f"Title: {fetched.title}\n\n{description}"

                record = create_job_post(
                    db,
                    JobPostCreateRequest(
                        company=company,
                        role=role,
                        url=url,
                        job_description=description,
                    ),
                )
                known_urls.add(url)
                created += 1
                print(
                    f"OK #{record.id} [{created}/{limit}] {company} — {role} "
                    f"({len(description)} chars, applied {row.date.date()})"
                )

    print(
        f"\nCreated {created} post(s). "
        f"Scanned {scanned} row(s). "
        f"Skipped dead/unavailable: {skipped_dead}. "
        f"Skipped duplicates: {skipped_dup}."
    )
    if created < limit:
        print(f"Warning: only found {created} live postings (requested {limit}).")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Import live job posts from spreadsheet")
    parser.add_argument("--limit", type=int, default=200)
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    args = parser.parse_args()
    import_posts(limit=args.limit, csv_path=args.csv)

"""Merge duplicate job posts while preserving every post with an applied application."""

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.database import SessionLocal
from app.job_post_service import deduplicate_job_posts


if __name__ == "__main__":
    db = SessionLocal()
    try:
        result = deduplicate_job_posts(db)
    finally:
        db.close()

    for key, value in result.items():
        print(f"{key}: {value}")

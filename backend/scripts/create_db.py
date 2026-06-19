#!/usr/bin/env python3
"""Create PostgreSQL database and tables for job-bidding.

Run from the backend folder:
  python scripts/create_db.py
"""
from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.config import settings  # noqa: E402
from app.database import init_db  # noqa: E402


def database_exists(admin_engine, db_name: str) -> bool:
    with admin_engine.connect() as conn:
        row = conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :name"),
            {"name": db_name},
        ).scalar()
        return row is not None


def create_database(admin_engine, db_name: str) -> None:
    # CREATE DATABASE cannot run inside a transaction block.
    with admin_engine.connect() as conn:
        conn.execute(text(f'CREATE DATABASE "{db_name}"'))


def main() -> int:
    url = make_url(settings.database_url)
    db_name = url.database
    if not db_name:
        print("ERROR: DATABASE_URL must include a database name.", file=sys.stderr)
        return 1

    admin_url = url.set(database="postgres")
    print(f"Connecting to PostgreSQL at {admin_url.host}:{admin_url.port} as {admin_url.username}...")

    admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")

    try:
        if database_exists(admin_engine, db_name):
            print(f'Database "{db_name}" already exists.')
        else:
            create_database(admin_engine, db_name)
            print(f'Created database "{db_name}".')
    except Exception as exc:
        print(f"ERROR: Could not create database: {exc}", file=sys.stderr)
        return 1
    finally:
        admin_engine.dispose()

    print("Creating tables...")
    try:
        init_db()
    except Exception as exc:
        print(f"ERROR: Database exists but table setup failed: {exc}", file=sys.stderr)
        return 1

    print("Done. resume_generations table is ready.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

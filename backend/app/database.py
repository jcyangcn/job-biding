from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    pass


def migrate_user_role_column() -> None:
    with engine.begin() as conn:
        col_type = conn.execute(
            text(
                """
                SELECT udt_name
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'users'
                  AND column_name = 'role'
                """
            )
        ).scalar()
        if col_type is None or col_type == "user_role":
            return

        conn.execute(
            text(
                """
                DO $$ BEGIN
                    CREATE TYPE user_role AS ENUM ('admin', 'bidder', 'caller');
                EXCEPTION
                    WHEN duplicate_object THEN NULL;
                END $$;
                """
            )
        )
        conn.execute(
            text(
                """
                UPDATE users
                SET role = 'bidder'
                WHERE role IS NULL OR role NOT IN ('admin', 'bidder', 'caller')
                """
            )
        )
        conn.execute(
            text(
                """
                ALTER TABLE users
                ALTER COLUMN role TYPE user_role
                USING role::user_role
                """
            )
        )


def migrate_job_identity_columns() -> None:
    columns = {
        "city_state": "VARCHAR(255)",
        "zipcode": "VARCHAR(20)",
    }
    with engine.begin() as conn:
        table_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'job_identity'
                """
            )
        ).scalar()
        if not table_exists:
            return

        for column_name, column_type in columns.items():
            exists = conn.execute(
                text(
                    """
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'job_identity'
                      AND column_name = :column_name
                    """
                ),
                {"column_name": column_name},
            ).scalar()
            if exists:
                continue
            conn.execute(
                text(
                    f"ALTER TABLE job_identity ADD COLUMN {column_name} {column_type}"
                )
            )


def migrate_job_application_columns() -> None:
    with engine.begin() as conn:
        table_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'job_application'
                """
            )
        ).scalar()
        if not table_exists:
            return

        exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'job_application'
                  AND column_name = 'job_description'
                """
            )
        ).scalar()
        if exists:
            return

        conn.execute(
            text(
                """
                ALTER TABLE job_application
                ADD COLUMN job_description TEXT NOT NULL DEFAULT ''
                """
            )
        )


def migrate_job_profile_columns() -> None:
    columns = {
        "reference_tag": "VARCHAR(255)",
    }
    with engine.begin() as conn:
        table_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'job_profile'
                """
            )
        ).scalar()
        if not table_exists:
            return

        for column_name, column_type in columns.items():
            exists = conn.execute(
                text(
                    """
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'job_profile'
                      AND column_name = :column_name
                    """
                ),
                {"column_name": column_name},
            ).scalar()
            if exists:
                continue
            conn.execute(
                text(
                    f"ALTER TABLE job_profile ADD COLUMN {column_name} {column_type}"
                )
            )


def init_db() -> None:
    from app import db_models  # noqa: F401
    from app.auth import seed_default_users

    Base.metadata.create_all(bind=engine)
    migrate_user_role_column()
    migrate_job_identity_columns()
    migrate_job_application_columns()
    migrate_job_profile_columns()
    with SessionLocal() as db:
        seed_default_users(db)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

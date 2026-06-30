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

        job_description_exists = conn.execute(
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
        if not job_description_exists:
            conn.execute(
                text(
                    """
                    ALTER TABLE job_application
                    ADD COLUMN job_description TEXT NOT NULL DEFAULT ''
                    """
                )
            )

        applied_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'job_application'
                  AND column_name = 'applied'
                """
            )
        ).scalar()
        if not applied_exists:
            conn.execute(
                text(
                    """
                    ALTER TABLE job_application
                    ADD COLUMN applied BOOLEAN NOT NULL DEFAULT FALSE
                    """
                )
            )
            conn.execute(
                text(
                    """
                    UPDATE job_application
                    SET applied = TRUE
                    WHERE applied_at IS NOT NULL
                    """
                )
            )

        applied_at_nullable = conn.execute(
            text(
                """
                SELECT is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'job_application'
                  AND column_name = 'applied_at'
                """
            )
        ).scalar()
        if applied_at_nullable == "NO":
            conn.execute(
                text("ALTER TABLE job_application ALTER COLUMN applied_at DROP NOT NULL")
            )


def migrate_job_profile_columns() -> None:
    columns = {
        "reference_tag": "VARCHAR(255)",
        "resume_detail": "JSONB NOT NULL DEFAULT '{}'",
        "email_detail": "TEXT NOT NULL DEFAULT ''",
        "phone_detail": "TEXT NOT NULL DEFAULT ''",
        "cover_letter": "TEXT NOT NULL DEFAULT ''",
        "default_resume_stored_name": "VARCHAR(500)",
        "default_resume_original_name": "VARCHAR(500)",
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

        caller_nullable = conn.execute(
            text(
                """
                SELECT is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'job_profile'
                  AND column_name = 'caller_user_id'
                """
            )
        ).scalar()
        if caller_nullable == "NO":
            conn.execute(
                text(
                    "ALTER TABLE job_profile ALTER COLUMN caller_user_id DROP NOT NULL"
                )
            )


def migrate_answers_to_identity() -> None:
    with engine.begin() as conn:
        identity_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'job_identity'
                """
            )
        ).scalar()
        if not identity_exists:
            return

        answers_on_identity = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'job_identity'
                  AND column_name = 'answers'
                """
            )
        ).scalar()
        if not answers_on_identity:
            conn.execute(
                text(
                    "ALTER TABLE job_identity ADD COLUMN answers JSONB NOT NULL DEFAULT '{}'"
                )
            )

        profile_has_answers = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'job_profile'
                  AND column_name = 'answers'
                """
            )
        ).scalar()
        if profile_has_answers:
            conn.execute(
                text(
                    """
                    UPDATE job_identity i
                    SET answers = sub.answers
                    FROM (
                        SELECT DISTINCT ON (identity_id) identity_id, answers
                        FROM job_profile
                        WHERE answers IS NOT NULL AND answers <> '{}'::jsonb
                        ORDER BY identity_id, id
                    ) sub
                    WHERE i.id = sub.identity_id
                      AND (i.answers IS NULL OR i.answers = '{}'::jsonb)
                    """
                )
            )
            conn.execute(text("ALTER TABLE job_profile DROP COLUMN answers"))


def migrate_citizen_columns() -> None:
    with engine.begin() as conn:
        table_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'citizen'
                """
            )
        ).scalar()
        if not table_exists:
            return

        linkedin_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'citizen'
                  AND column_name = 'linkedin'
                """
            )
        ).scalar()
        if not linkedin_exists:
            conn.execute(text("ALTER TABLE citizen ADD COLUMN linkedin VARCHAR(500)"))

        status_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'citizen'
                  AND column_name = 'status'
                """
            )
        ).scalar()

        review_status_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'citizen'
                  AND column_name = 'review_status'
                """
            )
        ).scalar()
        if not review_status_exists:
            conn.execute(
                text(
                    "ALTER TABLE citizen ADD COLUMN review_status VARCHAR(20) NOT NULL DEFAULT 'None'"
                )
            )
            if status_exists:
                conn.execute(
                    text("UPDATE citizen SET review_status = status WHERE status IS NOT NULL")
                )

        reviewer_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'citizen'
                  AND column_name = 'reviewer'
                """
            )
        ).scalar()
        if not reviewer_exists:
            conn.execute(text("ALTER TABLE citizen ADD COLUMN reviewer VARCHAR(255)"))

        reviewed_at_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'citizen'
                  AND column_name = 'reviewed_at'
                """
            )
        ).scalar()
        if not reviewed_at_exists:
            conn.execute(text("ALTER TABLE citizen ADD COLUMN reviewed_at DATE"))

        review_log_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'citizen'
                  AND column_name = 'review_log'
                """
            )
        ).scalar()
        if not review_log_exists:
            conn.execute(
                text("ALTER TABLE citizen ADD COLUMN review_log TEXT NOT NULL DEFAULT ''")
            )

        review_files_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'citizen'
                  AND column_name = 'review_files'
                """
            )
        ).scalar()
        if not review_files_exists:
            conn.execute(
                text("ALTER TABLE citizen ADD COLUMN review_files JSONB NOT NULL DEFAULT '[]'")
            )

        if status_exists:
            conn.execute(text("ALTER TABLE citizen DROP COLUMN status"))


def init_db() -> None:
    from app import db_models  # noqa: F401
    from app.auth import seed_default_users
    from app.config import ensure_storage_dirs

    ensure_storage_dirs()
    Base.metadata.create_all(bind=engine)
    migrate_user_role_column()
    migrate_job_identity_columns()
    migrate_job_application_columns()
    migrate_job_profile_columns()
    migrate_answers_to_identity()
    migrate_citizen_columns()
    with SessionLocal() as db:
        seed_default_users(db)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

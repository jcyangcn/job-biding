from collections.abc import Generator
import json

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    pass


def _ensure_schema_migrations_table(conn) -> None:
    conn.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS app_schema_migrations (
                name VARCHAR(255) PRIMARY KEY,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
    )


def _schema_migration_applied(conn, name: str) -> bool:
    _ensure_schema_migrations_table(conn)
    return bool(
        conn.execute(
            text("SELECT 1 FROM app_schema_migrations WHERE name = :name"),
            {"name": name},
        ).scalar()
    )


def _mark_schema_migration_applied(conn, name: str) -> None:
    conn.execute(
        text(
            """
            INSERT INTO app_schema_migrations (name)
            VALUES (:name)
            ON CONFLICT (name) DO NOTHING
            """
        ),
        {"name": name},
    )


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

        post_id_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'job_application'
                  AND column_name = 'post_id'
                """
            )
        ).scalar()

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
        if not job_description_exists and not post_id_exists:
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

        bidder_user_id_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'job_application'
                  AND column_name = 'bidder_user_id'
                """
            )
        ).scalar()
        if not bidder_user_id_exists:
            conn.execute(
                text(
                    """
                    ALTER TABLE job_application
                    ADD COLUMN bidder_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
                    """
                )
            )

        created_by_user_id_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'job_application'
                  AND column_name = 'created_by_user_id'
                """
            )
        ).scalar()
        if not created_by_user_id_exists:
            conn.execute(
                text(
                    """
                    ALTER TABLE job_application
                    ADD COLUMN created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
                    """
                )
            )
            conn.execute(
                text(
                    """
                    UPDATE job_application
                    SET created_by_user_id = bidder_user_id
                    WHERE created_by_user_id IS NULL AND bidder_user_id IS NOT NULL
                    """
                )
            )

        resume_generation_status_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'job_application'
                  AND column_name = 'resume_generation_status'
                """
            )
        ).scalar()
        if not resume_generation_status_exists:
            conn.execute(
                text(
                    """
                    ALTER TABLE job_application
                    ADD COLUMN resume_generation_status VARCHAR(20)
                    """
                )
            )
            conn.execute(
                text(
                    """
                    UPDATE job_application
                    SET resume_generation_status = 'generated'
                    WHERE resume_generated_id IS NOT NULL
                    """
                )
            )


def repair_application_creator_assignments() -> None:
    """One-time repair for legacy rows that stored the profile bidder instead of creator."""
    migration_name = "repair_application_creator_split_v1"
    with engine.begin() as conn:
        if _schema_migration_applied(conn, migration_name):
            return

        joy_id = conn.execute(
            text("SELECT id FROM users WHERE username = 'joy' LIMIT 1")
        ).scalar()
        ryan_id = conn.execute(
            text("SELECT id FROM users WHERE username = 'ryan' LIMIT 1")
        ).scalar()
        if joy_id is None or ryan_id is None:
            _mark_schema_migration_applied(conn, migration_name)
            return

        conn.execute(
            text(
                """
                WITH ranked AS (
                    SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS row_num
                    FROM job_application
                    WHERE profile_id = 2
                )
                UPDATE job_application AS ja
                SET created_by_user_id = :joy_id,
                    bidder_user_id = :joy_id
                FROM ranked AS r
                WHERE ja.id = r.id
                  AND r.row_num <= 34
                """
            ),
            {"joy_id": joy_id},
        )
        conn.execute(
            text(
                """
                WITH ranked AS (
                    SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS row_num
                    FROM job_application
                    WHERE profile_id = 2
                )
                UPDATE job_application AS ja
                SET created_by_user_id = :ryan_id,
                    bidder_user_id = :ryan_id
                FROM ranked AS r
                WHERE ja.id = r.id
                  AND r.row_num > 34
                """
            ),
            {"ryan_id": ryan_id},
        )
        conn.execute(
            text(
                """
                UPDATE job_application AS ja
                SET created_by_user_id = jp.bidder_user_id,
                    bidder_user_id = jp.bidder_user_id
                FROM job_profile AS jp
                WHERE ja.profile_id = jp.id
                  AND ja.profile_id <> 2
                  AND ja.created_by_user_id IS NULL
                """
            )
        )
        _mark_schema_migration_applied(conn, migration_name)


# Resume PDFs generated while joy created applications (Ryan Cho profile).
JOY_APPLICATION_RESUME_FILENAMES = frozenset(
    {
        "Ryan_Cho_024Eae8.pdf",
        "Ryan_Cho_030tkge.pdf",
        "Ryan_Cho_031abVK.pdf",
        "Ryan_Cho_032UBIT.pdf",
        "Ryan_Cho_033nKoC.pdf",
        "Ryan_Cho_034FTHC.pdf",
        "Ryan_Cho_037ZTQ8.pdf",
        "Ryan_Cho_039sEcz.pdf",
        "Ryan_Cho_043YNbt.pdf",
        "Ryan_Cho_044ptQj.pdf",
        "Ryan_Cho_046LpV5.pdf",
        "Ryan_Cho_047sjLr.pdf",
        "Ryan_Cho_048iFmT.pdf",
        "Ryan_Cho_049BD8F.pdf",
        "Ryan_Cho_051tvqj.pdf",
        "Ryan_Cho_052J4u5.pdf",
        "Ryan_Cho_053ryvs.pdf",
        "Ryan_Cho_054Xw12.pdf",
        "Ryan_Cho_055DpP0.pdf",
        "Ryan_Cho_058IXgO.pdf",
        "Ryan_Cho_058lXgO.pdf",
        "Ryan_Cho_059NbMo.pdf",
        "Ryan_Cho_060rnLz.pdf",
        "Ryan_Cho_061vUYH.pdf",
        "Ryan_Cho_062aKZE.pdf",
        "Ryan_Cho_063GZnm.pdf",
        "Ryan_Cho_064XyW3.pdf",
        "Ryan_Cho_065Y4na.pdf",
        "Ryan_Cho_066Lnp6.pdf",
        "Ryan_Cho_067nJWV.pdf",
        "Ryan_Cho_0284vv5.pdf",
        "Ryan_Cho_0284wV5.pdf",
        "Ryan_Cho_0360Fpa.pdf",
        "Ryan_Cho_0428jHh.pdf",
        "Ryan_Cho_0454cvl.pdf",
        "Ryan_Cho_0577lya.pdf",
        "Ryan_Cho_05645Ak.pdf",
    }
)


def repair_application_creator_by_resume_list() -> None:
    """Assign application creator from joy's known generated-resume PDF list."""
    migration_name = "repair_application_creator_by_resume_v1"
    with engine.begin() as conn:
        if _schema_migration_applied(conn, migration_name):
            return

        joy_id = conn.execute(
            text("SELECT id FROM users WHERE username = 'joy' LIMIT 1")
        ).scalar()
        ryan_id = conn.execute(
            text("SELECT id FROM users WHERE username = 'ryan' LIMIT 1")
        ).scalar()
        if joy_id is None or ryan_id is None:
            _mark_schema_migration_applied(conn, migration_name)
            return

        resume_names = list(JOY_APPLICATION_RESUME_FILENAMES)
        conn.execute(
            text(
                """
                UPDATE job_application AS ja
                SET created_by_user_id = :joy_id,
                    bidder_user_id = :joy_id
                FROM resume_generations AS rg
                WHERE ja.resume_generated_id = rg.id
                  AND ja.profile_id = 2
                  AND regexp_replace(replace(rg.pdf_path, E'\\\\', '/'), '^.*/', '') = ANY(:resume_names)
                """
            ),
            {"joy_id": joy_id, "resume_names": resume_names},
        )
        conn.execute(
            text(
                """
                UPDATE job_application AS ja
                SET created_by_user_id = :ryan_id,
                    bidder_user_id = :ryan_id
                FROM resume_generations AS rg
                WHERE ja.resume_generated_id = rg.id
                  AND ja.profile_id = 2
                  AND regexp_replace(replace(rg.pdf_path, E'\\\\', '/'), '^.*/', '') <> ALL(:resume_names)
                """
            ),
            {"ryan_id": ryan_id, "resume_names": resume_names},
        )
        conn.execute(
            text(
                """
                UPDATE job_application
                SET created_by_user_id = :ryan_id,
                    bidder_user_id = :ryan_id
                WHERE profile_id = 2
                  AND resume_generated_id IS NULL
                """
            ),
            {"ryan_id": ryan_id},
        )
        conn.execute(
            text(
                """
                UPDATE job_application AS ja
                SET created_by_user_id = jp.bidder_user_id,
                    bidder_user_id = jp.bidder_user_id
                FROM job_profile AS jp
                WHERE ja.profile_id = jp.id
                  AND ja.profile_id <> 2
                """
            )
        )
        _mark_schema_migration_applied(conn, migration_name)


def migrate_job_profile_columns() -> None:
    columns = {
        "reference_tag": "VARCHAR(255)",
        "resume_detail": "JSONB NOT NULL DEFAULT '{}'",
        "email_detail": "TEXT NOT NULL DEFAULT ''",
        "phone_detail": "TEXT NOT NULL DEFAULT ''",
        "cover_letter": "TEXT NOT NULL DEFAULT ''",
        "default_resume_stored_name": "VARCHAR(500)",
        "default_resume_original_name": "VARCHAR(500)",
        "proxy_detail": "TEXT NOT NULL DEFAULT ''",
        "resume_from_ai": "BOOLEAN NOT NULL DEFAULT TRUE",
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

        resume_from_ai_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'job_profile'
                  AND column_name = 'resume_from_ai'
                """
            )
        ).scalar()
        if resume_from_ai_exists:
            conn.execute(
                text(
                    "ALTER TABLE job_profile ALTER COLUMN resume_from_ai SET DEFAULT TRUE"
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


def migrate_profile_bidder_user_ids() -> None:
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

        new_column_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'job_profile'
                  AND column_name = 'bidder_user_ids'
                """
            )
        ).scalar()
        if new_column_exists:
            return

        old_column_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'job_profile'
                  AND column_name = 'bidder_user_id'
                """
            )
        ).scalar()

        conn.execute(
            text(
                """
                ALTER TABLE job_profile
                ADD COLUMN bidder_user_ids INTEGER[] NOT NULL DEFAULT '{}'
                """
            )
        )

        if old_column_exists:
            conn.execute(
                text(
                    """
                    UPDATE job_profile
                    SET bidder_user_ids = ARRAY[bidder_user_id]
                    WHERE bidder_user_id IS NOT NULL
                    """
                )
            )
            conn.execute(
                text(
                    """
                    ALTER TABLE job_profile
                    DROP CONSTRAINT IF EXISTS job_profile_bidder_user_id_fkey
                    """
                )
            )
            conn.execute(text("ALTER TABLE job_profile DROP COLUMN bidder_user_id"))


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


def migrate_linkedin_account_columns() -> None:
    with engine.begin() as conn:
        table_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'linkedin_account'
                """
            )
        ).scalar()
        if not table_exists:
            return

        title_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'linkedin_account'
                  AND column_name = 'title'
                """
            )
        ).scalar()
        if not title_exists:
            conn.execute(
                text(
                    "ALTER TABLE linkedin_account ADD COLUMN title VARCHAR(255) NOT NULL DEFAULT ''"
                )
            )

        conn.execute(
            text(
                """
                UPDATE linkedin_account
                SET title = email
                WHERE (title IS NULL OR title = '')
                  AND email IS NOT NULL
                  AND email <> ''
                """
            )
        )


def migrate_linkedin_status_values() -> None:
    with engine.begin() as conn:
        table_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'linkedin_account'
                """
            )
        ).scalar()
        if not table_exists:
            return

        conn.execute(
            text(
                """
                UPDATE linkedin_account
                SET status = 'Sold'
                WHERE status = 'Secured'
                """
            )
        )


def migrate_linkedin_country_column() -> None:
    with engine.begin() as conn:
        table_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'linkedin_account'
                """
            )
        ).scalar()
        if not table_exists:
            return

        country_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'linkedin_account'
                  AND column_name = 'country'
                """
            )
        ).scalar()
        if not country_exists:
            conn.execute(
                text(
                    "ALTER TABLE linkedin_account ADD COLUMN country VARCHAR(100) NOT NULL DEFAULT 'United States'"
                )
            )


def migrate_linkedin_created_at_column() -> None:
    with engine.begin() as conn:
        table_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'linkedin_account'
                """
            )
        ).scalar()
        if not table_exists:
            return

        column_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'linkedin_account'
                  AND column_name = 'linkedin_created_at'
                """
            )
        ).scalar()
        if not column_exists:
            conn.execute(
                text("ALTER TABLE linkedin_account ADD COLUMN linkedin_created_at DATE")
            )


def migrate_skills_columns() -> None:
    migration_name = "skills_weight_nullable_text_fields_v1"
    with engine.begin() as conn:
        if _schema_migration_applied(conn, migration_name):
            return

        skills_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'skills'
                """
            )
        ).scalar()
        if not skills_exists:
            _mark_schema_migration_applied(conn, migration_name)
            return

        weight_nullable = conn.execute(
            text(
                """
                SELECT is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'skills'
                  AND column_name = 'weight'
                """
            )
        ).scalar()
        if weight_nullable == "NO":
            conn.execute(text("ALTER TABLE skills ALTER COLUMN weight DROP NOT NULL"))

        for column_name in ("field", "keyword"):
            data_type = conn.execute(
                text(
                    """
                    SELECT data_type
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'skills'
                      AND column_name = :column_name
                    """
                ),
                {"column_name": column_name},
            ).scalar()
            if data_type and data_type.lower() != "text":
                conn.execute(
                    text(f"ALTER TABLE skills ALTER COLUMN {column_name} TYPE TEXT")
                )

        _mark_schema_migration_applied(conn, migration_name)


def migrate_job_skills_table() -> None:
    """Create job_skills (one row per keyword) and migrate legacy skills rows."""
    migration_name = "job_skills_table_v1"
    with engine.begin() as conn:
        if _schema_migration_applied(conn, migration_name):
            return

        job_skills_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'job_skills'
                """
            )
        ).scalar()
        if not job_skills_exists:
            conn.execute(
                text(
                    """
                    CREATE TABLE job_skills (
                        id SERIAL PRIMARY KEY,
                        role VARCHAR(255) NOT NULL,
                        field VARCHAR(255) NOT NULL,
                        keyword VARCHAR(255) NOT NULL,
                        weight DOUBLE PRECISION NOT NULL DEFAULT 1
                    )
                    """
                )
            )
            conn.execute(
                text(
                    """
                    CREATE INDEX IF NOT EXISTS idx_job_skills_role
                    ON job_skills (role)
                    """
                )
            )
            conn.execute(
                text(
                    """
                    CREATE INDEX IF NOT EXISTS idx_job_skills_field
                    ON job_skills (field)
                    """
                )
            )
            conn.execute(
                text(
                    """
                    CREATE UNIQUE INDEX IF NOT EXISTS idx_job_skills_role_field_keyword
                    ON job_skills (role, field, keyword)
                    """
                )
            )

    from app.db_models import JobSkill
    from app.job_vector import parse_keyword_weight_entries

    with engine.connect() as conn:
        skills_exists = bool(
            conn.execute(
                text(
                    """
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = 'skills'
                    """
                )
            ).scalar()
        )

    if skills_exists:
        with SessionLocal() as db:
            legacy_rows = db.execute(
                text("SELECT id, role, field, keyword, weight FROM skills ORDER BY id ASC")
            ).all()
            existing_keys = {
                (
                    (row.role or "").strip().lower(),
                    (row.field or "").strip().lower(),
                    (row.keyword or "").strip().lower(),
                )
                for row in db.execute(
                    text("SELECT role, field, keyword FROM job_skills")
                ).all()
            }

            for legacy in legacy_rows:
                role = (legacy.role or "").strip()
                field = (legacy.field or "").strip() or "General"
                default_weight = float(legacy.weight if legacy.weight is not None else 1.0)
                entries = parse_keyword_weight_entries(
                    legacy.keyword,
                    default_weight=default_weight,
                )
                if not entries and (legacy.keyword or "").strip():
                    entries = [(str(legacy.keyword).strip(), default_weight)]

                for keyword, weight in entries:
                    keyword_text = (keyword or "").strip()
                    if not keyword_text:
                        continue
                    key = (role.lower(), field.lower(), keyword_text.lower())
                    if key in existing_keys:
                        continue
                    db.add(
                        JobSkill(
                            role=role,
                            field=field,
                            keyword=keyword_text,
                            weight=float(weight if weight is not None else 1.0),
                        )
                    )
                    existing_keys.add(key)

            db.commit()

        with engine.begin() as conn:
            conn.execute(text("DROP TABLE IF EXISTS skills CASCADE"))

    with engine.begin() as conn:
        _mark_schema_migration_applied(conn, migration_name)


def migrate_job_posts_table() -> None:
    migration_name = "job_posts_table_v2"
    with engine.begin() as conn:
        if _schema_migration_applied(conn, migration_name):
            return

        companies_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'companies'
                """
            )
        ).scalar()
        job_posts_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'job_posts'
                """
            )
        ).scalar()

        if companies_exists and not job_posts_exists:
            conn.execute(text("ALTER TABLE companies RENAME TO job_posts"))
            conn.execute(
                text(
                    "ALTER INDEX IF EXISTS idx_companies_company "
                    "RENAME TO idx_job_posts_company"
                )
            )
            job_posts_exists = True

        if not job_posts_exists:
            conn.execute(
                text(
                    """
                    CREATE TABLE job_posts (
                        id SERIAL PRIMARY KEY,
                        company VARCHAR(255) NOT NULL,
                        role VARCHAR(255) NOT NULL DEFAULT '',
                        url VARCHAR(1000) NOT NULL DEFAULT '',
                        job_description TEXT NOT NULL DEFAULT '',
                        job_vector JSONB NOT NULL DEFAULT '[]',
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    )
                    """
                )
            )
            conn.execute(
                text(
                    """
                    CREATE INDEX IF NOT EXISTS idx_job_posts_company
                    ON job_posts (company)
                    """
                )
            )

        role_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'job_posts'
                  AND column_name = 'role'
                """
            )
        ).scalar()
        if not role_exists:
            conn.execute(
                text(
                    "ALTER TABLE job_posts ADD COLUMN role VARCHAR(255) NOT NULL DEFAULT ''"
                )
            )

        conn.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS idx_job_posts_company
                ON job_posts (company)
                """
            )
        )
        _mark_schema_migration_applied(conn, migration_name)


def migrate_job_posts_merge_legacy_companies() -> None:
    """Copy rows from legacy companies table into job_posts, then drop companies."""
    migration_name = "job_posts_merge_companies_v1"
    with engine.begin() as conn:
        if _schema_migration_applied(conn, migration_name):
            return

        companies_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'companies'
                """
            )
        ).scalar()
        if not companies_exists:
            _mark_schema_migration_applied(conn, migration_name)
            return

        job_posts_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'job_posts'
                """
            )
        ).scalar()
        if job_posts_exists:
            conn.execute(
                text(
                    """
                    INSERT INTO job_posts (company, role, url, job_description, job_vector, created_at)
                    SELECT
                        company,
                        '' AS role,
                        url,
                        job_description,
                        job_vector,
                        created_at
                    FROM companies c
                    WHERE NOT EXISTS (
                        SELECT 1
                        FROM job_posts jp
                        WHERE jp.company = c.company
                          AND jp.url = c.url
                          AND jp.job_description = c.job_description
                    )
                    """
                )
            )

        conn.execute(text("DROP TABLE IF EXISTS companies CASCADE"))
        _mark_schema_migration_applied(conn, migration_name)


def backfill_job_post_vectors() -> None:
    """Recompute stored job_vector values using each post's role and description."""
    migration_name = "job_posts_recompute_vectors_v1"
    with engine.begin() as conn:
        if _schema_migration_applied(conn, migration_name):
            return

        job_posts_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'job_posts'
                """
            )
        ).scalar()
        if not job_posts_exists:
            _mark_schema_migration_applied(conn, migration_name)
            return

    from app.job_post_service import recompute_all_job_post_vectors

    with SessionLocal() as db:
        recompute_all_job_post_vectors(db)

    with engine.begin() as conn:
        _mark_schema_migration_applied(conn, migration_name)


def migrate_companies_table() -> None:
    """Legacy migration — superseded by migrate_job_posts_table."""
    migrate_job_posts_table()


def migrate_job_application_job_vector() -> None:
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

        post_id_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'job_application'
                  AND column_name = 'post_id'
                """
            )
        ).scalar()
        if post_id_exists:
            return

        exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'job_application'
                  AND column_name = 'job_vector'
                """
            )
        ).scalar()
        if not exists:
            conn.execute(
                text(
                    """
                    ALTER TABLE job_application
                    ADD COLUMN job_vector JSONB NOT NULL DEFAULT '[]'
                    """
                )
            )


def migrate_job_application_post_id() -> None:
    """Move job details from job_application into job_posts; keep only post_id on applications."""
    migration_name = "job_application_post_id_v1"
    with engine.begin() as conn:
        if _schema_migration_applied(conn, migration_name):
            return

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
            _mark_schema_migration_applied(conn, migration_name)
            return

        job_posts_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'job_posts'
                """
            )
        ).scalar()
        if not job_posts_exists:
            _mark_schema_migration_applied(conn, migration_name)
            return

        def column_exists(column_name: str) -> bool:
            return bool(
                conn.execute(
                    text(
                        """
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = 'job_application'
                          AND column_name = :column_name
                        """
                    ),
                    {"column_name": column_name},
                ).scalar()
            )

        if not column_exists("post_id"):
            conn.execute(
                text(
                    """
                    ALTER TABLE job_application
                    ADD COLUMN post_id INTEGER REFERENCES job_posts(id) ON DELETE RESTRICT
                    """
                )
            )

        legacy_columns = column_exists("role") and column_exists("company")
        if legacy_columns:
            rows = conn.execute(
                text(
                    """
                    SELECT id, role, company, link, job_description, job_vector, created_at
                    FROM job_application
                    WHERE post_id IS NULL
                    """
                )
            ).fetchall()
            for row in rows:
                vector = row.job_vector
                if vector is None:
                    vector_json = "[]"
                elif isinstance(vector, str):
                    vector_json = vector.strip() or "[]"
                else:
                    vector_json = json.dumps(list(vector))
                post_id = conn.execute(
                    text(
                        """
                        INSERT INTO job_posts (
                            company, role, url, job_description, job_vector, created_at
                        )
                        VALUES (
                            :company, :role, :url, :job_description,
                            CAST(:job_vector AS jsonb), :created_at
                        )
                        RETURNING id
                        """
                    ),
                    {
                        "company": row.company or "",
                        "role": row.role or "",
                        "url": row.link or "",
                        "job_description": row.job_description or "",
                        "job_vector": vector_json,
                        "created_at": row.created_at,
                    },
                ).scalar_one()
                conn.execute(
                    text(
                        """
                        UPDATE job_application
                        SET post_id = :post_id
                        WHERE id = :application_id
                        """
                    ),
                    {"post_id": post_id, "application_id": row.id},
                )

        if column_exists("post_id"):
            conn.execute(
                text(
                    """
                    ALTER TABLE job_application
                    ALTER COLUMN post_id SET NOT NULL
                    """
                )
            )

        for column_name in ("role", "company", "link", "job_description", "job_vector"):
            if column_exists(column_name):
                conn.execute(
                    text(f"ALTER TABLE job_application DROP COLUMN {column_name}")
                )

        conn.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS idx_job_application_post_id
                ON job_application (post_id)
                """
            )
        )

        _mark_schema_migration_applied(conn, migration_name)


def migrate_job_application_drop_legacy_job_fields() -> None:
    """Remove job detail columns from job_application when post_id is in use."""
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

        def column_exists(column_name: str) -> bool:
            return bool(
                conn.execute(
                    text(
                        """
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = 'job_application'
                          AND column_name = :column_name
                        """
                    ),
                    {"column_name": column_name},
                ).scalar()
            )

        if not column_exists("post_id"):
            return

        for column_name in ("role", "company", "link", "job_description", "job_vector"):
            if column_exists(column_name):
                conn.execute(
                    text(f"ALTER TABLE job_application DROP COLUMN {column_name}")
                )


def migrate_job_application_applied_evidence_fields() -> None:
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

        def column_exists(column_name: str) -> bool:
            return bool(
                conn.execute(
                    text(
                        """
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = 'job_application'
                          AND column_name = :column_name
                        """
                    ),
                    {"column_name": column_name},
                ).scalar()
            )

        if not column_exists("success_link"):
            conn.execute(
                text(
                    """
                    ALTER TABLE job_application
                    ADD COLUMN success_link VARCHAR(1000)
                    """
                )
            )

        if not column_exists("applied_screenshot"):
            conn.execute(
                text(
                    """
                    ALTER TABLE job_application
                    ADD COLUMN applied_screenshot JSONB
                    """
                )
            )


def migrate_resume_generations_post_id() -> None:
    """Replace job_details on resume_generations with post_id referencing job_posts."""
    migration_name = "resume_generations_post_id_v1"
    with engine.begin() as conn:
        if _schema_migration_applied(conn, migration_name):
            return

        table_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'resume_generations'
                """
            )
        ).scalar()
        if not table_exists:
            _mark_schema_migration_applied(conn, migration_name)
            return

        posts_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'job_posts'
                """
            )
        ).scalar()
        if not posts_exists:
            _mark_schema_migration_applied(conn, migration_name)
            return

        def column_exists(column_name: str) -> bool:
            return bool(
                conn.execute(
                    text(
                        """
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = 'resume_generations'
                          AND column_name = :column_name
                        """
                    ),
                    {"column_name": column_name},
                ).scalar()
            )

        if not column_exists("post_id"):
            conn.execute(
                text(
                    """
                    ALTER TABLE resume_generations
                    ADD COLUMN post_id INTEGER REFERENCES job_posts(id) ON DELETE RESTRICT
                    """
                )
            )

        if column_exists("job_details") and column_exists("post_id"):
            rows = conn.execute(
                text(
                    """
                    SELECT id, job_details
                    FROM resume_generations
                    WHERE post_id IS NULL
                    ORDER BY id ASC
                    """
                )
            ).mappings().all()

            for row in rows:
                generation_id = row["id"]
                job_details = (row["job_details"] or "").strip()

                linked_post_id = conn.execute(
                    text(
                        """
                        SELECT ja.post_id
                        FROM job_application AS ja
                        WHERE ja.resume_generated_id = :generation_id
                          AND ja.post_id IS NOT NULL
                        ORDER BY ja.id ASC
                        LIMIT 1
                        """
                    ),
                    {"generation_id": generation_id},
                ).scalar()

                if linked_post_id is None and job_details:
                    linked_post_id = conn.execute(
                        text(
                            """
                            SELECT id
                            FROM job_posts
                            WHERE job_description = :job_details
                            ORDER BY id ASC
                            LIMIT 1
                            """
                        ),
                        {"job_details": job_details},
                    ).scalar()

                if linked_post_id is None:
                    linked_post_id = conn.execute(
                        text(
                            """
                            INSERT INTO job_posts (company, role, url, job_description, job_vector)
                            VALUES ('Legacy import', '', '', :job_details, '[]'::jsonb)
                            RETURNING id
                            """
                        ),
                        {"job_details": job_details},
                    ).scalar()

                conn.execute(
                    text(
                        """
                        UPDATE resume_generations
                        SET post_id = :post_id
                        WHERE id = :generation_id
                        """
                    ),
                    {"post_id": linked_post_id, "generation_id": generation_id},
                )

        if column_exists("post_id"):
            conn.execute(
                text(
                    """
                    ALTER TABLE resume_generations
                    ALTER COLUMN post_id SET NOT NULL
                    """
                )
            )
            conn.execute(
                text(
                    """
                    CREATE INDEX IF NOT EXISTS idx_resume_generations_post_id
                    ON resume_generations (post_id)
                    """
                )
            )

        if column_exists("job_details"):
            conn.execute(text("ALTER TABLE resume_generations DROP COLUMN job_details"))

        _mark_schema_migration_applied(conn, migration_name)


def migrate_resume_generations_structure() -> None:
    """Replace profile JSONB with profile_id, resume_content, and resume_vector."""
    migration_name = "resume_generations_profile_id_content_vector_v1"
    with engine.begin() as conn:
        if _schema_migration_applied(conn, migration_name):
            return

        table_exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'resume_generations'
                """
            )
        ).scalar()
        if not table_exists:
            _mark_schema_migration_applied(conn, migration_name)
            return

        def column_exists(column_name: str) -> bool:
            return bool(
                conn.execute(
                    text(
                        """
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = 'resume_generations'
                          AND column_name = :column_name
                        """
                    ),
                    {"column_name": column_name},
                ).scalar()
            )

        if not column_exists("profile_id"):
            conn.execute(
                text(
                    """
                    ALTER TABLE resume_generations
                    ADD COLUMN profile_id INTEGER
                    REFERENCES job_profile(id) ON DELETE SET NULL
                    """
                )
            )

        if not column_exists("resume_content"):
            conn.execute(
                text(
                    """
                    ALTER TABLE resume_generations
                    ADD COLUMN resume_content JSONB NOT NULL DEFAULT '{}'
                    """
                )
            )

        if not column_exists("resume_vector"):
            conn.execute(
                text(
                    """
                    ALTER TABLE resume_generations
                    ADD COLUMN resume_vector JSONB NOT NULL DEFAULT '[]'
                    """
                )
            )

        if column_exists("profile"):
            conn.execute(text("ALTER TABLE resume_generations DROP COLUMN profile"))

        _mark_schema_migration_applied(conn, migration_name)


def migrate_clear_bidder_on_unapplied_applications() -> None:
    """Bidder is only recorded once an application is actually applied.

    Older rows stamped ``bidder_user_id`` at assign/create time. Clear it for
    any application that was never marked as applied so the Bidder column
    reflects real applicants only.
    """
    migration_name = "clear_bidder_on_unapplied_v1"
    with engine.begin() as conn:
        if _schema_migration_applied(conn, migration_name):
            return
        conn.execute(
            text(
                """
                UPDATE job_application
                SET bidder_user_id = NULL
                WHERE applied IS NOT TRUE
                  AND bidder_user_id IS NOT NULL
                """
            )
        )
        _mark_schema_migration_applied(conn, migration_name)


def init_db() -> None:
    from app import db_models  # noqa: F401
    from app.auth import seed_default_users
    from app.config import ensure_storage_dirs
    from app.seed_test_data import seed_test_identity_profile

    ensure_storage_dirs()
    Base.metadata.create_all(bind=engine)
    migrate_user_role_column()
    migrate_job_identity_columns()
    migrate_job_application_columns()
    migrate_job_application_job_vector()
    migrate_resume_generations_structure()
    repair_application_creator_assignments()
    repair_application_creator_by_resume_list()
    migrate_job_profile_columns()
    migrate_profile_bidder_user_ids()
    migrate_answers_to_identity()
    migrate_citizen_columns()
    migrate_linkedin_account_columns()
    migrate_linkedin_status_values()
    migrate_linkedin_country_column()
    migrate_linkedin_created_at_column()
    migrate_skills_columns()
    migrate_job_skills_table()
    migrate_job_posts_table()
    migrate_job_posts_merge_legacy_companies()
    backfill_job_post_vectors()
    migrate_job_application_post_id()
    migrate_job_application_drop_legacy_job_fields()
    migrate_job_application_applied_evidence_fields()
    migrate_resume_generations_post_id()
    migrate_clear_bidder_on_unapplied_applications()
    with SessionLocal() as db:
        seed_default_users(db)
        seed_test_identity_profile(db)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

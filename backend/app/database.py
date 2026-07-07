from collections.abc import Generator

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
    repair_application_creator_assignments()
    repair_application_creator_by_resume_list()
    migrate_job_profile_columns()
    migrate_profile_bidder_user_ids()
    migrate_answers_to_identity()
    migrate_citizen_columns()
    with SessionLocal() as db:
        seed_default_users(db)
        seed_test_identity_profile(db)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

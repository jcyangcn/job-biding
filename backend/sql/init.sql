-- Optional manual setup (tables are also created on app startup)
CREATE TABLE IF NOT EXISTS resume_generations (
    id SERIAL PRIMARY KEY,
    job_details TEXT NOT NULL,
    profile JSONB NOT NULL,
    pdf_path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resume_generations_created_at
    ON resume_generations (created_at DESC);

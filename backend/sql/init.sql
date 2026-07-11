-- Optional manual setup (tables are also created on app startup)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'bidder', 'caller');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'bidder',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_identity (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    country VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    city_state VARCHAR(255),
    zipcode VARCHAR(20),
    linkedin VARCHAR(500),
    github VARCHAR(500),
    dob DATE,
    ssn VARCHAR(50),
    answers JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_profile (
    id SERIAL PRIMARY KEY,
    identity_id INTEGER NOT NULL REFERENCES job_identity(id) ON DELETE RESTRICT,
    bidder_user_ids INTEGER[] NOT NULL DEFAULT '{}',
    caller_user_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
    roles VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    email_password VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email_detail TEXT NOT NULL DEFAULT '',
    phone_detail TEXT NOT NULL DEFAULT '',
    cover_letter TEXT NOT NULL DEFAULT '',
    default_resume_stored_name VARCHAR(500),
    default_resume_original_name VARCHAR(500),
    proxy VARCHAR(500),
    proxy_detail TEXT NOT NULL DEFAULT '',
    resume_from_ai BOOLEAN NOT NULL DEFAULT TRUE,
    reference_tag VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    resume_detail JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resume_generations (
    id SERIAL PRIMARY KEY,
    job_details TEXT NOT NULL,
    profile_id INTEGER REFERENCES job_profile(id) ON DELETE SET NULL,
    resume_content JSONB NOT NULL DEFAULT '{}',
    resume_vector JSONB NOT NULL DEFAULT '[]',
    pdf_path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resume_generations_created_at
    ON resume_generations (created_at DESC);

CREATE TABLE IF NOT EXISTS job_application (
    id SERIAL PRIMARY KEY,
    profile_id INTEGER NOT NULL REFERENCES job_profile(id) ON DELETE RESTRICT,
    role VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    link VARCHAR(1000) NOT NULL,
    job_description TEXT NOT NULL DEFAULT '',
    job_vector JSONB NOT NULL DEFAULT '[]',
    resume_generated_id INTEGER REFERENCES resume_generations(id) ON DELETE SET NULL,
    resume_online_link VARCHAR(1000),
    resume_generation_status VARCHAR(20),
    applied BOOLEAN NOT NULL DEFAULT FALSE,
    applied_at TIMESTAMPTZ,
    bidder_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_progression_email (
    id SERIAL PRIMARY KEY,
    profile_id INTEGER NOT NULL REFERENCES job_profile(id) ON DELETE RESTRICT,
    reference_no VARCHAR(255) NOT NULL UNIQUE,
    company VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    email_link VARCHAR(1000) NOT NULL,
    email_date TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL,
    log TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS citizen (
    id SERIAL PRIMARY KEY,
    country VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    linkedin VARCHAR(500),
    review_status VARCHAR(20) NOT NULL DEFAULT 'None',
    reviewer VARCHAR(255),
    reviewed_at DATE,
    review_log TEXT NOT NULL DEFAULT '',
    details TEXT NOT NULL DEFAULT '',
    images JSONB NOT NULL DEFAULT '[]',
    review_files JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS linkedin_account (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL DEFAULT '',
    country VARCHAR(100) NOT NULL DEFAULT 'United States',
    email VARCHAR(255) NOT NULL DEFAULT '',
    email_password VARCHAR(255) NOT NULL DEFAULT '',
    email_recovery_email VARCHAR(255),
    email_secured BOOLEAN NOT NULL DEFAULT FALSE,
    recovery_email VARCHAR(255),
    recovery_email_password VARCHAR(255),
    recovery_email_recovery VARCHAR(500),
    linkedin_email VARCHAR(255),
    linkedin_password VARCHAR(255),
    linkedin_link VARCHAR(1000),
    second_email VARCHAR(255),
    linkedin_secured BOOLEAN NOT NULL DEFAULT FALSE,
    browser VARCHAR(255),
    profile_no INTEGER,
    provider VARCHAR(50),
    order_id VARCHAR(100),
    proxy_info TEXT,
    proxy_expired_by DATE,
    purchased_from VARCHAR(255),
    renting_to VARCHAR(255),
    renting_by DATE,
    linkedin_created_at DATE,
    image JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending',
    need_action VARCHAR(30) NOT NULL DEFAULT 'None',
    logs TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS skills (
    id SERIAL PRIMARY KEY,
    role VARCHAR(255) NOT NULL,
    field TEXT NOT NULL DEFAULT '',
    keyword TEXT NOT NULL DEFAULT '',
    weight DOUBLE PRECISION DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skills_role ON skills (role);
CREATE INDEX IF NOT EXISTS idx_skills_field ON skills (field);

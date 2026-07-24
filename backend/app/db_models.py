from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Enum, Float, ForeignKey, Integer, String, Text, func, text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.user_roles import UserRole


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", native_enum=True),
        nullable=False,
        default=UserRole.bidder,
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


class ResumeGeneration(Base):
    __tablename__ = "resume_generations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    post_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("job_posts.id", ondelete="RESTRICT"), nullable=False
    )
    profile_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("job_profile.id", ondelete="SET NULL"), nullable=True
    )
    resume_content: Mapped[dict] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'")
    )
    resume_vector: Mapped[list] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'")
    )
    pdf_path: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    job_post: Mapped["JobPost"] = relationship("JobPost", lazy="select")


class JobIdentity(Base):
    __tablename__ = "job_identity"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    country: Mapped[str] = mapped_column(String(100), nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    city_state: Mapped[str | None] = mapped_column(String(255), nullable=True)
    zipcode: Mapped[str | None] = mapped_column(String(20), nullable=True)
    linkedin: Mapped[str | None] = mapped_column(String(500), nullable=True)
    github: Mapped[str | None] = mapped_column(String(500), nullable=True)
    dob: Mapped[date | None] = mapped_column(Date, nullable=True)
    ssn: Mapped[str | None] = mapped_column(String(50), nullable=True)
    answers: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


class JobProfile(Base):
    __tablename__ = "job_profile"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    identity_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("job_identity.id", ondelete="RESTRICT"), nullable=False
    )
    bidder_user_ids: Mapped[list[int]] = mapped_column(
        ARRAY(Integer),
        nullable=False,
        server_default=text("'{}'"),
    )
    caller_user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=True
    )
    roles: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    email_password: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), nullable=False)
    email_detail: Mapped[str] = mapped_column(
        Text, nullable=False, default="", server_default=text("''")
    )
    phone_detail: Mapped[str] = mapped_column(
        Text, nullable=False, default="", server_default=text("''")
    )
    cover_letter: Mapped[str] = mapped_column(
        Text, nullable=False, default="", server_default=text("''")
    )
    default_resume_stored_name: Mapped[str | None] = mapped_column(String(500), nullable=True)
    default_resume_original_name: Mapped[str | None] = mapped_column(String(500), nullable=True)
    proxy: Mapped[str | None] = mapped_column(String(500), nullable=True)
    proxy_detail: Mapped[str] = mapped_column(
        Text, nullable=False, default="", server_default=text("''")
    )
    resume_from_ai: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    resume_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default=text("0")
    )
    reference_tag: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    resume_detail: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


class JobProgressionEmail(Base):
    __tablename__ = "job_progression_email"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    profile_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("job_profile.id", ondelete="RESTRICT"), nullable=False
    )
    reference_no: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    company: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    email_link: Mapped[str] = mapped_column(String(1000), nullable=False)
    email_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    log: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


class JobApplication(Base):
    __tablename__ = "job_application"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    profile_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("job_profile.id", ondelete="RESTRICT"), nullable=False
    )
    post_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("job_posts.id", ondelete="RESTRICT"), nullable=False
    )
    resume_generated_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("resume_generations.id", ondelete="SET NULL"), nullable=True
    )
    resume_online_link: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    resume_generation_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    resume_distance: Mapped[float | None] = mapped_column(Float, nullable=True)
    applied: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    approved: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    applied_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    success_link: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    applied_screenshot: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    bidder_user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_by_user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    job_post: Mapped["JobPost"] = relationship("JobPost", lazy="select")


class Citizen(Base):
    __tablename__ = "citizen"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    country: Mapped[str] = mapped_column(String(100), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    gender: Mapped[str] = mapped_column(
        String(10), nullable=False, default="Male", server_default=text("'Male'")
    )
    found_citizen: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    linkedin: Mapped[str | None] = mapped_column(String(500), nullable=True)
    review_status: Mapped[str] = mapped_column(String(20), nullable=False, default="None")
    reviewer: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reviewed_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    review_log: Mapped[str] = mapped_column(Text, nullable=False, default="")
    details: Mapped[str] = mapped_column(Text, nullable=False, default="")
    images: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    review_files: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class LinkedInAccount(Base):
    __tablename__ = "linkedin_account"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, server_default="", default="")
    country: Mapped[str] = mapped_column(
        String(100), nullable=False, server_default="United States", default="United States"
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    email_password: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    email_recovery_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email_secured: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    recovery_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    recovery_email_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    recovery_email_recovery: Mapped[str | None] = mapped_column(String(500), nullable=True)
    linkedin_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    linkedin_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    linkedin_link: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    second_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    linkedin_secured: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    browser: Mapped[str | None] = mapped_column(String(255), nullable=True)
    profile_no: Mapped[int | None] = mapped_column(Integer, nullable=True)
    provider: Mapped[str | None] = mapped_column(String(50), nullable=True)
    order_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    proxy_info: Mapped[str | None] = mapped_column(Text, nullable=True)
    proxy_expired_by: Mapped[date | None] = mapped_column(Date, nullable=True)
    purchased_from: Mapped[str | None] = mapped_column(String(255), nullable=True)
    renting_to: Mapped[str | None] = mapped_column(String(255), nullable=True)
    renting_by: Mapped[date | None] = mapped_column(Date, nullable=True)
    linkedin_created_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    image: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="Pending")
    need_action: Mapped[str] = mapped_column(String(30), nullable=False, server_default="None")
    logs: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class JobSkill(Base):
    __tablename__ = "job_skills"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    role: Mapped[str] = mapped_column(String(255), nullable=False)
    field: Mapped[str] = mapped_column(String(255), nullable=False)
    keyword: Mapped[str] = mapped_column(String(255), nullable=False)
    weight: Mapped[float] = mapped_column(Float, nullable=False, default=1.0, server_default=text("1"))


class DesktopUsageSession(Base):
    __tablename__ = "desktop_usage_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    client_session_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    app_name: Mapped[str] = mapped_column(String(100), nullable=False, default="HuntFlow")
    edition: Mapped[str] = mapped_column(String(50), nullable=False, default="bidder")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    client_updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    active_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default=text("0"))
    focused_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default=text("0"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class DesktopScreenshot(Base):
    __tablename__ = "desktop_screenshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    client_file_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    client_session_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    reason: Mapped[str] = mapped_column(String(50), nullable=False, default="interval")
    screen_index: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default=text("1"))
    screen_name: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    relative_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default=text("0"))
    captured_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


class JobPost(Base):
    __tablename__ = "job_posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(255), nullable=False, default="", server_default=text("''"))
    url: Mapped[str] = mapped_column(String(1000), nullable=False, default="", server_default=text("''"))
    job_description: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default=text("''"))
    job_vector: Mapped[list] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

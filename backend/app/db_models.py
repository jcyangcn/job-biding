from datetime import datetime

from sqlalchemy import DateTime, Integer, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ResumeGeneration(Base):
    __tablename__ = "resume_generations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_details: Mapped[str] = mapped_column(Text, nullable=False)
    profile: Mapped[dict] = mapped_column(JSONB, nullable=False)
    pdf_path: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

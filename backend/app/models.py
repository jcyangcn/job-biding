from typing import Literal
from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class ProfileJob(BaseModel):
    company: str
    city: str
    role: str
    mode: Literal["Remote", "Onsite", "Hybrid"]
    period: str


class ProfileEducation(BaseModel):
    school: str
    degree: str
    period: str


class Profile(BaseModel):
    name: str
    title: str
    email: str
    phone: str
    location: str
    linkedin: str
    portfolio: str = ""
    experience: list[ProfileJob]
    education: ProfileEducation
    certifications: list[str] = Field(default_factory=list)
    projects: list[str] = Field(default_factory=list)


class SkillGroup(BaseModel):
    label: str
    value: str


class GeneratedJob(BaseModel):
    company: str
    city: str
    role: str
    mode: str
    period: str
    bullets: list[str]

    @field_validator("bullets")
    @classmethod
    def bullets_not_empty(cls, v: list[str]) -> list[str]:
        if not v:
            raise ValueError("each job must have at least one bullet")
        return v


class GeneratedProject(BaseModel):
    name: str
    bullets: list[str]


class ResumeContent(BaseModel):
    title: str
    summary: str
    experience: list[GeneratedJob]
    skills: list[SkillGroup]
    projects: list[GeneratedProject]

    @field_validator("summary")
    @classmethod
    def summary_length(cls, v: str) -> str:
        if len(v) >= 520:
            raise ValueError(f"summary must be under 520 characters, got {len(v)}")
        return v


class GenerateResumeRequest(BaseModel):
    job_description: str = Field(min_length=50)
    profile: Profile | None = None
    profile_markdown: str | None = None
    ai_provider: Literal["openai", "cursor", "auto"] | None = None


class GenerateResumeResponse(BaseModel):
    filename: str
    summary_chars: int
    provider: str
    generation_id: int | None = None


class ResumeGenerationRecord(BaseModel):
    id: int
    job_details: str
    profile: dict
    pdf_path: str
    created_at: datetime


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=255)


class UserCreateRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=6, max_length=255)
    role: str = Field(default="user", min_length=1, max_length=50)
    description: str | None = None


class UserUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    username: str | None = Field(default=None, min_length=1, max_length=100)
    password: str | None = Field(default=None, min_length=6, max_length=255)
    role: str | None = Field(default=None, min_length=1, max_length=50)
    description: str | None = None


class UserResponse(BaseModel):
    id: int
    full_name: str
    username: str
    role: str
    description: str | None = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

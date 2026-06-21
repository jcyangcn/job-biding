from typing import Literal
from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator

UserRoleLiteral = Literal["admin", "bidder", "caller"]


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
    role: UserRoleLiteral = "bidder"
    description: str | None = None


class UserUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    username: str | None = Field(default=None, min_length=1, max_length=100)
    password: str | None = Field(default=None, min_length=6, max_length=255)
    role: UserRoleLiteral | None = None
    description: str | None = None


class UserResponse(BaseModel):
    id: int
    full_name: str
    username: str
    role: UserRoleLiteral
    description: str | None = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class JobIdentityCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    country: str = Field(min_length=1, max_length=100)
    address: str = Field(min_length=1)
    city_state: str | None = Field(default=None, max_length=255)
    zipcode: str | None = Field(default=None, max_length=20)
    linkedin: str | None = Field(default=None, max_length=500)
    github: str | None = Field(default=None, max_length=500)
    dob: date | None = None
    ssn: str | None = Field(default=None, max_length=50)


class JobIdentityUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    country: str | None = Field(default=None, min_length=1, max_length=100)
    address: str | None = Field(default=None, min_length=1)
    city_state: str | None = Field(default=None, max_length=255)
    zipcode: str | None = Field(default=None, max_length=20)
    linkedin: str | None = Field(default=None, max_length=500)
    github: str | None = Field(default=None, max_length=500)
    dob: date | None = None
    ssn: str | None = Field(default=None, max_length=50)


class JobIdentityResponse(BaseModel):
    id: int
    name: str
    country: str
    address: str
    city_state: str | None = None
    zipcode: str | None = None
    linkedin: str | None = None
    github: str | None = None
    dob: date | None = None
    ssn: str | None = None
    created_at: datetime


class JobProfileCreateRequest(BaseModel):
    identity_id: int
    bidder_user_id: int
    caller_user_id: int
    roles: str = Field(min_length=1, max_length=255)
    email: str = Field(min_length=1, max_length=255)
    email_password: str = Field(min_length=1, max_length=255)
    phone: str = Field(min_length=1, max_length=50)
    answers: dict = Field(default_factory=dict)
    proxy: str | None = Field(default=None, max_length=500)
    reference_tag: str | None = Field(default=None, max_length=255)
    is_active: bool = True


class JobProfileUpdateRequest(BaseModel):
    identity_id: int | None = None
    bidder_user_id: int | None = None
    caller_user_id: int | None = None
    roles: str | None = Field(default=None, min_length=1, max_length=255)
    email: str | None = Field(default=None, min_length=1, max_length=255)
    email_password: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = Field(default=None, min_length=1, max_length=50)
    answers: dict | None = None
    proxy: str | None = Field(default=None, max_length=500)
    reference_tag: str | None = Field(default=None, max_length=255)
    is_active: bool | None = None


class JobProfileResponse(BaseModel):
    id: int
    identity_id: int
    identity_name: str
    bidder_user_id: int
    bidder_name: str
    caller_user_id: int
    caller_name: str
    roles: str
    email: str
    email_password: str
    phone: str
    answers: dict
    proxy: str | None = None
    reference_tag: str | None = None
    is_active: bool
    created_at: datetime


class JobApplicationCreateRequest(BaseModel):
    profile_id: int
    role: str = Field(min_length=1, max_length=255)
    company: str = Field(min_length=1, max_length=255)
    link: str = Field(min_length=1, max_length=1000)
    job_description: str = Field(min_length=1)
    resume_generated_id: int | None = None
    resume_online_link: str | None = Field(default=None, max_length=1000)


class JobApplicationResponse(BaseModel):
    id: int
    profile_id: int
    profile_label: str
    role: str
    company: str
    link: str
    job_description: str
    resume_generated_id: int | None = None
    resume_online_link: str | None = None
    applied_at: datetime
    created_at: datetime


class JobProgressionEmailCreateRequest(BaseModel):
    profile_id: int
    company: str = Field(min_length=1, max_length=255)
    type: str = Field(min_length=1, max_length=50)
    email_link: str = Field(min_length=1, max_length=1000)
    email_date: datetime
    status: str = Field(min_length=1, max_length=50)
    log: str = ""


class JobProgressionEmailResponse(BaseModel):
    id: int
    profile_id: int
    profile_label: str
    reference_no: str
    company: str
    type: str
    email_link: str
    email_date: datetime
    status: str
    log: str
    created_at: datetime


class JobProgressionEmailReferencePreview(BaseModel):
    profile_id: int
    reference_no: str

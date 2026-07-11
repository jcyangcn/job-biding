from typing import Literal
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

UserRoleLiteral = Literal["admin", "bidder", "caller"]
CitizenStatusLiteral = Literal["Good", "Bad", "None"]
CitizenReviewStatusLiteral = CitizenStatusLiteral


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
    name: str = ""
    title: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    linkedin: str = ""
    portfolio: str = ""
    experience: list[ProfileJob] = Field(default_factory=list)
    education: ProfileEducation = Field(
        default_factory=lambda: ProfileEducation(school="", degree="", period="")
    )
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
    profile_id: int | None = None
    application_id: int | None = None
    ai_provider: Literal["openai", "cursor", "auto"] | None = None


class GenerateResumeResponse(BaseModel):
    filename: str
    summary_chars: int
    provider: str
    generation_id: int | None = None
    application_id: int | None = None


class ResumeGenerationRecord(BaseModel):
    id: int
    job_details: str
    profile_id: int | None = None
    profile_label: str = ""
    resume_content: dict = Field(default_factory=dict)
    resume_vector: list[float] = Field(default_factory=list)
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


class SkillCreateRequest(BaseModel):
    role: str = Field(default="", max_length=255)
    field: str = Field(default="")
    keyword: str = Field(default="")
    weight: float | None = Field(default=1.0, ge=0)


class SkillUpdateRequest(BaseModel):
    role: str | None = Field(default=None, max_length=255)
    field: str | None = Field(default=None)
    keyword: str | None = Field(default=None)
    weight: float | None = Field(default=None, ge=0)


class SkillResponse(BaseModel):
    id: int
    role: str
    field: str
    keyword: str
    weight: float | None = 1.0
    created_at: datetime


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class JobIdentityCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    country: str = Field(min_length=1, max_length=100)
    address: str = Field(default="")
    city_state: str | None = Field(default=None, max_length=255)
    zipcode: str | None = Field(default=None, max_length=20)
    linkedin: str | None = Field(default=None, max_length=500)
    github: str | None = Field(default=None, max_length=500)
    dob: date | None = None
    ssn: str | None = Field(default=None, max_length=50)
    answers: dict = Field(default_factory=dict)


class JobIdentityUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    country: str | None = Field(default=None, min_length=1, max_length=100)
    address: str | None = Field(default=None)
    city_state: str | None = Field(default=None, max_length=255)
    zipcode: str | None = Field(default=None, max_length=20)
    linkedin: str | None = Field(default=None, max_length=500)
    github: str | None = Field(default=None, max_length=500)
    dob: date | None = None
    ssn: str | None = Field(default=None, max_length=50)
    answers: dict | None = None


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
    answers: dict
    created_at: datetime


class ResumeWorkExperienceItem(BaseModel):
    company_name: str = ""
    location: str = ""
    role: str = ""
    start_date: date | None = None
    end_date: date | None = None
    method: str = ""

    @field_validator("start_date", "end_date", mode="before")
    @classmethod
    def empty_date_to_none(cls, value):
        if value == "" or value is None:
            return None
        return value


class ResumeEducationItem(BaseModel):
    university_name: str = ""
    start_date: date | None = None
    end_date: date | None = None
    degree: str = ""

    @field_validator("start_date", "end_date", mode="before")
    @classmethod
    def empty_date_to_none(cls, value):
        if value == "" or value is None:
            return None
        return value


class ResumeProjectItem(BaseModel):
    project_name: str = ""
    stack: str = ""


class ResumeDetail(BaseModel):
    work_experience: list[ResumeWorkExperienceItem] = Field(default_factory=list)
    education: list[ResumeEducationItem] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    projects: list[ResumeProjectItem] = Field(default_factory=list)


class JobProfileCreateRequest(BaseModel):
    identity_id: int
    bidder_user_ids: list[int] = Field(min_length=1)
    caller_user_id: int | None = None
    roles: str = Field(default="", max_length=255)
    email: str = Field(min_length=1, max_length=255)
    email_password: str = Field(min_length=1, max_length=255)
    phone: str = Field(default="", max_length=50)
    email_detail: str = Field(default="")
    phone_detail: str = Field(default="")
    cover_letter: str = Field(default="")
    proxy: str | None = Field(default=None, max_length=500)
    proxy_detail: str = Field(default="")
    resume_from_ai: bool = Field(default=True, alias="resume_fromAI")
    reference_tag: str | None = Field(default=None, max_length=255)
    is_active: bool = True
    resume_detail: ResumeDetail = Field(default_factory=ResumeDetail)

    model_config = ConfigDict(populate_by_name=True)


class JobProfileUpdateRequest(BaseModel):
    identity_id: int | None = None
    bidder_user_ids: list[int] | None = Field(default=None, min_length=1)
    caller_user_id: int | None = None
    roles: str | None = Field(default=None, max_length=255)
    email: str | None = Field(default=None, min_length=1, max_length=255)
    email_password: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    email_detail: str = Field(default="")
    phone_detail: str = Field(default="")
    cover_letter: str = Field(default="")
    proxy: str | None = Field(default=None, max_length=500)
    proxy_detail: str = Field(default="")
    resume_from_ai: bool | None = Field(default=None, alias="resume_fromAI")
    reference_tag: str | None = Field(default=None, max_length=255)
    is_active: bool | None = None
    resume_detail: ResumeDetail | None = None

    model_config = ConfigDict(populate_by_name=True)


class JobProfileResponse(BaseModel):
    id: int
    identity_id: int
    identity_name: str
    bidder_user_ids: list[int]
    bidder_names: list[str]
    bidder_name: str
    caller_user_id: int | None = None
    caller_name: str
    roles: str
    email: str
    email_password: str
    phone: str
    email_detail: str = ""
    phone_detail: str = ""
    cover_letter: str = ""
    default_resume_original_name: str | None = None
    proxy: str | None = None
    proxy_detail: str = ""
    resume_from_ai: bool = Field(default=True, alias="resume_fromAI", serialization_alias="resume_fromAI")
    reference_tag: str | None = None
    is_active: bool
    resume_detail: ResumeDetail
    created_at: datetime

    model_config = ConfigDict(populate_by_name=True)


class JobApplicationCreateRequest(BaseModel):
    profile_id: int
    role: str = Field(default="", max_length=255)
    company: str = Field(default="", max_length=255)
    link: str = Field(min_length=1, max_length=1000)
    job_description: str = Field(default="")
    job_vector: list[float] = Field(default_factory=list)
    resume_generated_id: int | None = None
    resume_online_link: str | None = Field(default=None, max_length=1000)
    applied: bool = False
    applied_at: datetime | None = None


class JobApplicationUpdateRequest(BaseModel):
    role: str = Field(default="", max_length=255)
    company: str = Field(default="", max_length=255)
    link: str = Field(min_length=1, max_length=1000)
    job_description: str = Field(default="")
    job_vector: list[float] | None = None
    resume_generated_id: int | None = None
    resume_online_link: str | None = Field(default=None, max_length=1000)
    applied: bool | None = None
    applied_at: datetime | None = None


class JobApplicationResponse(BaseModel):
    id: int
    profile_id: int
    profile_label: str
    bidder_username: str = ""
    bidder_name: str = ""
    role: str
    company: str
    link: str
    job_description: str
    job_vector: list[float] = Field(default_factory=list)
    resume_generated_id: int | None = None
    resume_pdf_filename: str | None = None
    resume_online_link: str | None = None
    resume_generation_status: str | None = None
    applied: bool
    applied_at: datetime | None = None
    created_at: datetime


class JobProgressionEmailCreateRequest(BaseModel):
    profile_id: int
    company: str = Field(min_length=1, max_length=255)
    type: str = Field(min_length=1, max_length=50)
    email_link: str = Field(min_length=1, max_length=1000)
    email_date: datetime
    status: str = Field(min_length=1, max_length=50)
    log: str = ""


class JobProgressionEmailUpdateRequest(BaseModel):
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


class CitizenImageInfo(BaseModel):
    filename: str
    original_name: str
    uploaded_at: datetime
    path: str | None = None


class CitizenCreateRequest(BaseModel):
    country: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=255)
    linkedin: str | None = Field(default=None, max_length=500)
    details: str = ""
    review_status: CitizenReviewStatusLiteral = "None"
    reviewer: str | None = Field(default=None, max_length=255)
    reviewed_at: date | None = None
    review_log: str = ""


class CitizenUpdateRequest(BaseModel):
    country: str | None = Field(default=None, min_length=1, max_length=100)
    name: str | None = Field(default=None, min_length=1, max_length=255)
    linkedin: str | None = Field(default=None, max_length=500)
    details: str | None = None
    review_status: CitizenReviewStatusLiteral | None = None
    reviewer: str | None = Field(default=None, max_length=255)
    reviewed_at: date | None = None
    review_log: str | None = None


class CitizenResponse(BaseModel):
    id: int
    country: str
    name: str
    linkedin: str | None = None
    details: str
    review_status: CitizenReviewStatusLiteral
    reviewer: str | None = None
    reviewed_at: date | None = None
    review_log: str
    images: list[CitizenImageInfo]
    review_files: list[CitizenImageInfo]
    created_at: datetime
    updated_at: datetime


LinkedInProviderLiteral = Literal["proxyo.io", "ixbrowser", "iproyal"]
LinkedInStatusLiteral = Literal["Pending", "Created", "Renting", "Sold", "Suspended"]
LinkedInNeedActionLiteral = Literal["None", "Need Reverify", "Email out of control"]


class LinkedInAccountCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    country: str = Field(default="United States", min_length=1, max_length=100)
    email: str = Field(default="", max_length=255)
    email_password: str = Field(default="", max_length=255)
    email_recovery_email: str | None = Field(default=None, max_length=255)
    email_secured: bool = False
    recovery_email: str | None = Field(default=None, max_length=255)
    recovery_email_password: str | None = Field(default=None, max_length=255)
    recovery_email_recovery: str | None = Field(default=None, max_length=500)
    linkedin_email: str | None = Field(default=None, max_length=255)
    linkedin_password: str | None = Field(default=None, max_length=255)
    linkedin_link: str | None = Field(default=None, max_length=1000)
    second_email: str | None = Field(default=None, max_length=255)
    linkedin_secured: bool = False
    browser: str | None = Field(default=None, max_length=255)
    profile_no: int | None = None
    provider: LinkedInProviderLiteral | None = None
    order_id: str | None = Field(default=None, max_length=100)
    proxy_info: str | None = None
    proxy_expired_by: date | None = None
    purchased_from: str | None = Field(default=None, max_length=255)
    renting_to: str | None = Field(default=None, max_length=255)
    renting_by: date | None = None
    linkedin_created_at: date | None = None
    status: LinkedInStatusLiteral = "Pending"
    need_action: LinkedInNeedActionLiteral = "None"
    logs: str = ""


class LinkedInAccountUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    country: str | None = Field(default=None, min_length=1, max_length=100)
    email: str | None = Field(default=None, max_length=255)
    email_password: str | None = Field(default=None, max_length=255)
    email_recovery_email: str | None = Field(default=None, max_length=255)
    email_secured: bool | None = None
    recovery_email: str | None = Field(default=None, max_length=255)
    recovery_email_password: str | None = Field(default=None, max_length=255)
    recovery_email_recovery: str | None = Field(default=None, max_length=500)
    linkedin_email: str | None = Field(default=None, max_length=255)
    linkedin_password: str | None = Field(default=None, max_length=255)
    linkedin_link: str | None = Field(default=None, max_length=1000)
    second_email: str | None = Field(default=None, max_length=255)
    linkedin_secured: bool | None = None
    browser: str | None = Field(default=None, max_length=255)
    profile_no: int | None = None
    provider: LinkedInProviderLiteral | None = None
    order_id: str | None = Field(default=None, max_length=100)
    proxy_info: str | None = None
    proxy_expired_by: date | None = None
    purchased_from: str | None = Field(default=None, max_length=255)
    renting_to: str | None = Field(default=None, max_length=255)
    renting_by: date | None = None
    linkedin_created_at: date | None = None
    status: LinkedInStatusLiteral | None = None
    need_action: LinkedInNeedActionLiteral | None = None
    logs: str | None = None


class LinkedInAccountResponse(BaseModel):
    id: int
    title: str
    country: str
    email: str
    email_password: str
    email_recovery_email: str | None = None
    email_secured: bool
    recovery_email: str | None = None
    recovery_email_password: str | None = None
    recovery_email_recovery: str | None = None
    linkedin_email: str | None = None
    linkedin_password: str | None = None
    linkedin_link: str | None = None
    second_email: str | None = None
    linkedin_secured: bool
    browser: str | None = None
    profile_no: int | None = None
    provider: LinkedInProviderLiteral | None = None
    order_id: str | None = None
    proxy_info: str | None = None
    proxy_expired_by: date | None = None
    purchased_from: str | None = None
    renting_to: str | None = None
    renting_by: date | None = None
    linkedin_created_at: date | None = None
    image: CitizenImageInfo | None = None
    status: LinkedInStatusLiteral
    need_action: LinkedInNeedActionLiteral
    logs: str
    created_at: datetime
    updated_at: datetime


class LinkedInAccountImportResponse(BaseModel):
    created: int
    updated: int
    failed: int
    errors: list[str] = []

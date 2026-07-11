from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path

from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.ai_generator import generate_resume_content
from app.config import GENERATED_DIR, INSTRUCTION_DIR, REPO_ROOT, settings
from app.database import get_db, init_db
from app.auth import authenticate_user, create_access_token, user_to_response
from app.dependencies import get_current_user, get_current_user_response, require_admin
from app.db_models import JobApplication, JobProfile, User
from app.history import (
    build_resume_content_payload,
    build_resume_vector,
    list_resume_generations_page,
    resume_generation_to_response,
    save_resume_generation,
)
from app.identity_service import (
    create_identity,
    delete_identity,
    get_identity,
    identity_to_response,
    list_identities_for_user,
    update_identity,
)
from app.citizen_service import (
    add_citizen_image,
    add_citizen_review_file,
    citizen_to_response,
    create_citizen,
    delete_citizen,
    get_citizen,
    list_citizens,
    remove_citizen_image,
    remove_citizen_review_file,
    resolve_citizen_image_path,
    resolve_citizen_review_file_path,
    update_citizen,
)
from app.linkedin_csv_service import export_linkedin_accounts_csv, import_linkedin_accounts_csv
from app.linkedin_service import (
    create_linkedin_account,
    delete_linkedin_account,
    get_linkedin_account,
    linkedin_account_to_response,
    list_linkedin_accounts,
    remove_linkedin_image,
    resolve_linkedin_image_file,
    set_linkedin_image,
    update_linkedin_account,
)
from app.application_service import (
    application_to_response,
    attach_generated_resume_to_application,
    create_application,
    delete_application,
    get_application_for_user,
    list_applications_admin,
    list_applications_for_profile,
    list_applications_for_user,
    next_application_number_for_profile,
    set_application_resume_generation_status,
    update_application,
)
from app.profile_service import (
    create_profile,
    delete_profile,
    get_profile,
    list_profiles_for_user,
    profile_to_response,
    resolve_profile_default_resume_path,
    set_profile_default_resume,
    update_profile,
    user_can_access_profile,
)
from app.progression_email_service import (
    create_progression_email,
    delete_progression_email,
    list_progression_emails_admin,
    list_progression_emails_for_profile,
    list_progression_emails_for_user,
    preview_reference_no,
    progression_email_to_response,
    update_progression_email,
)
from app.models import (
    GenerateResumeRequest,
    GenerateResumeResponse,
    LoginRequest,
    LoginResponse,
    Profile,
    UserCreateRequest,
    UserResponse,
    UserUpdateRequest,
    SkillCreateRequest,
    SkillResponse,
    SkillUpdateRequest,
    JobIdentityCreateRequest,
    JobIdentityResponse,
    JobIdentityUpdateRequest,
    JobProfileCreateRequest,
    JobProfileResponse,
    JobProfileUpdateRequest,
    JobApplicationCreateRequest,
    JobApplicationResponse,
    JobApplicationUpdateRequest,
    JobProgressionEmailCreateRequest,
    JobProgressionEmailReferencePreview,
    JobProgressionEmailResponse,
    JobProgressionEmailUpdateRequest,
    CitizenCreateRequest,
    CitizenResponse,
    CitizenUpdateRequest,
    LinkedInAccountCreateRequest,
    LinkedInAccountImportResponse,
    LinkedInAccountResponse,
    LinkedInAccountUpdateRequest,
)
from app.pdf_renderer import build_resume_path, render_resume_pdf
from app.profile_parser import load_default_profile, parse_profile_markdown
from app.user_roles import UserRole
from app.user_service import (
    create_user_record,
    delete_user,
    get_user,
    list_users,
    update_user,
)
from app.skill_service import (
    create_skill,
    delete_skill,
    get_skill,
    list_skill_keywords,
    list_skills_page,
    skill_to_response,
    update_skill,
)

FRONTEND_DIR = REPO_ROOT / "frontend"
FRONTEND_BUILD_DIR = FRONTEND_DIR / "build"


def _frontend_index() -> Path | None:
    build_index = FRONTEND_BUILD_DIR / "index.html"
    if build_index.is_file():
        return build_index
    legacy_index = FRONTEND_DIR / "index.html"
    if legacy_index.is_file():
        return legacy_index
    return None


def _safe_frontend_path(relative_path: str) -> Path | None:
    if not relative_path or not FRONTEND_BUILD_DIR.is_dir():
        return None
    base = FRONTEND_BUILD_DIR.resolve()
    target = (FRONTEND_BUILD_DIR / relative_path.lstrip("/")).resolve()
    try:
        target.relative_to(base)
    except ValueError:
        return None
    return target if target.is_file() else None


def _serve_frontend(relative_path: str) -> FileResponse:
    if relative_path.startswith("api/") or relative_path == "api":
        raise HTTPException(status_code=404, detail="Not found")

    if relative_path:
        asset = _safe_frontend_path(relative_path)
        if asset:
            return FileResponse(asset)

    index = _frontend_index()
    if index:
        return FileResponse(index)
    raise HTTPException(status_code=404, detail="Frontend build not found")


class SpaFallbackMiddleware(BaseHTTPMiddleware):
    """Return index.html (or build assets) for non-API 404s so client routes work on refresh."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        path = request.url.path
        if (
            request.method not in ("GET", "HEAD")
            or response.status_code != 404
            or path.startswith("/api")
            or path.startswith("/static")
            or path in ("/health", "/docs", "/openapi.json", "/redoc")
        ):
            return response

        relative = path.lstrip("/")
        if relative:
            asset = _safe_frontend_path(relative)
            if asset:
                return FileResponse(asset)

        index = _frontend_index()
        if index:
            return FileResponse(index)
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Biding Managment Resume API",
    description="Generate tailored ATS resumes from a job description and profile using Cursor AI.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(SpaFallbackMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=(
        r"https?://("
        r"localhost|127\.0\.0\.1"
        r"|\d{1,3}(?:\.\d{1,3}){3}"
        r")(:\d+)?"
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Generation-Id", "Content-Disposition"],
)

if FRONTEND_BUILD_DIR.is_dir():
    app.mount("/static", StaticFiles(directory=FRONTEND_BUILD_DIR / "static"), name="static")
elif FRONTEND_DIR.is_dir():
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/")
def index():
    return _serve_frontend("")

@app.get("/health")
def health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False
    return {
        "status": "ok" if db_ok else "degraded",
        "ai_provider": settings.ai_provider,
        "database": "ok" if db_ok else "error",
    }


@app.post("/api/auth/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, request.username, request.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    return LoginResponse(
        access_token=create_access_token(user.id),
        user=user_to_response(user),
    )


@app.get("/api/auth/me", response_model=UserResponse)
def get_me(user: UserResponse = Depends(get_current_user_response)):
    return user


@app.get("/api/users", response_model=list[UserResponse])
def get_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return [user_to_response(user) for user in list_users(db)]


@app.post("/api/users", response_model=UserResponse)
def create_user_endpoint(
    request: UserCreateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    try:
        user = create_user_record(db, request)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return user_to_response(user)


@app.put("/api/users/{user_id}", response_model=UserResponse)
def update_user_endpoint(
    user_id: int,
    request: UserUpdateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    try:
        updated = update_user(db, user, request)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return user_to_response(updated)


@app.delete("/api/users/{user_id}")
def delete_user_endpoint(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    delete_user(db, user)
    return {"ok": True}


@app.get("/api/skills")
def list_skills_endpoint(
    page: int = 1,
    page_size: int = 10,
    search: str | None = None,
    role: str | None = None,
    field: str | None = None,
    sort_by: str | None = None,
    sort_dir: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = list_skills_page(
        db,
        page=page,
        page_size=page_size,
        search=search,
        role=role,
        field=field,
        sort_by=sort_by,
        sort_dir=sort_dir,
    )
    return {
        "items": [skill_to_response(row) for row in result["items"]],
        "total": result["total"],
        "page": result["page"],
        "page_size": result["page_size"],
    }


@app.get("/api/skills/keywords")
def list_skill_keywords_endpoint(
    role: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    keywords = list_skill_keywords(db, role=role)
    return {"keywords": keywords, "length": len(keywords)}


@app.post("/api/skills", response_model=SkillResponse)
def create_skill_endpoint(
    request: SkillCreateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    record = create_skill(db, request)
    return skill_to_response(record)


@app.put("/api/skills/{skill_id}", response_model=SkillResponse)
def update_skill_endpoint(
    skill_id: int,
    request: SkillUpdateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    record = get_skill(db, skill_id)
    if not record:
        raise HTTPException(status_code=404, detail="Skill not found")
    updated = update_skill(db, record, request)
    return skill_to_response(updated)


@app.delete("/api/skills/{skill_id}")
def delete_skill_endpoint(
    skill_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    record = get_skill(db, skill_id)
    if not record:
        raise HTTPException(status_code=404, detail="Skill not found")
    delete_skill(db, record)
    return {"ok": True}


@app.get("/api/job-identities", response_model=list[JobIdentityResponse])
def get_job_identities(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return [identity_to_response(row) for row in list_identities_for_user(db, user)]


@app.post("/api/job-identities", response_model=JobIdentityResponse)
def create_job_identity_endpoint(
    request: JobIdentityCreateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    record = create_identity(db, request)
    return identity_to_response(record)


@app.put("/api/job-identities/{identity_id}", response_model=JobIdentityResponse)
def update_job_identity_endpoint(
    identity_id: int,
    request: JobIdentityUpdateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    record = get_identity(db, identity_id)
    if not record:
        raise HTTPException(status_code=404, detail="Identity not found")
    updated = update_identity(db, record, request)
    return identity_to_response(updated)


@app.delete("/api/job-identities/{identity_id}")
def delete_job_identity_endpoint(
    identity_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    record = get_identity(db, identity_id)
    if not record:
        raise HTTPException(status_code=404, detail="Identity not found")
    delete_identity(db, record)
    return {"ok": True}


@app.get("/api/job-profiles", response_model=list[JobProfileResponse])
def get_job_profiles(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return [
        profile_to_response(db, row, include_admin_fields=user.role == UserRole.admin)
        for row in list_profiles_for_user(db, user)
    ]


@app.post("/api/job-profiles", response_model=JobProfileResponse)
def create_job_profile_endpoint(
    request: JobProfileCreateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    try:
        record = create_profile(db, request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return profile_to_response(db, record)


@app.put("/api/job-profiles/{profile_id}", response_model=JobProfileResponse)
async def update_job_profile_endpoint(
    profile_id: int,
    request: Request,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    record = get_profile(db, profile_id)
    if not record:
        raise HTTPException(status_code=404, detail="Profile not found")
    try:
        body = await request.json()
        if not isinstance(body, dict):
            raise HTTPException(status_code=400, detail="Invalid request body")
        parsed = JobProfileUpdateRequest.model_validate(body)
        updated = update_profile(db, record, parsed, raw_body=body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return profile_to_response(db, updated)


@app.post("/api/job-profiles/{profile_id}/default-resume", response_model=JobProfileResponse)
async def upload_profile_default_resume_endpoint(
    profile_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    record = get_profile(db, profile_id)
    if not record:
        raise HTTPException(status_code=404, detail="Profile not found")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        set_profile_default_resume(
            db,
            record,
            original_name=file.filename or "resume.pdf",
            content=content,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    refreshed = get_profile(db, profile_id)
    return profile_to_response(db, refreshed)


@app.get("/api/job-profiles/{profile_id}/default-resume")
def download_profile_default_resume_endpoint(
    profile_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    record = get_profile(db, profile_id)
    if not record:
        raise HTTPException(status_code=404, detail="Profile not found")
    if not user_can_access_profile(user, record):
        raise HTTPException(status_code=403, detail="Access denied")
    if not record.default_resume_stored_name:
        raise HTTPException(status_code=404, detail="Default resume not found")

    try:
        file_path = resolve_profile_default_resume_path(record)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    download_name = record.default_resume_original_name or "resume.pdf"
    return FileResponse(
        file_path,
        filename=download_name,
        headers={"Content-Disposition": f'attachment; filename="{download_name}"'},
    )


@app.delete("/api/job-profiles/{profile_id}")
def delete_job_profile_endpoint(
    profile_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    record = get_profile(db, profile_id)
    if not record:
        raise HTTPException(status_code=404, detail="Profile not found")
    delete_profile(db, record)
    return {"ok": True}


@app.get("/api/job-applications", response_model=list[JobApplicationResponse])
def list_job_applications_endpoint(
    profile_id: int | None = None,
    include_job_description: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        if user.role == UserRole.admin:
            rows = list_applications_admin(
                db,
                user,
                profile_id=profile_id,
                include_job_description=include_job_description,
            )
        elif profile_id is not None:
            rows = list_applications_for_profile(
                db,
                profile_id,
                user,
                include_job_description=include_job_description,
            )
        else:
            rows = list_applications_for_user(
                db, user, include_job_description=include_job_description
            )
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return [
        application_to_response(
            db, row, include_job_description=include_job_description
        )
        for row in rows
    ]


@app.get("/api/job-applications/{application_id}", response_model=JobApplicationResponse)
def get_job_application_endpoint(
    application_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        record = get_application_for_user(db, application_id, user)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return application_to_response(db, record, include_job_description=True)


@app.post("/api/job-applications", response_model=JobApplicationResponse)
def create_job_application_endpoint(
    request: JobApplicationCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        record = create_application(db, request, user)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return application_to_response(db, record)


@app.put("/api/job-applications/{application_id}", response_model=JobApplicationResponse)
def update_job_application_endpoint(
    application_id: int,
    request: JobApplicationUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        record = update_application(db, application_id, request, user)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return application_to_response(db, record)


@app.delete("/api/job-applications/{application_id}")
def delete_job_application_endpoint(
    application_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        delete_application(db, application_id, user)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"ok": True}


@app.get("/api/job-progression-emails", response_model=list[JobProgressionEmailResponse])
def list_job_progression_emails_endpoint(
    profile_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        if user.role == UserRole.admin:
            rows = list_progression_emails_admin(db, user, profile_id=profile_id)
        elif profile_id is not None:
            rows = list_progression_emails_for_profile(db, profile_id, user)
        else:
            rows = list_progression_emails_for_user(db, user)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return [progression_email_to_response(db, row) for row in rows]


@app.get(
    "/api/job-progression-emails/next-reference",
    response_model=JobProgressionEmailReferencePreview,
)
def preview_job_progression_email_reference_endpoint(
    profile_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        reference_no = preview_reference_no(db, profile_id, user)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return JobProgressionEmailReferencePreview(
        profile_id=profile_id,
        reference_no=reference_no,
    )


@app.post("/api/job-progression-emails", response_model=JobProgressionEmailResponse)
def create_job_progression_email_endpoint(
    request: JobProgressionEmailCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        record = create_progression_email(db, request, user)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return progression_email_to_response(db, record)


@app.put(
    "/api/job-progression-emails/{email_id}",
    response_model=JobProgressionEmailResponse,
)
def update_job_progression_email_endpoint(
    email_id: int,
    request: JobProgressionEmailUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        record = update_progression_email(db, email_id, request, user)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return progression_email_to_response(db, record)


@app.delete("/api/job-progression-emails/{email_id}")
def delete_job_progression_email_endpoint(
    email_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        delete_progression_email(db, email_id, user)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"ok": True}


@app.get("/api/citizens", response_model=list[CitizenResponse])
def list_citizens_endpoint(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return [citizen_to_response(row) for row in list_citizens(db)]


@app.post("/api/citizens", response_model=CitizenResponse)
def create_citizen_endpoint(
    request: CitizenCreateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    record = create_citizen(db, request)
    return citizen_to_response(record)


@app.put("/api/citizens/{citizen_id}", response_model=CitizenResponse)
def update_citizen_endpoint(
    citizen_id: int,
    request: CitizenUpdateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    record = get_citizen(db, citizen_id)
    if not record:
        raise HTTPException(status_code=404, detail="Citizen not found")
    updated = update_citizen(db, record, request)
    return citizen_to_response(updated)


@app.delete("/api/citizens/{citizen_id}")
def delete_citizen_endpoint(
    citizen_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    record = get_citizen(db, citizen_id)
    if not record:
        raise HTTPException(status_code=404, detail="Citizen not found")
    delete_citizen(db, record)
    return {"ok": True}


@app.get("/api/linkedin-accounts", response_model=list[LinkedInAccountResponse])
def list_linkedin_accounts_endpoint(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return [linkedin_account_to_response(row) for row in list_linkedin_accounts(db)]


@app.post("/api/linkedin-accounts", response_model=LinkedInAccountResponse)
def create_linkedin_account_endpoint(
    request: LinkedInAccountCreateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    record = create_linkedin_account(db, request)
    return linkedin_account_to_response(record)


@app.get("/api/linkedin-accounts/export")
def export_linkedin_accounts_csv_endpoint(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    csv_text = export_linkedin_accounts_csv(db)
    filename = f"linkedin-accounts-{datetime.now().date().isoformat()}.csv"
    return Response(
        content="\ufeff" + csv_text,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.post("/api/linkedin-accounts/import", response_model=LinkedInAccountImportResponse)
async def import_linkedin_accounts_csv_endpoint(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    content_bytes = await file.read()
    if not content_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        content = content_bytes.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=400, detail="CSV must be UTF-8 encoded") from exc

    try:
        result = import_linkedin_accounts_csv(db, content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return LinkedInAccountImportResponse.model_validate(result)


@app.get("/api/linkedin-accounts/{account_id}", response_model=LinkedInAccountResponse)
def get_linkedin_account_endpoint(
    account_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    record = get_linkedin_account(db, account_id)
    if not record:
        raise HTTPException(status_code=404, detail="LinkedIn account not found")
    return linkedin_account_to_response(record)


@app.put("/api/linkedin-accounts/{account_id}", response_model=LinkedInAccountResponse)
def update_linkedin_account_endpoint(
    account_id: int,
    request: LinkedInAccountUpdateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    record = get_linkedin_account(db, account_id)
    if not record:
        raise HTTPException(status_code=404, detail="LinkedIn account not found")
    updated = update_linkedin_account(db, record, request)
    return linkedin_account_to_response(updated)


@app.delete("/api/linkedin-accounts/{account_id}")
def delete_linkedin_account_endpoint(
    account_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    record = get_linkedin_account(db, account_id)
    if not record:
        raise HTTPException(status_code=404, detail="LinkedIn account not found")
    delete_linkedin_account(db, record)
    return {"ok": True}


@app.post("/api/linkedin-accounts/{account_id}/image", response_model=LinkedInAccountResponse)
async def upload_linkedin_image_endpoint(
    account_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    record = get_linkedin_account(db, account_id)
    if not record:
        raise HTTPException(status_code=404, detail="LinkedIn account not found")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Maximum file size is 10MB")

    try:
        set_linkedin_image(
            db,
            record,
            original_name=file.filename or "image.jpg",
            content=content,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    refreshed = get_linkedin_account(db, account_id)
    return linkedin_account_to_response(refreshed)


@app.get("/api/linkedin-accounts/{account_id}/image/{filename}")
def download_linkedin_image_endpoint(
    account_id: int,
    filename: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    record = get_linkedin_account(db, account_id)
    if not record:
        raise HTTPException(status_code=404, detail="LinkedIn account not found")

    image = record.image or {}
    safe_name = Path(filename).name
    if image.get("filename") != safe_name:
        raise HTTPException(status_code=404, detail="Image not found")

    try:
        image_path = resolve_linkedin_image_file(image)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    original_name = image.get("original_name") or safe_name
    return FileResponse(
        image_path,
        filename=original_name,
        headers={"Content-Disposition": f'inline; filename="{original_name}"'},
    )


@app.delete("/api/linkedin-accounts/{account_id}/image", response_model=LinkedInAccountResponse)
def delete_linkedin_image_endpoint(
    account_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    record = get_linkedin_account(db, account_id)
    if not record:
        raise HTTPException(status_code=404, detail="LinkedIn account not found")

    try:
        remove_linkedin_image(db, record)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    refreshed = get_linkedin_account(db, account_id)
    return linkedin_account_to_response(refreshed)


@app.post("/api/citizens/{citizen_id}/images", response_model=CitizenResponse)
async def upload_citizen_image_endpoint(
    citizen_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    record = get_citizen(db, citizen_id)
    if not record:
        raise HTTPException(status_code=404, detail="Citizen not found")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        add_citizen_image(
            db,
            record,
            original_name=file.filename or "image.jpg",
            content=content,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    refreshed = get_citizen(db, citizen_id)
    return citizen_to_response(refreshed)


@app.get("/api/citizens/{citizen_id}/images/{filename}")
def download_citizen_image_endpoint(
    citizen_id: int,
    filename: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    record = get_citizen(db, citizen_id)
    if not record:
        raise HTTPException(status_code=404, detail="Citizen not found")

    images = {item["filename"] for item in (record.images or [])}
    safe_name = Path(filename).name
    if safe_name not in images:
        raise HTTPException(status_code=404, detail="Image not found")

    try:
        image_path = resolve_citizen_image_path(citizen_id, safe_name)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not image_path.is_file():
        raise HTTPException(status_code=404, detail="Image file not found")

    original_name = next(
        (item.get("original_name") for item in record.images if item.get("filename") == safe_name),
        safe_name,
    )
    return FileResponse(
        image_path,
        filename=original_name,
        headers={"Content-Disposition": f'attachment; filename="{original_name}"'},
    )


@app.delete("/api/citizens/{citizen_id}/images/{filename}", response_model=CitizenResponse)
def delete_citizen_image_endpoint(
    citizen_id: int,
    filename: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    record = get_citizen(db, citizen_id)
    if not record:
        raise HTTPException(status_code=404, detail="Citizen not found")

    try:
        remove_citizen_image(db, record, filename)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    refreshed = get_citizen(db, citizen_id)
    return citizen_to_response(refreshed)


@app.post("/api/citizens/{citizen_id}/review-files", response_model=CitizenResponse)
async def upload_citizen_review_file_endpoint(
    citizen_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    record = get_citizen(db, citizen_id)
    if not record:
        raise HTTPException(status_code=404, detail="Citizen not found")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        add_citizen_review_file(
            db,
            record,
            original_name=file.filename or "file.bin",
            content=content,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    refreshed = get_citizen(db, citizen_id)
    return citizen_to_response(refreshed)


@app.get("/api/citizens/{citizen_id}/review-files/{filename}")
def download_citizen_review_file_endpoint(
    citizen_id: int,
    filename: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    record = get_citizen(db, citizen_id)
    if not record:
        raise HTTPException(status_code=404, detail="Citizen not found")

    files = {item["filename"] for item in (record.review_files or [])}
    safe_name = Path(filename).name
    if safe_name not in files:
        raise HTTPException(status_code=404, detail="Review file not found")

    try:
        file_path = resolve_citizen_review_file_path(citizen_id, safe_name)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Review file not found")

    original_name = next(
        (
            item.get("original_name")
            for item in record.review_files
            if item.get("filename") == safe_name
        ),
        safe_name,
    )
    return FileResponse(
        file_path,
        filename=original_name,
        headers={"Content-Disposition": f'attachment; filename="{original_name}"'},
    )


@app.delete("/api/citizens/{citizen_id}/review-files/{filename}", response_model=CitizenResponse)
def delete_citizen_review_file_endpoint(
    citizen_id: int,
    filename: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    record = get_citizen(db, citizen_id)
    if not record:
        raise HTTPException(status_code=404, detail="Citizen not found")

    try:
        remove_citizen_review_file(db, record, filename)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    refreshed = get_citizen(db, citizen_id)
    return citizen_to_response(refreshed)


@app.get("/api/profile/default")
def get_default_profile():
    profile = load_default_profile()
    return profile.model_dump()


@app.get("/api/profile/default/markdown")
def get_default_profile_markdown():
    path = INSTRUCTION_DIR / "profiles.md"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="profiles.md not found")
    return PlainTextResponse(path.read_text(encoding="utf-8"))


@app.get("/api/jd/default")
def get_default_jd():
    path = REPO_ROOT / "JD.md"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="JD.md not found")
    return PlainTextResponse(path.read_text(encoding="utf-8"))


@app.get("/api/resume-generations")
def list_resume_generations(
    page: int = 1,
    page_size: int = 10,
    search: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    sort_by: str | None = None,
    sort_dir: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = list_resume_generations_page(
        db,
        page=page,
        page_size=page_size,
        search=search,
        date_from=date_from,
        date_to=date_to,
        sort_by=sort_by,
        sort_dir=sort_dir,
    )
    return {
        "items": [resume_generation_to_response(db, row) for row in result["items"]],
        "total": result["total"],
        "page": result["page"],
        "page_size": result["page_size"],
    }


def _resolve_resume_vector_role(
    db: Session,
    *,
    profile_id: int | None,
    application_id: int | None,
) -> str | None:
    if profile_id is not None:
        profile = db.get(JobProfile, profile_id)
        if profile and (profile.roles or "").strip():
            return profile.roles.strip()
    if application_id is not None:
        application = db.get(JobApplication, application_id)
        if application and (application.role or "").strip():
            return application.role.strip()
    return None


def _create_resume_response(
    request: GenerateResumeRequest,
    db: Session,
    user: User,
) -> GenerateResumeResponse:
    profile = _resolve_profile(request)
    provider = request.ai_provider or settings.resolved_provider()

    if request.application_id is not None:
        try:
            set_application_resume_generation_status(
                db, request.application_id, "generating", user
            )
        except PermissionError as exc:
            raise HTTPException(status_code=403, detail=str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        content = generate_resume_content(
            profile, request.job_description, provider=provider,
        )
    except Exception as exc:
        if request.application_id is not None:
            try:
                set_application_resume_generation_status(
                    db, request.application_id, "failed", user
                )
            except (PermissionError, ValueError):
                pass
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    output_path = _resolve_resume_output_path(db, profile, request)
    try:
        render_resume_pdf(profile, content, output_path)
    except Exception as exc:
        if request.application_id is not None:
            try:
                set_application_resume_generation_status(
                    db, request.application_id, "failed", user
                )
            except (PermissionError, ValueError):
                pass
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    resume_content = build_resume_content_payload(content)
    role = _resolve_resume_vector_role(
        db,
        profile_id=request.profile_id,
        application_id=request.application_id,
    )
    resume_vector = build_resume_vector(db, resume_content=resume_content, role=role)

    try:
        record = save_resume_generation(
            db,
            job_details=request.job_description,
            profile_id=request.profile_id,
            resume_content=resume_content,
            resume_vector=resume_vector,
            pdf_path=output_path,
            repo_root=REPO_ROOT,
        )
        generation_id = record.id
    except Exception as exc:
        if request.application_id is not None:
            try:
                set_application_resume_generation_status(
                    db, request.application_id, "failed", user
                )
            except (PermissionError, ValueError):
                pass
        raise HTTPException(
            status_code=500,
            detail=f"Resume saved but history record failed: {exc}",
        ) from exc

    attached_application_id = None
    if request.application_id is not None:
        try:
            attach_generated_resume_to_application(
                db,
                request.application_id,
                generation_id,
                user,
                job_description=request.job_description,
            )
            attached_application_id = request.application_id
        except PermissionError as exc:
            raise HTTPException(status_code=403, detail=str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    return GenerateResumeResponse(
        filename=output_path.name,
        summary_chars=len(content.summary),
        provider=provider,
        generation_id=generation_id,
        application_id=attached_application_id,
    )


@app.post("/api/resumes", response_model=GenerateResumeResponse)
def create_resume(
    request: GenerateResumeRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _create_resume_response(request, db, user)


def _resolve_generated_pdf(filename: str) -> Path:
    safe_name = Path(filename).name
    if safe_name != filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    pdf_path = (GENERATED_DIR / safe_name).resolve()
    generated_root = GENERATED_DIR.resolve()
    if pdf_path.parent != generated_root:
        raise HTTPException(status_code=400, detail="Invalid filename")
    if not pdf_path.is_file():
        raise HTTPException(status_code=404, detail="PDF not found")
    return pdf_path


@app.get("/api/resumes/download/{filename}")
def download_resume_pdf(filename: str, inline: bool = False):
    """Return a generated PDF. Use inline=true to open in the browser."""
    pdf_path = _resolve_generated_pdf(filename)
    disposition = "inline" if inline else "attachment"
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=pdf_path.name,
        headers={"Content-Disposition": f'{disposition}; filename="{pdf_path.name}"'},
    )


@app.post("/api/resumes/pdf")
def create_resume_pdf(
    request: GenerateResumeRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Generate resume and return the PDF file directly."""
    meta = _create_resume_response(request, db, user)
    path = GENERATED_DIR / meta.filename
    return FileResponse(
        path,
        media_type="application/pdf",
        filename=meta.filename,
        headers={
            "X-Generation-Id": str(meta.generation_id or ""),
            "Content-Disposition": f'attachment; filename="{meta.filename}"',
        },
    )


@app.post("/api/resumes/from-files")
async def create_resume_from_files(
    job_description: str = Form(...),
    profile_markdown: str | None = Form(None),
    use_default_profile: bool = Form(False),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Multipart form: paste JD text and optional profile markdown."""
    if use_default_profile or not profile_markdown:
        profile = load_default_profile()
    else:
        try:
            profile = parse_profile_markdown(profile_markdown)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

    request = GenerateResumeRequest(
        job_description=job_description,
        profile=profile,
    )
    meta = _create_resume_response(request, db, user)
    path = GENERATED_DIR / meta.filename
    return FileResponse(
        path,
        media_type="application/pdf",
        filename=meta.filename,
        headers={
            "X-Generation-Id": str(meta.generation_id or ""),
            "Content-Disposition": f'attachment; filename="{meta.filename}"',
        },
    )


def _resolve_profile(request: GenerateResumeRequest) -> Profile:
    try:
        if request.profile:
            return request.profile
        if request.profile_markdown:
            return parse_profile_markdown(request.profile_markdown)
        return load_default_profile()
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


def _resolve_resume_output_path(
    db: Session,
    profile: Profile,
    request: GenerateResumeRequest,
) -> Path:
    if request.profile_id is not None:
        job_profile = get_profile(db, request.profile_id)
        if not job_profile:
            raise HTTPException(status_code=422, detail="Profile not found")
        app_number = next_application_number_for_profile(db, request.profile_id)
    else:
        app_number = 0
    return build_resume_path(profile.name, app_number, GENERATED_DIR)


@app.api_route("/{full_path:path}", methods=["GET", "HEAD"])
def spa_fallback(full_path: str):
    if full_path.startswith("api/") or full_path == "api":
        raise HTTPException(status_code=404, detail="Not found")
    return _serve_frontend(full_path)

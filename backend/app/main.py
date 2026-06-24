from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.ai_generator import generate_resume_content
from app.config import GENERATED_DIR, INSTRUCTION_DIR, REPO_ROOT, settings
from app.database import get_db, init_db
from app.auth import authenticate_user, create_access_token, user_to_response
from app.dependencies import get_current_user, get_current_user_response, require_admin
from app.db_models import ResumeGeneration, User
from app.history import save_resume_generation
from app.identity_service import (
    create_identity,
    delete_identity,
    get_identity,
    identity_to_response,
    list_identities,
    update_identity,
)
from app.application_service import (
    application_to_response,
    create_application,
    delete_application,
    list_applications_admin,
    list_applications_for_profile,
    update_application,
)
from app.profile_service import (
    create_profile,
    delete_profile,
    get_profile,
    list_profiles_for_user,
    profile_to_response,
    update_profile,
)
from app.progression_email_service import (
    create_progression_email,
    delete_progression_email,
    list_progression_emails_admin,
    list_progression_emails_for_profile,
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
    ResumeGenerationRecord,
    UserCreateRequest,
    UserResponse,
    UserUpdateRequest,
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
)
from app.pdf_renderer import next_resume_path, render_resume_pdf
from app.profile_parser import load_default_profile, parse_profile_markdown
from app.user_roles import UserRole
from app.user_service import (
    create_user_record,
    delete_user,
    get_user,
    list_users,
    update_user,
)

FRONTEND_DIR = REPO_ROOT / "frontend"
FRONTEND_BUILD_DIR = FRONTEND_DIR / "build"


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

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
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
    build_index = FRONTEND_BUILD_DIR / "index.html"
    if build_index.is_file():
        return FileResponse(build_index)
    legacy_index = FRONTEND_DIR / "index.html"
    if legacy_index.is_file():
        return FileResponse(legacy_index)
    raise HTTPException(status_code=404, detail="Frontend build not found")


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


@app.get("/api/job-identities", response_model=list[JobIdentityResponse])
def get_job_identities(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return [identity_to_response(row) for row in list_identities(db)]


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
    return [profile_to_response(db, row) for row in list_profiles_for_user(db, user)]


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
def update_job_profile_endpoint(
    profile_id: int,
    request: JobProfileUpdateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    record = get_profile(db, profile_id)
    if not record:
        raise HTTPException(status_code=404, detail="Profile not found")
    try:
        updated = update_profile(db, record, request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return profile_to_response(db, updated)


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
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        if profile_id is None:
            rows = list_applications_admin(db, user)
        elif user.role == UserRole.admin:
            rows = list_applications_admin(db, user, profile_id=profile_id)
        else:
            rows = list_applications_for_profile(db, profile_id, user)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return [application_to_response(db, row) for row in rows]


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
        if profile_id is None:
            rows = list_progression_emails_admin(db, user)
        elif user.role == UserRole.admin:
            rows = list_progression_emails_admin(db, user, profile_id=profile_id)
        else:
            rows = list_progression_emails_for_profile(db, profile_id, user)
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


@app.get("/api/resume-generations", response_model=list[ResumeGenerationRecord])
def list_resume_generations(
    limit: int = 50,
    db: Session = Depends(get_db),
):
    limit = max(1, min(limit, 200))
    rows = db.scalars(
        select(ResumeGeneration)
        .order_by(ResumeGeneration.created_at.desc())
        .limit(limit)
    ).all()
    return [
        ResumeGenerationRecord(
            id=row.id,
            job_details=row.job_details,
            profile=row.profile,
            pdf_path=row.pdf_path,
            created_at=row.created_at,
        )
        for row in rows
    ]


@app.post("/api/resumes", response_model=GenerateResumeResponse)
def create_resume(request: GenerateResumeRequest, db: Session = Depends(get_db)):
    profile = _resolve_profile(request)
    provider = request.ai_provider or settings.resolved_provider()

    try:
        content = generate_resume_content(
            profile, request.job_description, provider=provider,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    output_path = next_resume_path(profile.name, GENERATED_DIR)
    render_resume_pdf(profile, content, output_path)

    try:
        record = save_resume_generation(
            db,
            job_details=request.job_description,
            profile=profile,
            pdf_path=output_path,
            repo_root=REPO_ROOT,
        )
        generation_id = record.id
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Resume saved but history record failed: {exc}",
        ) from exc

    return GenerateResumeResponse(
        filename=output_path.name,
        summary_chars=len(content.summary),
        provider=provider,
        generation_id=generation_id,
    )


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
def download_resume_pdf(filename: str):
    """Return a generated PDF as a browser download (no client-side Save As)."""
    pdf_path = _resolve_generated_pdf(filename)
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=pdf_path.name,
        headers={"Content-Disposition": f'attachment; filename="{pdf_path.name}"'},
    )


@app.post("/api/resumes/pdf")
def create_resume_pdf(request: GenerateResumeRequest, db: Session = Depends(get_db)):
    """Generate resume and return the PDF file directly."""
    meta = create_resume(request, db)
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
    return create_resume_pdf(request, db)


def _resolve_profile(request: GenerateResumeRequest) -> Profile:
    try:
        if request.profile:
            return request.profile
        if request.profile_markdown:
            return parse_profile_markdown(request.profile_markdown)
        return load_default_profile()
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/{full_path:path}")
def spa_fallback(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")
    build_index = FRONTEND_BUILD_DIR / "index.html"
    if build_index.is_file():
        return FileResponse(build_index)
    raise HTTPException(status_code=404, detail="Frontend build not found")

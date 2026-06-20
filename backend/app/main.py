from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.ai_generator import generate_resume_content
from app.config import GENERATED_DIR, INSTRUCTION_DIR, REPO_ROOT, settings
from app.database import get_db, init_db
from app.auth import authenticate_user, create_access_token, user_to_response
from app.dependencies import get_current_user_response, require_admin
from app.db_models import ResumeGeneration, User
from app.history import save_resume_generation
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
)
from app.pdf_renderer import next_resume_path, render_resume_pdf
from app.profile_parser import load_default_profile, parse_profile_markdown
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
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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


@app.post("/api/resumes/pdf")
def create_resume_pdf(request: GenerateResumeRequest, db: Session = Depends(get_db)):
    """Generate resume and return the PDF file directly."""
    meta = create_resume(request, db)
    path = GENERATED_DIR / meta.filename
    return FileResponse(
        path,
        media_type="application/pdf",
        filename=meta.filename,
        headers={"X-Generation-Id": str(meta.generation_id or "")},
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
        profile = parse_profile_markdown(profile_markdown)

    request = GenerateResumeRequest(
        job_description=job_description,
        profile=profile,
    )
    return create_resume_pdf(request, db)


def _resolve_profile(request: GenerateResumeRequest) -> Profile:
    if request.profile:
        return request.profile
    if request.profile_markdown:
        return parse_profile_markdown(request.profile_markdown)
    return load_default_profile()


@app.get("/{full_path:path}")
def spa_fallback(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")
    build_index = FRONTEND_BUILD_DIR / "index.html"
    if build_index.is_file():
        return FileResponse(build_index)
    raise HTTPException(status_code=404, detail="Frontend build not found")

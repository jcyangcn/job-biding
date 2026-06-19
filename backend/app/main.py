from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Form, HTTPException
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.ai_generator import generate_resume_content
from app.config import GENERATED_DIR, INSTRUCTION_DIR, REPO_ROOT, settings
from app.database import get_db, init_db
from app.db_models import ResumeGeneration
from app.history import save_resume_generation
from app.models import (
    GenerateResumeRequest,
    GenerateResumeResponse,
    Profile,
    ResumeGenerationRecord,
)
from app.pdf_renderer import next_resume_path, render_resume_pdf
from app.profile_parser import load_default_profile, parse_profile_markdown

FRONTEND_DIR = REPO_ROOT / "frontend"


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Job Bidding Resume API",
    description="Generate tailored ATS resumes from a job description and profile using Cursor AI.",
    version="1.0.0",
    lifespan=lifespan,
)

if FRONTEND_DIR.is_dir():
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/")
def index():
    return FileResponse(FRONTEND_DIR / "index.html")


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

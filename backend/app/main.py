from pathlib import Path

from fastapi import FastAPI, Form, HTTPException
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

from app.ai_generator import generate_resume_content
from app.config import GENERATED_DIR, INSTRUCTION_DIR, REPO_ROOT, settings
from app.models import GenerateResumeRequest, GenerateResumeResponse, Profile
from app.pdf_renderer import next_resume_path, render_resume_pdf
from app.profile_parser import load_default_profile, parse_profile_markdown

FRONTEND_DIR = REPO_ROOT / "frontend"

app = FastAPI(
    title="Job Bidding Resume API",
    description="Generate tailored ATS resumes from a job description and profile using Cursor AI.",
    version="1.0.0",
)

if FRONTEND_DIR.is_dir():
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/")
def index():
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/health")
def health():
    return {"status": "ok", "ai_provider": settings.ai_provider}


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


@app.post("/api/resumes", response_model=GenerateResumeResponse)
def create_resume(request: GenerateResumeRequest):
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

    return GenerateResumeResponse(
        filename=output_path.name,
        summary_chars=len(content.summary),
        provider=provider,
    )


@app.post("/api/resumes/pdf")
def create_resume_pdf(request: GenerateResumeRequest):
    """Generate resume and return the PDF file directly."""
    meta = create_resume(request)
    path = GENERATED_DIR / meta.filename
    return FileResponse(
        path,
        media_type="application/pdf",
        filename=meta.filename,
    )


@app.post("/api/resumes/from-files")
async def create_resume_from_files(
    job_description: str = Form(...),
    profile_markdown: str | None = Form(None),
    use_default_profile: bool = Form(False),
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
    return create_resume_pdf(request)


def _resolve_profile(request: GenerateResumeRequest) -> Profile:
    if request.profile:
        return request.profile
    if request.profile_markdown:
        return parse_profile_markdown(request.profile_markdown)
    return load_default_profile()

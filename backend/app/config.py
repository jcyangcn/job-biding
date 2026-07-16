from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parent
INSTRUCTION_DIR = REPO_ROOT / "instruction"

STORAGE_DIR = REPO_ROOT / "storage"
DEFAULT_GENERATED_RESUMES_DIR = STORAGE_DIR / "downloads" / "generated_resumes"
DEFAULT_UPLOADS_DIR = STORAGE_DIR / "uploads"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ai_provider: str = "cursor"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    cursor_api_key: str = ""
    cursor_model: str = "composer-2.5"
    # The Cursor Cloud Agents "create agent" call regularly takes ~60s to
    # return, so the HTTP timeout must be comfortably above that.
    cursor_request_timeout: float = 180.0
    # A request timeout only covers one create/poll HTTP call. Agent runs have
    # their own, longer deadline and transient API failures are retried.
    cursor_run_timeout: float = 900.0
    cursor_request_attempts: int = 4
    cursor_generation_attempts: int = 3
    cursor_poll_interval: float = 5.0
    host: str = "0.0.0.0"
    port: int = 8000
    database_url: str
    jwt_secret: str = "change-me-in-production"
    jwt_expire_hours: int = 48
    generated_resumes_dir: str = Field(default="", validation_alias="GENERATED_RESUMES_DIR")
    uploads_dir_config: str = Field(default="", validation_alias="UPLOADS_DIR")
    cors_origins: str = ""
    uvicorn_reload: bool = False

    def resolved_provider(self) -> str:
        provider = self.ai_provider.lower()
        if provider == "auto":
            if self.cursor_api_key:
                return "cursor"
            if self.openai_api_key:
                return "openai"
            raise ValueError(
                "No AI API key configured. Set OPENAI_API_KEY or CURSOR_API_KEY."
            )
        if provider == "openai" and not self.openai_api_key:
            raise ValueError("AI_PROVIDER=openai but OPENAI_API_KEY is not set.")
        if provider == "cursor" and not self.cursor_api_key:
            raise ValueError("AI_PROVIDER=cursor but CURSOR_API_KEY is not set.")
        return provider

    @property
    def storage_root(self) -> Path:
        return STORAGE_DIR

    @property
    def generated_dir(self) -> Path:
        return self._resolve_storage_path(
            self.generated_resumes_dir, DEFAULT_GENERATED_RESUMES_DIR
        )

    @property
    def uploads_dir(self) -> Path:
        return self._resolve_storage_path(self.uploads_dir_config, DEFAULT_UPLOADS_DIR)

    @staticmethod
    def _resolve_storage_path(raw_value: str, default: Path) -> Path:
        raw = raw_value.strip()
        if not raw:
            return default
        path = Path(raw)
        if not path.is_absolute():
            path = REPO_ROOT / path
        return path

    @property
    def cors_origin_list(self) -> list[str]:
        defaults = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8001",
            "http://127.0.0.1:8001",
        ]
        extra = [item.strip() for item in self.cors_origins.split(",") if item.strip()]
        return list(dict.fromkeys(defaults + extra))


settings = Settings()
GENERATED_DIR = settings.generated_dir
UPLOADS_DIR = settings.uploads_dir
LINKEDIN_IMAGE_DIR = UPLOADS_DIR / "linkedin image"
CITIZEN_IMAGE_DIR = UPLOADS_DIR / "citizen image"
CITIZEN_REVIEW_DIR = UPLOADS_DIR / "citizen review files"
APPLICATION_SCREENSHOT_DIR = UPLOADS_DIR / "application screenshot"


def ensure_storage_dirs() -> None:
    for path in (
        STORAGE_DIR,
        GENERATED_DIR,
        UPLOADS_DIR,
        LINKEDIN_IMAGE_DIR,
        CITIZEN_IMAGE_DIR,
        CITIZEN_REVIEW_DIR,
        APPLICATION_SCREENSHOT_DIR,
    ):
        path.mkdir(parents=True, exist_ok=True)

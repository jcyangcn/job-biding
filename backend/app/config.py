from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parent
INSTRUCTION_DIR = REPO_ROOT / "instruction"

STORAGE_DIR = REPO_ROOT / "storage"
DOWNLOADS_DIR = STORAGE_DIR / "downloads"
UPLOADS_DIR = STORAGE_DIR / "uploads"
GENERATED_RESUME_DIR = DOWNLOADS_DIR / "generated resume"
CITIZEN_IMAGE_DIR = UPLOADS_DIR / "citizen image"
CITIZEN_REVIEW_FILES_DIR = UPLOADS_DIR / "citizen review files"
PROFILE_DEFAULT_RESUME_DIR = UPLOADS_DIR / "profile default resume"
LINKEDIN_IMAGE_DIR = UPLOADS_DIR / "linkedin image"


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
    host: str = "0.0.0.0"
    port: int = 8000
    database_url: str
    jwt_secret: str = "change-me-in-production"
    jwt_expire_hours: int = 48
    generated_resumes_dir: str = ""
    citizen_images_dir_config: str = Field(default="", validation_alias="CITIZEN_IMAGES_DIR")
    citizen_review_files_dir_config: str = Field(
        default="", validation_alias="CITIZEN_REVIEW_FILES_DIR"
    )
    linkedin_images_dir_config: str = Field(default="", validation_alias="LINKEDIN_IMAGES_DIR")
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
        return self._resolve_storage_path(self.generated_resumes_dir, GENERATED_RESUME_DIR)

    @property
    def citizen_images_dir(self) -> Path:
        return self._resolve_storage_path(self.citizen_images_dir_config, CITIZEN_IMAGE_DIR)

    @property
    def citizen_review_files_dir(self) -> Path:
        return self._resolve_storage_path(
            self.citizen_review_files_dir_config,
            CITIZEN_REVIEW_FILES_DIR,
        )

    @property
    def linkedin_images_dir(self) -> Path:
        return self._resolve_storage_path(self.linkedin_images_dir_config, LINKEDIN_IMAGE_DIR)

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
CITIZEN_IMAGES_DIR = settings.citizen_images_dir
CITIZEN_REVIEW_FILES_DIR = settings.citizen_review_files_dir
LINKEDIN_IMAGES_DIR = settings.linkedin_images_dir


def ensure_storage_dirs() -> None:
    for path in (
        STORAGE_DIR,
        DOWNLOADS_DIR,
        UPLOADS_DIR,
        GENERATED_DIR,
        CITIZEN_IMAGES_DIR,
        CITIZEN_REVIEW_FILES_DIR,
        PROFILE_DEFAULT_RESUME_DIR,
        LINKEDIN_IMAGE_DIR,
    ):
        path.mkdir(parents=True, exist_ok=True)

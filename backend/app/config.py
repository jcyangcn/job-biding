from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parent
GENERATED_DIR = REPO_ROOT / "generated_resumes"
INSTRUCTION_DIR = REPO_ROOT / "instruction"


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


settings = Settings()

from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore", enable_decoding=False)

    app_name: str = "Capstone Backend"
    env: str = "dev"
    log_level: str = "INFO"
    database_url: str = "sqlite+aiosqlite:///./backend.db"
    efs_mount_path: Path = Path("./data/images")
    max_upload_bytes: int = 25 * 1024 * 1024
    cors_allowed_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173"]
    )
    auto_create_tables: bool = True
    x_api_key: str | None = None

    @field_validator("cors_allowed_origins", mode="before")
    @classmethod
    def parse_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.efs_mount_path.mkdir(parents=True, exist_ok=True)
    return settings

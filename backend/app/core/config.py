"""Central configuration. All values come from environment variables / .env."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours, as in the report
    CORS_ORIGINS: str = "http://localhost:5173"
    FRONTEND_URL: str = "http://localhost:5173"
    UPLOAD_DIR: str = "uploads"
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = ""
    APP_ENV: str = "development"  # "development" lets the reset link be printed in the console

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-2.5-pro"
    JWT_SECRET: str = "inertia-super-secret-change-in-prod"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 5
    CORS_ORIGINS: list[str] = ["*"]
    USE_REDIS: bool = False
    REDIS_URL: str = "redis://localhost:6379/0"
    MAX_DIFF_LINES: int = 200
    API_TIMEOUT_SECONDS: int = 5
    PUZZLE_TTL_SECONDS: int = 600

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

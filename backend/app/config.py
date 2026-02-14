from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://promptr:promptr@localhost:5432/promptr"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # API Keys
    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""

    # App
    APP_NAME: str = "Promptr"
    DEBUG: bool = False
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # Rate Limits
    MAX_USERS: int = 80
    MAX_PROJECTS_PER_USER: int = 3
    MAX_REFINEMENTS_PER_PROJECT: int = 3
    MAX_QUESTIONS_PER_SESSION: int = 3
    MAX_WORKFLOW_DURATION_SECONDS: int = 600  # 10 minutes

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()

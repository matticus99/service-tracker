from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://servicetracker:changeme@db:5432/servicetracker"
    DATABASE_URL_SYNC: str = "postgresql://servicetracker:changeme@db:5432/servicetracker"
    SECRET_KEY: str = "change-this-to-a-random-string"
    UPLOADS_DIR: str = "/app/uploads"
    MAX_UPLOAD_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB
    MAX_ATTACHMENTS_PER_RECORD: int = 10

    VAPID_PRIVATE_KEY: str = ""
    VAPID_PUBLIC_KEY: str = ""
    VAPID_CLAIMS_EMAIL: str = "mailto:admin@example.com"

    model_config = {"env_file": ".env"}


settings = Settings()

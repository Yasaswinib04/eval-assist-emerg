import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    MONGO_URL: str = "mongodb://localhost:27017"
    DB_NAME: str = "evalassist"
    JWT_SECRET: str = "dev-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    GOOGLE_CLIENT_ID: str = ""
    CORS_ORIGINS: list = ["*"]
    OPENROUTER_API_KEY: str = ""
    QWEN_MODEL: str = "qwen/qwen3-vl-235b-a22b-instruct"
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_MODEL: str = "deepseek-chat"
    POSTHOG_API_KEY: str = ""
    POSTHOG_HOST: str = ""

settings = Settings()

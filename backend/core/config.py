import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MONGO_URL: str = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    DB_NAME: str = os.getenv("DB_NAME", "evalassist")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "supersecretkey_change_in_prod")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 1 week
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    CORS_ORIGINS: list = ["*"]

settings = Settings()

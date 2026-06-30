import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MONGO_URL: str = os.getenv("MONGO_URL", "mongodb+srv://tauser:ta098765@cluster0.pchhav5.mongodb.net/?appName=Cluster0")
    DB_NAME: str = os.getenv("DB_NAME", "evalassist")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "supersecretkey_change_in_prod")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 1 week
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "11277436835-dsr9qtojsm5iiujl3pqnmtvb4prngelh.apps.googleusercontent.com")
    CORS_ORIGINS: list = ["*"]
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    QWEN_MODEL: str = os.getenv("QWEN_MODEL", "qwen/qwen-vl-max")

settings = Settings()

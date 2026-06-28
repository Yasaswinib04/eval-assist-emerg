from motor.motor_asyncio import AsyncIOMotorClient
from backend.core.config import settings

_client = None

def get_client():
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.MONGO_URL, serverSelectionTimeoutMS=5000)
    return _client

def get_db():
    client = get_client()
    return client[settings.DB_NAME]

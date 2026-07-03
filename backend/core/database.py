from motor.motor_asyncio import AsyncIOMotorClient
from backend.core.config import settings
import certifi

_client = None

def get_client():
    global _client
    if _client is None:
        url = settings.MONGO_URL
        kwargs = {"serverSelectionTimeoutMS": 2000}
        # Only use TLS for Atlas/remote connections
        if "localhost" not in url and "127.0.0.1" not in url:
            kwargs["tlsCAFile"] = certifi.where()
        _client = AsyncIOMotorClient(url, **kwargs)
    return _client

def get_db():
    client = get_client()
    return client[settings.DB_NAME]

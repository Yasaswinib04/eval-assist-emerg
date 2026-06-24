from motor.motor_asyncio import AsyncIOMotorClient
from backend.core.config import settings

_client = None

def get_client():
    global _client
    if _client is None:
        url = settings.MONGO_URL
        if "localhost" not in url and "CERT_NONE" not in url:
            url += "&tlsAllowInvalidCertificates=true" if "?" in url else "?tlsAllowInvalidCertificates=true"
        _client = AsyncIOMotorClient(url, serverSelectionTimeoutMS=5000)
    return _client

def get_db():
    client = get_client()
    return client[settings.DB_NAME]

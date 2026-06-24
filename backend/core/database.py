import os
from motor.motor_asyncio import AsyncIOMotorClient
from backend.core.config import settings

url = settings.MONGO_URL
if "localhost" not in url and "CERT_NONE" not in url:
    url += "&tlsAllowInvalidCertificates=true" if "?" in url else "?tlsAllowInvalidCertificates=true"

client = AsyncIOMotorClient(url)
db = client[settings.DB_NAME]

def get_db():
    return db

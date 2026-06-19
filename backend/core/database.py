from motor.motor_asyncio import AsyncIOMotorClient
from backend.core.config import settings

client = AsyncIOMotorClient(settings.MONGO_URL)
db = client[settings.DB_NAME]

def get_db():
    return db

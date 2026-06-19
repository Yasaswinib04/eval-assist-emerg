from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone

class PyObjectId(str):
    @classmethod
    def __get_pydantic_core_schema__(cls, _source_type, _handler):
        from pydantic_core import core_schema
        return core_schema.str_schema()

class UserBase(BaseModel):
    name: str
    email: str
    school: str
    subjects: list[str] = ["Biology"]

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: str = Field(alias="_id")
    
    class Config:
        populate_by_name = True

class UserInDB(User):
    password_hash: str

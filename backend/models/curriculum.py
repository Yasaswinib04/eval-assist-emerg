from pydantic import BaseModel, Field
from typing import List, Optional

class Concept(BaseModel):
    id: str
    name: str
    keywords: List[str] = []
    description: Optional[str] = ""
    prerequisites: List[str] = []
    difficulty: Optional[str] = "Medium"
    expectedSkills: List[str] = []
    associatedImages: List[str] = []

class Chapter(BaseModel):
    id: str
    name: str
    order: int
    color: Optional[str] = "blue"
    concepts: List[Concept] = []

class Curriculum(BaseModel):
    id: str = Field(alias="_id")
    board: str
    class_name: str = Field(alias="class")
    subject: str
    language: str
    version: int
    chapters: List[Chapter] = []

    class Config:
        populate_by_name = True

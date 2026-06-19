from pydantic import BaseModel, Field
from typing import List

class InterventionBase(BaseModel):
    assessmentId: str
    concept: str
    chapter: str
    priority: str # "high", "medium", "low"
    studentsAffected: int
    action: str
    planned: bool = False
    studentIds: List[str] = []

class Intervention(InterventionBase):
    id: str = Field(alias="_id")

    class Config:
        populate_by_name = True

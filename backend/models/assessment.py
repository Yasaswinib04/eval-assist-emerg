from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone

class AssessmentBase(BaseModel):
    name: str
    class_name: str = Field(alias="class")
    subject: str
    type: str
    totalMarks: int
    totalPapers: int
    pendingReview: int
    avgScore: float
    status: str
    createdAt: str

class AssessmentCreate(AssessmentBase):
    pass

class Assessment(AssessmentBase):
    id: str = Field(alias="_id")
    
    class Config:
        populate_by_name = True

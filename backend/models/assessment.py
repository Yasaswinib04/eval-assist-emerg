from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import UploadFile

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
    questionsText: Optional[str] = None
    answerKeyText: Optional[str] = None

class Assessment(AssessmentBase):
    id: str = Field(alias="_id")
    questionsText: Optional[str] = None
    answerKeyText: Optional[str] = None
    questionsImages: Optional[List[str]] = None
    answerKeyImages: Optional[List[str]] = None
    sheetImages: Optional[List[str]] = None
    processingStatus: Optional[str] = "pending"
    parsedQuestions: Optional[List[dict]] = None
    parsedAnswerKey: Optional[List[dict]] = None

    class Config:
        populate_by_name = True

class AssessmentProcessRequest(BaseModel):
    pass  # No body needed — trigger is enough

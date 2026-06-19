from pydantic import BaseModel, Field
from typing import Optional

class EvaluationBase(BaseModel):
    assessmentId: str
    studentId: str
    qId: str
    studentAnswer: Optional[str] = ""
    aiMark: float
    confidence: str # "high", "medium", "low"
    confidenceScore: int
    needsReview: bool
    reasoning: str
    teacherMark: Optional[float] = None
    approved: bool = False

class Evaluation(EvaluationBase):
    id: str = Field(alias="_id")
    
    class Config:
        populate_by_name = True

from pydantic import BaseModel, ConfigDict, Field
from typing import Optional

class EvaluationBase(BaseModel):
    assessmentId: str
    studentId: str
    qId: str
    studentAnswer: Optional[str] = ""
    aiMark: Optional[float] = None
    confidence: str = "" # "high", "medium", "low"
    confidenceScore: int = 0
    needsReview: bool = False
    reasoning: str = ""
    teacherMark: Optional[float] = None
    approved: bool = False
    subMarks: Optional[dict] = {}
    subTeacherMarks: Optional[dict] = {}

class Evaluation(EvaluationBase):
    id: str = Field(alias="_id")
    model_config = ConfigDict(populate_by_name=True, extra="allow")

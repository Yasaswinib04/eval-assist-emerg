from pydantic import BaseModel, Field
from typing import List, Optional, Dict

class SubQuestion(BaseModel):
    number: str
    text: str = ""
    maxMarks: float = 0

class QuestionBase(BaseModel):
    assessmentId: str
    number: int
    section: str
    maxMarks: float
    text: str
    options: Optional[List[str]] = []
    correctAnswer: Optional[str] = None
    expected: Optional[str] = None
    chapter: Optional[str] = None # refers to chapter id
    concept: Optional[str] = None # concept name
    skill: Optional[str] = None
    difficulty: Optional[str] = None
    prerequisites: List[str] = []
    subQuestions: Optional[List[SubQuestion]] = []

class Question(QuestionBase):
    id: str = Field(alias="_id")
    
    class Config:
        populate_by_name = True

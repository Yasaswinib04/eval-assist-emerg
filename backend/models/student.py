from pydantic import BaseModel, Field

class StudentBase(BaseModel):
    assessmentId: str
    name: str
    roll: str
    total: float
    status: str

class Student(StudentBase):
    id: str = Field(alias="_id")
    
    class Config:
        populate_by_name = True

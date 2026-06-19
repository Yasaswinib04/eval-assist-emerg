from fastapi import APIRouter, Depends, HTTPException
from typing import List
from backend.core.database import get_db
from backend.models.evaluation import Evaluation

router = APIRouter()

@router.get("/{id}/students/{sid}/evaluations", response_model=List[Evaluation])
async def get_evaluations(id: str, sid: str, db=Depends(get_db)):
    evals = await db.evaluations.find({"assessmentId": id, "studentId": sid}).to_list(100)
    return evals

@router.put("/{id}/students/{sid}/evaluations/{qid}/override", response_model=Evaluation)
async def update_override(id: str, sid: str, qid: str, updates: dict, db=Depends(get_db)):
    mark = updates.get("teacherMark")
    result = await db.evaluations.update_one(
        {"assessmentId": id, "studentId": sid, "qId": qid},
        {"$set": {"teacherMark": mark, "approved": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    return await db.evaluations.find_one({"assessmentId": id, "studentId": sid, "qId": qid})

@router.post("/{id}/students/{sid}/approve")
async def approve_all_student(id: str, sid: str, db=Depends(get_db)):
    await db.evaluations.update_many(
        {"assessmentId": id, "studentId": sid},
        {"$set": {"approved": True}}
    )
    return {"message": "All evaluations approved for student"}

@router.post("/{id}/approve-high")
async def approve_all_high(id: str, db=Depends(get_db)):
    await db.evaluations.update_many(
        {"assessmentId": id, "needsReview": False},
        {"$set": {"approved": True}}
    )
    return {"message": "All high-confidence evaluations approved"}

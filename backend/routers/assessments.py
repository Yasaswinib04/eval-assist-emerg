from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from backend.core.database import get_db
from backend.models.assessment import Assessment, AssessmentCreate
from datetime import datetime, timezone
import uuid

router = APIRouter()

@router.get("/", response_model=List[Assessment])
async def get_assessments(db=Depends(get_db)):
    assessments = await db.assessments.find().to_list(100)
    return assessments

@router.get("/{id}", response_model=Assessment)
async def get_assessment(id: str, db=Depends(get_db)):
    assessment = await db.assessments.find_one({"_id": id})
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return assessment

@router.post("/", response_model=Assessment)
async def create_assessment(assessment: AssessmentCreate, db=Depends(get_db)):
    doc = assessment.dict(by_alias=True)
    doc["_id"] = f"asm-{uuid.uuid4().hex[:6]}"
    doc["createdAt"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    doc["status"] = "draft"
    doc["pendingReview"] = 0
    doc["avgScore"] = 0
    doc["totalPapers"] = 0
    await db.assessments.insert_one(doc)
    return doc

@router.patch("/{id}", response_model=Assessment)
async def update_assessment(id: str, updates: dict, db=Depends(get_db)):
    result = await db.assessments.update_one({"_id": id}, {"$set": updates})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return await get_assessment(id, db)

@router.get("/{id}/status")
async def get_assessment_status(id: str, db=Depends(get_db)):
    assessment = await db.assessments.find_one({"_id": id}, {"status": 1})
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return {"status": assessment.get("status", "draft")}

from fastapi import APIRouter, Depends, HTTPException
from typing import List
from backend.core.database import get_db
from backend.models.intervention import Intervention

router = APIRouter()

@router.get("/{id}/interventions", response_model=List[Intervention])
async def get_interventions(id: str, db=Depends(get_db)):
    interventions = await db.interventions.find({"assessmentId": id}).to_list(100)
    return interventions

@router.put("/{id}/interventions/{actId}/plan")
async def update_intervention_plan(id: str, actId: str, plan: dict, db=Depends(get_db)):
    result = await db.interventions.update_one(
        {"_id": actId, "assessmentId": id},
        {"$set": {"planned": plan.get("planned", True)}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Intervention not found")
    return await db.interventions.find_one({"_id": actId})

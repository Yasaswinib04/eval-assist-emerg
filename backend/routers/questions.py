from fastapi import APIRouter, Depends, HTTPException
from typing import List
from backend.core.database import get_db
from backend.models.question import Question

router = APIRouter()

@router.get("/{id}/questions", response_model=List[Question])
async def get_questions(id: str, db=Depends(get_db)):
    questions = await db.questions.find({"assessmentId": id}).to_list(100)
    return questions

@router.put("/{id}/questions/{qid}", response_model=Question)
async def update_question(id: str, qid: str, updates: dict, db=Depends(get_db)):
    result = await db.questions.update_one({"_id": qid, "assessmentId": id}, {"$set": updates})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Question not found")
    return await db.questions.find_one({"_id": qid})

@router.get("/{id}/chapters")
async def get_chapters(id: str, db=Depends(get_db)):
    # Since we use predefined curricula for MVP, we just return the full curriculum
    curriculum = await db.curricula.find_one({"_id": "ap-class8-bio-v1"})
    if not curriculum:
        raise HTTPException(status_code=404, detail="Curriculum not found")
    return curriculum.get("chapters", [])

@router.get("/{id}/concepts")
async def get_concepts(id: str, db=Depends(get_db)):
    curriculum = await db.curricula.find_one({"_id": "ap-class8-bio-v1"})
    concepts = []
    if curriculum:
        for ch in curriculum.get("chapters", []):
            concepts.extend(ch.get("concepts", []))
    return concepts

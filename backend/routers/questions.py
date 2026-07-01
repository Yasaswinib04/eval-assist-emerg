from fastapi import APIRouter, Depends, HTTPException
from typing import List
from backend.core.database import get_db
from backend.models.question import Question

router = APIRouter()

@router.get("/{id}/questions")
async def get_questions(id: str, db=Depends(get_db)):
    try:
        # 1. Check parsed questions
        assessment = await db.assessments.find_one({"_id": id})
        if assessment and assessment.get("parsedQuestions"):
            return assessment["parsedQuestions"]

        # 2. Try parsing text if provided
        if assessment and (assessment.get("questionsText") or "").strip():
            try:
                from backend.services.answer_key_parser import parse_questions_text
                parsed = parse_questions_text(assessment["questionsText"])
                if parsed:
                    await db.assessments.update_one({"_id": id}, {"$set": {"parsedQuestions": parsed}})
                    return parsed
            except Exception:
                pass

        # 3. User has images but not yet analyzed
        qimgs = assessment.get("questionsImages") if assessment else None
        if qimgs and len(qimgs) > 0:
            ps = assessment.get("processingStatus", "")
            if ps in ("qpaper_error", "qpaper_skipped", "qpaper_done"):
                pass
            else:
                return [{"id": "pending", "number": 0, "text": "OCR_ANALYSIS_PENDING", "chapter": "", "concept": "", "maxMarks": 0, "section": "info", "imagesUploaded": len(qimgs)}]

        # 4. Questions collection for this assessment
        questions = await db.questions.find({"assessmentId": id}).to_list(100)
        if questions:
            return questions

        # 5. Fallback — copy seed from asm-001
        seed_qs = await db.questions.find({"assessmentId": "asm-001"}).to_list(100)
        if seed_qs:
            for q in seed_qs:
                q_copy = dict(q)
                q_copy["_id"] = f"{q['_id']}-{id}"
                q_copy["assessmentId"] = id
                await db.questions.update_one({"_id": q_copy["_id"]}, {"$set": q_copy}, upsert=True)
            return await db.questions.find({"assessmentId": id}).to_list(100)
        return []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Questions error: {e.__class__.__name__}: {str(e)[:300]}")

@router.put("/{id}/questions/{qid}", response_model=Question)
async def update_question(id: str, qid: str, updates: dict, db=Depends(get_db)):
    result = await db.questions.update_one({"_id": qid, "assessmentId": id}, {"$set": updates})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Question not found")
    return await db.questions.find_one({"_id": qid})

@router.get("/{id}/chapters")
async def get_chapters(id: str, db=Depends(get_db)):
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

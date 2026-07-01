"""Score Entry router — teacher directly enters marks, no OCR pipeline.

Creates assessments, questions, students, and evaluations from teacher-provided
score data. All existing insights/interventions endpoints work unchanged since
evaluations are stored with the same schema (aiMark = teacher-entered score).
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from backend.core.database import get_db
from datetime import datetime, timezone
import uuid

router = APIRouter()


class ScoreQuestion(BaseModel):
    number: int
    section: str = "A"
    maxMarks: float
    chapter: Optional[str] = None
    concept: Optional[str] = None


class ScoreStudent(BaseModel):
    name: str
    roll: Optional[str] = ""
    scores: Dict[str, float] = Field(default_factory=dict)


class ScoreEntryRequest(BaseModel):
    name: str
    class_name: str = Field(alias="class")
    subject: str
    type: str
    totalMarks: int
    questions: List[ScoreQuestion]
    students: List[ScoreStudent]


class ScoreEntryUpdateRequest(BaseModel):
    questions: Optional[List[ScoreQuestion]] = None
    students: Optional[List[ScoreStudent]] = None


@router.post("/score-entry")
async def create_score_entry(data: ScoreEntryRequest, db=Depends(get_db)):
    """Create a quick score-entry assessment with questions, students, and marks."""
    assessment_id = f"asm-{uuid.uuid4().hex[:6]}"
    created_at = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    question_docs = []
    for q in data.questions:
        q_doc = {
            "_id": f"q{q.number}",
            "assessmentId": assessment_id,
            "number": q.number,
            "section": q.section,
            "maxMarks": q.maxMarks,
            "text": f"Question {q.number}",
            "chapter": q.chapter or "unknown",
            "concept": q.concept or "",
            "skill": "Recall",
            "difficulty": "Medium",
            "prerequisites": [],
            "options": None,
            "correctAnswer": None,
        }
        question_docs.append(q_doc)

    if question_docs:
        await db.questions.insert_many(question_docs)

    student_ids = []
    all_evaluations = []
    total_marks_scored = 0

    for s in data.students:
        student_id = f"stu-{assessment_id}-{s.name.lower().replace(' ', '-')[:20]}"
        student_doc = {
            "_id": student_id,
            "assessmentId": assessment_id,
            "name": s.name,
            "roll": s.roll or f"{len(student_ids)+1:03d}",
            "total": 0.0,
            "status": "complete",
            "imageUrls": [],
        }
        student_total = 0.0
        for q in data.questions:
            q_key = str(q.number)
            score = s.scores.get(q_key, 0.0) if s.scores else 0.0
            student_total += score
            eval_id = f"{assessment_id}-{student_id}-q{q.number}"
            eval_doc = {
                "_id": eval_id,
                "assessmentId": assessment_id,
                "studentId": student_id,
                "qId": f"q{q.number}",
                "studentAnswer": "",
                "aiMark": float(score),
                "confidence": "manual",
                "confidenceScore": 100,
                "needsReview": False,
                "reasoning": "Teacher-entered score",
                "teacherMark": None,
                "approved": True,
            }
            all_evaluations.append(eval_doc)

        student_doc["total"] = round(student_total, 1)
        student_ids.append(student_id)
        total_marks_scored += student_total
        await db.students.update_one({"_id": student_id}, {"$set": student_doc}, upsert=True)

    if all_evaluations:
        for ev in all_evaluations:
            await db.evaluations.update_one({"_id": ev["_id"]}, {"$set": ev}, upsert=True)

    num_students = len(student_ids)
    avg_score = round(total_marks_scored / num_students, 1) if num_students > 0 else 0.0

    assessment_doc = {
        "_id": assessment_id,
        "name": data.name,
        "class": data.class_name,
        "subject": data.subject,
        "type": data.type,
        "totalMarks": data.totalMarks,
        "totalPapers": num_students,
        "pendingReview": 0,
        "avgScore": avg_score,
        "status": "complete",
        "createdAt": created_at,
        "workflowType": "score_entry",
        "questionsText": None,
        "answerKeyText": None,
        "curriculumText": None,
        "questionsImages": None,
        "answerKeyImages": None,
        "sheetImages": None,
        "processingStatus": "complete",
        "parsedQuestions": question_docs,
        "parsedAnswerKey": None,
    }
    await db.assessments.update_one({"_id": assessment_id}, {"$set": assessment_doc}, upsert=True)
    return assessment_doc


@router.get("/{id}/score-entry")
async def get_score_entry(id: str, db=Depends(get_db)):
    """Retrieve score-entry data for an assessment."""
    assessment = await db.assessments.find_one({"_id": id})
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    questions = await db.questions.find({"assessmentId": id}).to_list(100)
    if not questions:
        questions = await db.questions.find({"assessmentId": "asm-001"}).to_list(100)

    students = await db.students.find({"assessmentId": id}).to_list(100)
    student_scores = []
    for s in students:
        evals = await db.evaluations.find({"assessmentId": id, "studentId": s["_id"]}).to_list(100)
        scores = {e["qId"]: e.get("aiMark", 0) or 0 for e in evals}
        student_scores.append({
            "id": s["_id"],
            "name": s.get("name", ""),
            "roll": s.get("roll", ""),
            "total": s.get("total", 0),
            "scores": scores,
        })

    return {
        "assessment": assessment,
        "questions": [{"number": q.get("number", q.get("id", "")), "section": q.get("section", "A"), "maxMarks": q.get("maxMarks", 1), "chapter": q.get("chapter", ""), "concept": q.get("concept", "")} for q in questions],
        "students": student_scores,
    }


@router.put("/{id}/score-entry")
async def update_score_entry(id: str, data: ScoreEntryUpdateRequest, db=Depends(get_db)):
    """Update scores for an existing score-entry assessment."""
    assessment = await db.assessments.find_one({"_id": id})
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    if data.students:
        await db.students.delete_many({"assessmentId": id})
        await db.evaluations.delete_many({"assessmentId": id})

        if data.questions:
            await db.questions.delete_many({"assessmentId": id})
            question_docs = []
            questions_list = []
            for q in data.questions:
                q_doc = {
                    "_id": f"q{q.number}",
                    "assessmentId": id,
                    "number": q.number,
                    "section": q.section,
                    "maxMarks": q.maxMarks,
                    "text": f"Question {q.number}",
                    "chapter": q.chapter or "unknown",
                    "concept": q.concept or "",
                    "skill": "Recall",
                    "difficulty": "Medium",
                    "prerequisites": [],
                    "options": None,
                    "correctAnswer": None,
                }
                question_docs.append(q_doc)
                questions_list.append(q)
            if question_docs:
                await db.questions.insert_many(question_docs)
        else:
            questions_list = await db.questions.find({"assessmentId": id}).to_list(100)
            if not questions_list:
                questions_list = await db.questions.find({"assessmentId": "asm-001"}).to_list(100)

        total_marks_scored = 0
        student_ids = []
        all_evals = []

        for s in data.students:
            student_id = f"stu-{id}-{s.name.lower().replace(' ', '-')[:20]}"
            student_doc = {
                "_id": student_id,
                "assessmentId": id,
                "name": s.name,
                "roll": s.roll or f"{len(student_ids)+1:03d}",
                "total": 0.0,
                "status": "complete",
                "imageUrls": [],
            }
            student_total = 0.0
            for q in questions_list:
                q_num = q.get("number", 0)
                q_key = str(q_num)
                score = s.scores.get(q_key, 0.0) if s.scores else 0.0
                student_total += score
                eval_id = f"{id}-{student_id}-q{q_num}"
                eval_doc = {
                    "_id": eval_id,
                    "assessmentId": id,
                    "studentId": student_id,
                    "qId": f"q{q_num}",
                    "studentAnswer": "",
                    "aiMark": float(score),
                    "confidence": "manual",
                    "confidenceScore": 100,
                    "needsReview": False,
                    "reasoning": "Teacher-entered score",
                    "teacherMark": None,
                    "approved": True,
                }
                all_evals.append(eval_doc)

            student_doc["total"] = round(student_total, 1)
            student_ids.append(student_id)
            total_marks_scored += student_total
            await db.students.update_one({"_id": student_id}, {"$set": student_doc}, upsert=True)

        for ev in all_evals:
            await db.evaluations.update_one({"_id": ev["_id"]}, {"$set": ev}, upsert=True)

        num_students = len(student_ids)
        avg_score = round(total_marks_scored / num_students, 1) if num_students > 0 else 0.0

        await db.assessments.update_one(
            {"_id": id},
            {"$set": {
                "totalPapers": num_students,
                "pendingReview": 0,
                "avgScore": avg_score,
                "status": "complete",
                "parsedQuestions": question_docs if data.questions else assessment.get("parsedQuestions"),
            }},
        )

    updated = await db.assessments.find_one({"_id": id})
    return updated


@router.delete("/{id}/score-entry")
async def delete_score_entry(id: str, db=Depends(get_db)):
    """Delete a score-entry assessment and all related data."""
    await db.students.delete_many({"assessmentId": id})
    await db.evaluations.delete_many({"assessmentId": id})
    await db.questions.delete_many({"assessmentId": id})
    await db.interventions.delete_many({"assessmentId": id})
    await db.assessments.delete_one({"_id": id})
    return {"status": "deleted", "assessmentId": id}

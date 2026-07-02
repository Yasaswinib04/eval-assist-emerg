from fastapi import APIRouter, Depends, HTTPException
from typing import List
from backend.core.database import get_db
from backend.models.student import Student

router = APIRouter()

@router.get("/{id}/students", response_model=List[Student])
async def get_students(id: str, db=Depends(get_db)):
    students = await db.students.find({"assessmentId": id}).to_list(100)
    return students

@router.get("/{id}/students/{sid}/profile")
async def get_student_profile(id: str, sid: str, db=Depends(get_db)):
    evaluations = await db.evaluations.find({"assessmentId": id, "studentId": sid}).to_list(100)
    questions = await db.questions.find({"assessmentId": id}).to_list(100)

    q_map = {}
    for q in questions:
        q_map[q.get("_id", q.get("id", ""))] = q
        num = q.get("number", 0)
        if num:
            q_map[f"q{num}"] = q

    concept_scores = {}
    concept_attempts = {}
    for ev in evaluations:
        q_id = ev.get("qId", "")
        q = q_map.get(q_id, {})
        concept = q.get("concept", "Unknown")
        mark = ev.get("aiMark", 0) or 0
        max_m = q.get("maxMarks", 1)
        if max_m > 0:
            if concept not in concept_scores:
                concept_scores[concept] = 0.0
                concept_attempts[concept] = 0
            concept_scores[concept] += mark / max_m
            concept_attempts[concept] += 1

    strong = []
    developing = []
    weak = []
    for concept, total in concept_scores.items():
        attempts = concept_attempts.get(concept, 1)
        mastery = round((total / attempts) * 100, 1)
        entry = {"concept": concept, "mastery": mastery}
        if mastery >= 75:
            strong.append(entry)
        elif mastery >= 40:
            developing.append(entry)
        else:
            weak.append(entry)

    strong.sort(key=lambda x: -x["mastery"])
    developing.sort(key=lambda x: -x["mastery"])
    weak.sort(key=lambda x: x["mastery"])

    return {
        "strong": strong,
        "developing": developing,
        "weak": weak,
        "misconceptions": [],
    }

@router.get("/{id}/students/{sid}/term-trends")
async def get_term_trends(id: str, sid: str, db=Depends(get_db)):
    return []

@router.get("/{id}/students/{sid}/concept-trends")
async def get_concept_trends(id: str, sid: str, db=Depends(get_db)):
    return []

"""Interventions router — generated from real evaluation data.

Previously returned hardcoded seed data. Now computes interventions dynamically
from concept mastery and returns them with real student-affected counts.
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List
from backend.core.database import get_db
from backend.routers.auth import get_current_user

router = APIRouter()


def _generate_action(concept: str, mastery: float) -> str:
    """Generate a teaching action suggestion for a concept."""
    if mastery < 35:
        return f"Re-teach '{concept}' using diagrams, video, and interactive questioning. Consider remedial class."
    elif mastery < 50:
        return f"Review '{concept}' with a short recap, practice worksheet, and peer discussion."
    else:
        return f"Reinforce '{concept}' through quick quiz and real-world examples."


@router.get("/{id}/interventions")
async def get_interventions(id: str, db=Depends(get_db)):
    """Generate intervention cards from real concept mastery data."""
    # Get concept mastery from same computation as insights
    from backend.routers.insights import (
        _get_assessment_questions,
        _get_evaluations,
        _get_students,
        _build_qmap,
    )

    questions = await _get_assessment_questions(db, id)
    evaluations = await _get_evaluations(db, id)
    students = await _get_students(db, id)

    if not evaluations or not questions:
        return []

    q_map = _build_qmap(questions)
    concept_scores = {}
    concept_attempts = {}
    concept_chapter = {}
    concept_students = {}

    assessment = await db.assessments.find_one({"_id": id})
    subject = assessment.get("subject", "") if assessment else ""
    klass = (assessment.get("class", "Class 8") if assessment else "Class 8").replace("Class ", "")
    subj_map = {"biology": "bio", "biological science": "bio", "physics": "phy",
                 "physical science": "phy", "chemistry": "chem", "mathematics": "mat"}
    subj_code = subj_map.get(subject.lower() if subject else "", "bio")
    curriculum = await db.curricula.find_one({"_id": f"ap-class{klass}-{subj_code}-v1"})

    for ev in evaluations:
        q_id = ev.get("qId", "")
        q = q_map.get(q_id, {})
        concept_name = q.get("concept", "Unknown")
        chapter_id = q.get("chapter", "unknown")
        student_id = ev.get("studentId", "unknown")
        mark = ev.get("aiMark", 0) or 0
        max_m = q.get("maxMarks", 1)
        if max_m > 0:
            if concept_name not in concept_scores:
                concept_scores[concept_name] = 0.0
                concept_attempts[concept_name] = 0
                concept_chapter[concept_name] = chapter_id
                concept_students[concept_name] = set()
            concept_scores[concept_name] += mark / max_m
            concept_attempts[concept_name] += 1
            if mark < max_m * 0.5:
                concept_students[concept_name].add(student_id)

    # Find chapter names from curriculum
    chapter_names = {}
    if curriculum:
        for ch in curriculum.get("chapters", []):
            chapter_names[ch.get("id", "")] = ch.get("name", "Unknown")

    results = []
    for concept_name, total in concept_scores.items():
        attempts = concept_attempts.get(concept_name, 1)
        mastery = round((total / attempts) * 100, 1)

        # Only create interventions for concepts that need attention
        if mastery >= 60:
            continue

        priority = "high" if mastery < 35 else "medium" if mastery < 50 else "low"
        affected = len(concept_students.get(concept_name, set()))
        ch_id = concept_chapter.get(concept_name, "unknown")
        chapter_name = chapter_names.get(ch_id, "Unknown Chapter")

        results.append({
            "_id": f"interv-{concept_name.lower().replace(' ', '-')}",
            "id": f"interv-{concept_name.lower().replace(' ', '-')}",
            "concept": concept_name,
            "chapter": chapter_name,
            "priority": priority,
            "studentsAffected": affected,
            "action": _generate_action(concept_name, mastery),
            "planned": False,
            "assessmentId": id,
        })

    # Sort by priority
    priority_order = {"high": 0, "medium": 1, "low": 2}
    results.sort(key=lambda r: (priority_order.get(r["priority"], 9), -r["studentsAffected"]))
    return results


@router.put("/{id}/interventions/{actId}/plan")
async def update_intervention_plan(id: str, actId: str, plan: dict, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Mark an intervention as planned / not planned."""
    result = await db.interventions.update_one(
        {"_id": actId, "assessmentId": id},
        {"$set": {"planned": plan.get("planned", True)}},
        upsert=True,
    )
    if result.modified_count == 0 and not result.upserted_id:
        raise HTTPException(status_code=404, detail="Intervention not found")
    return await db.interventions.find_one({"_id": actId})

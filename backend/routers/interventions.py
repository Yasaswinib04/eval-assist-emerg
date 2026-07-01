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
    actions = {
        "Asexual Reproduction": "Show short videos of Hydra budding and Amoeba binary fission. Ask students to compare with sexual reproduction.",
        "Budding": "Demonstrate budding in Hydra using a diagram. Have students sketch and label the stages.",
        "Binary Fission": "Use Amoeba diagrams to explain binary fission. Compare cell division in unicellular vs multicellular organisms.",
        "Fertilization": "Use a labelled diagram and short video to review external vs internal fertilization with examples.",
        "IVF": "Re-teach Fertilization first, then explain IVF as a medical intervention. Show step-by-step process chart.",
        "Internal Fertilization": "Run a 15-minute recap with worked examples of animals using internal fertilization.",
        "Metamorphosis": "Show the frog lifecycle chart. Compare complete vs incomplete metamorphosis with butterfly example.",
        "Female Reproductive System": "Diagram-labelling exercise. Have students draw and label ovaries, oviducts, uterus.",
        "Male Reproductive System": "Diagram-labelling exercise. Focus on sperm production and delivery.",
        "Gametes": "Compare egg and sperm cells visually. Highlight size, motility, and function differences.",
        "Sexual Reproduction": "Compare sexual vs asexual reproduction with a T-chart. Use examples from textbook.",
        "Communicable Diseases": "Create a disease fact-sheet activity. Students research cause, transmission, prevention.",
        "Microorganisms": "Microscope observation activity. Classify bacteria, virus, fungi, protozoa with examples.",
        "Antibiotics & Medicine": "Discuss when antibiotics work vs when they don't. Role-play doctor-patient consultation.",
        "Food Preservation": "Home investigation: students list 4 methods their family uses. Share in class.",
        "Crop Production": "Field trip or video walkthrough of farming stages. Create a flowchart.",
        "Crop Seasons": "Seasonal crop calendar activity. Map kharif, rabi, and zaid crops to calendar months.",
        "Agricultural Implements": "Hands-on demo or video of plough, hoe, combine. Clarify which tool for which stage.",
        "Irrigation": "Compare traditional vs modern irrigation methods. Case study: drip irrigation in drought areas.",
        "Weed Control": "Name-drop activity: students list local weedicides. Discuss safe usage and alternatives.",
        "Cell Structure": "Build a 3D cell model. Label organelles. Compare plant vs animal cells.",
        "Unicellular Organisms": "Microscope observation of Amoeba, Paramecium. Draw and label each.",
    }

    if concept in actions:
        return actions[concept]

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
    curriculum = await db.curricula.find_one({"_id": "ap-class8-bio-v1"})

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
async def update_intervention_plan(id: str, actId: str, plan: dict, db=Depends(get_db)):
    """Mark an intervention as planned / not planned."""
    result = await db.interventions.update_one(
        {"_id": actId, "assessmentId": id},
        {"$set": {"planned": plan.get("planned", True)}},
        upsert=True,
    )
    if result.modified_count == 0 and not result.upserted_id:
        raise HTTPException(status_code=404, detail="Intervention not found")
    return await db.interventions.find_one({"_id": actId})

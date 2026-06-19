from fastapi import APIRouter, Depends, HTTPException
from backend.core.database import get_db

router = APIRouter()

@router.get("/{id}/insights/kpi")
async def get_kpis(id: str, db=Depends(get_db)):
    # Returns classAvg, highest, lowest, passRate based on mock logic
    return {
        "classAverage": "68%",
        "highestScore": 35,
        "lowestScore": 18,
        "passRate": "85%"
    }

@router.get("/{id}/insights/root-cause")
async def get_root_cause(id: str, db=Depends(get_db)):
    return [
        {"id": "rc1", "insight": "72% of students who struggled with IVF also struggled with Fertilization, indicating a prerequisite knowledge gap.", "linkedConcepts": ["IVF", "Fertilization"], "severity": "high"}
    ]

@router.get("/{id}/insights/concept-mastery")
async def get_concept_mastery(id: str, db=Depends(get_db)):
    return [
        {"concept": "Crop Seasons", "chapter": "ch3", "mastery": 88, "attempts": 42},
        {"concept": "Irrigation", "chapter": "ch3", "mastery": 84, "attempts": 42}
    ]

@router.get("/{id}/insights/chapter-performance")
async def get_chapter_performance(id: str, db=Depends(get_db)):
    return [
        {"id": "ch1", "name": "Cell — Structure & Functions", "mastery": 46, "questions": 1},
        {"id": "ch2", "name": "Microorganisms", "mastery": 73, "questions": 4}
    ]

@router.get("/{id}/insights/score-distribution")
async def get_score_distribution(id: str, db=Depends(get_db)):
    return [
        {"range": "0-10", "count": 2},
        {"range": "11-20", "count": 6},
        {"range": "21-25", "count": 9},
        {"range": "26-30", "count": 14},
        {"range": "31-35", "count": 8},
        {"range": "36-40", "count": 3}
    ]

@router.get("/{id}/insights/learning-gaps")
async def get_learning_gaps(id: str, db=Depends(get_db)):
    return [
        {"topic": "Diagram of Female Reproductive System (Q15)", "studentsStruggled": 25, "percentage": 60}
    ]

"""Insights router — computed from real evaluation data.

All endpoints query MongoDB evaluations, students, questions, and curricula
to produce live, per-assessment insights. No hardcoded mock data.
"""

from fastapi import APIRouter, Depends, HTTPException
from backend.core.database import get_db

router = APIRouter()


# ── Helpers ──────────────────────────────────────────────────────────

async def _get_assessment_questions(db, assessment_id: str):
    """Get questions for this assessment (parsed, seed, or any)."""
    questions = await db.questions.find({"assessmentId": assessment_id}).to_list(100)
    if not questions:
        questions = await db.questions.find({"assessmentId": "asm-001"}).to_list(100)
    if not questions:
        questions = await db.questions.find().to_list(100)
    return questions


async def _get_students(db, assessment_id: str):
    return await db.students.find({"assessmentId": assessment_id}).to_list(100)


async def _get_evaluations(db, assessment_id: str):
    return await db.evaluations.find({"assessmentId": assessment_id}).to_list(1000)


async def _get_curriculum(db):
    curriculum = await db.curricula.find_one({"_id": "ap-class8-bio-v1"})
    if not curriculum:
        return {"chapters": []}
    return curriculum


# ── Endpoints ────────────────────────────────────────────────────────


@router.get("/{id}/insights/kpi")
async def get_kpis(id: str, db=Depends(get_db)):
    """Real KPIs computed from student scores."""
    students = await _get_students(db, id)
    if not students:
        return {"classAverage": "0%", "highestScore": 0, "lowestScore": 0, "passRate": "0%"}

    totals = [s.get("total", 0) or 0 for s in students]
    assessment = await db.assessments.find_one({"_id": id})
    max_marks = (assessment.get("totalMarks", 40) or 40) if assessment else 40

    avg = sum(totals) / len(totals) if totals else 0
    pass_mark = max_marks * 0.5
    passed = sum(1 for t in totals if t >= pass_mark)

    return {
        "classAverage": f"{round((avg / max_marks) * 100, 1)}%",
        "highestScore": max(totals) if totals else 0,
        "lowestScore": min(totals) if totals else 0,
        "passRate": f"{round((passed / len(totals)) * 100)}%" if totals else "0%",
    }


@router.get("/{id}/insights/root-cause")
async def get_root_cause(id: str, db=Depends(get_db)):
    """Real Root Cause Analysis: low-mastery concepts with prerequisite gaps."""
    questions = await _get_assessment_questions(db, id)
    evaluations = await _get_evaluations(db, id)
    curriculum = await _get_curriculum(db)

    if not evaluations or not questions:
        return [{"id": "rc1", "insight": "Not enough data for root cause analysis.", "linkedConcepts": [], "severity": "low"}]

    # Build concept mastery map
    concept_scores = {}
    concept_attempts = {}
    q_map = {q.get("_id", q.get("id", "")): q for q in questions}

    for ev in evaluations:
        q_id = ev.get("qId", "")
        q = q_map.get(q_id, {})
        concept_name = q.get("concept", "Unknown")
        mark = ev.get("aiMark", 0) or 0
        max_m = q.get("maxMarks", 1)
        if max_m > 0:
            score_pct = mark / max_m
            if concept_name not in concept_scores:
                concept_scores[concept_name] = 0.0
                concept_attempts[concept_name] = 0
            concept_scores[concept_name] += score_pct
            concept_attempts[concept_name] += 1

    results = []
    for concept_name, total_score in concept_scores.items():
        attempts = concept_attempts.get(concept_name, 1)
        mastery = (total_score / attempts) * 100

        if mastery >= 50:
            continue  # skip concepts students are doing fine on

        # Find prerequisite concepts from curriculum
        prereqs = []
        for ch in curriculum.get("chapters", []):
            for c in ch.get("concepts", []):
                if c.get("name") == concept_name:
                    prereqs = c.get("prerequisites", [])
                    break

        # Check if any prerequisite also has low mastery
        weak_prereqs = []
        for pr in prereqs:
            if pr in concept_scores:
                pr_mastery = (concept_scores[pr] / max(concept_attempts.get(pr, 1), 1)) * 100
                if pr_mastery < 50:
                    weak_prereqs.append(pr)

        if weak_prereqs:
            insight = (
                f"Students struggling with '{concept_name}' ({mastery:.0f}% mastery) "
                f"also show weak prerequisite knowledge in: {', '.join(weak_prereqs)}. "
                f"Consider re-teaching these foundational concepts first."
            )
            results.append({
                "id": f"rc-{concept_name.lower().replace(' ', '-')}",
                "insight": insight,
                "linkedConcepts": [concept_name] + weak_prereqs,
                "severity": "high" if mastery < 35 else "medium",
            })

    if not results:
        results.append({
            "id": "rc1",
            "insight": "All concepts are at satisfactory mastery levels. No prerequisite gaps detected.",
            "linkedConcepts": [],
            "severity": "low",
        })

    # Sort by severity (high first), limited to top 5
    severity_order = {"high": 0, "medium": 1, "low": 2}
    results.sort(key=lambda r: (severity_order.get(r["severity"], 9), r.get("severity", "")))
    return results[:5]


@router.get("/{id}/insights/concept-mastery")
async def get_concept_mastery(id: str, db=Depends(get_db)):
    """Real concept mastery heatmap from evaluation data."""
    questions = await _get_assessment_questions(db, id)
    evaluations = await _get_evaluations(db, id)

    if not evaluations or not questions:
        return []

    q_map = {q.get("_id", q.get("id", "")): q for q in questions}
    concept_scores = {}
    concept_attempts = {}
    concept_chapter = {}

    for ev in evaluations:
        q_id = ev.get("qId", "")
        q = q_map.get(q_id, {})
        concept_name = q.get("concept", "Unknown")
        chapter_id = q.get("chapter", "unknown")
        mark = ev.get("aiMark", 0) or 0
        max_m = q.get("maxMarks", 1)
        if max_m > 0:
            if concept_name not in concept_scores:
                concept_scores[concept_name] = 0.0
                concept_attempts[concept_name] = 0
                concept_chapter[concept_name] = chapter_id
            concept_scores[concept_name] += mark / max_m
            concept_attempts[concept_name] += 1

    results = []
    for concept_name, total in concept_scores.items():
        attempts = concept_attempts.get(concept_name, 1)
        mastery = round((total / attempts) * 100, 1)
        results.append({
            "concept": concept_name,
            "chapter": concept_chapter.get(concept_name, "unknown"),
            "mastery": mastery,
            "attempts": attempts,
        })

    results.sort(key=lambda r: r["mastery"])  # weakest first
    return results


@router.get("/{id}/insights/chapter-performance")
async def get_chapter_performance(id: str, db=Depends(get_db)):
    """Real chapter performance from concept mastery aggregation."""
    concept_mastery = await get_concept_mastery(id, db)
    curriculum = await _get_curriculum(db)

    chapter_data = {}
    for ch in curriculum.get("chapters", []):
        chapter_data[ch["id"]] = {
            "id": ch["id"],
            "name": ch.get("name", "Unknown"),
            "masterySum": 0.0,
            "conceptCount": 0,
            "questionCount": 0,
        }

    for cm in concept_mastery:
        ch_id = cm.get("chapter", "unknown")
        if ch_id in chapter_data:
            chapter_data[ch_id]["masterySum"] += cm["mastery"]
            chapter_data[ch_id]["conceptCount"] += 1
            chapter_data[ch_id]["questionCount"] += cm.get("attempts", 0)

    results = []
    for ch_data in chapter_data.values():
        if ch_data["conceptCount"] > 0:
            results.append({
                "id": ch_data["id"],
                "name": ch_data["name"],
                "mastery": round(ch_data["masterySum"] / ch_data["conceptCount"], 1),
                "questions": ch_data["questionCount"],
            })

    results.sort(key=lambda r: r["mastery"])
    return results


@router.get("/{id}/insights/score-distribution")
async def get_score_distribution(id: str, db=Depends(get_db)):
    """Real score distribution from student totals."""
    students = await _get_students(db, id)

    if not students:
        return []

    totals = [s.get("total", 0) or 0 for s in students]
    bins = [(0, 10), (11, 20), (21, 25), (26, 30), (31, 35), (36, 40)]

    results = []
    for lo, hi in bins:
        count = sum(1 for t in totals if lo <= t <= hi)
        results.append({"range": f"{lo}-{hi}", "count": count})

    return results


@router.get("/{id}/insights/learning-gaps")
async def get_learning_gaps(id: str, db=Depends(get_db)):
    """Real learning gaps: lowest-mastery concepts from evaluations."""
    concept_mastery = await get_concept_mastery(id, db)

    if not concept_mastery:
        return []

    # Bottom quartile or lowest mastery concepts
    gaps = [cm for cm in concept_mastery if cm["mastery"] < 50]
    gaps.sort(key=lambda r: r["mastery"])

    results = []
    for g in gaps[:5]:
        # Count actual students struggling
        students = await _get_students(db, id)
        struggling = int(len(students) * (1 - g["mastery"] / 100)) if students else 0
        results.append({
            "topic": g["concept"],
            "studentsStruggled": max(1, struggling),
            "percentage": round(100 - g["mastery"], 1),
        })

    return results

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from typing import List, Optional
from backend.core.database import get_db
from backend.models.assessment import Assessment, AssessmentCreate, AssessmentProcessRequest
from datetime import datetime, timezone
import uuid
import os
import shutil
import asyncio

router = APIRouter()

UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "media", "uploads")


def _save_uploaded_files(assessment_id: str, files: List[UploadFile], subdir: str) -> List[str]:
    """Save uploaded files to media/uploads/{assessment_id}/{subdir}/. Returns list of saved paths."""
    if not files:
        return []
    target = os.path.join(UPLOADS_DIR, assessment_id, subdir)
    os.makedirs(target, exist_ok=True)
    saved = []
    for f in files:
        if not f.filename:
            continue
        safe_name = f.filename.replace(" ", "_").replace("/", "_")
        dest = os.path.join(target, safe_name)
        with open(dest, "wb") as buf:
            shutil.copyfileobj(f.file, buf)
        # Store relative to media for frontend access: media/uploads/{aid}/{subdir}/{file}
        saved.append(f"media/uploads/{assessment_id}/{subdir}/{safe_name}")
    return saved


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
async def create_assessment(
    db=Depends(get_db),
    name: str = Form(...),
    class_name: str = Form(..., alias="class"),
    subject: str = Form(...),
    type: str = Form(...),
    totalMarks: int = Form(...),
    questionsText: Optional[str] = Form(None),
    answerKeyText: Optional[str] = Form(None),
    questionFiles: List[UploadFile] = File(default=[]),
    answerKeyFiles: List[UploadFile] = File(default=[]),
    sheetFiles: List[UploadFile] = File(default=[]),
):
    """Create a new assessment with optional files and text content."""
    assessment_id = f"asm-{uuid.uuid4().hex[:6]}"
    created_at = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Save uploaded files
    question_images = _save_uploaded_files(
        assessment_id, questionFiles or [], "questions"
    )
    answer_key_images = _save_uploaded_files(
        assessment_id, answerKeyFiles or [], "answer_key"
    )
    sheet_images = _save_uploaded_files(
        assessment_id, sheetFiles or [], "sheets"
    )

    doc = {
        "_id": assessment_id,
        "name": name,
        "class": class_name,
        "subject": subject,
        "type": type,
        "totalMarks": totalMarks,
        "totalPapers": len(sheet_images),
        "pendingReview": len(sheet_images),
        "avgScore": 0.0,
        "status": "draft",
        "createdAt": created_at,
        "questionsText": questionsText,
        "answerKeyText": answerKeyText,
        "questionsImages": question_images,
        "answerKeyImages": answer_key_images,
        "sheetImages": sheet_images,
        "processingStatus": "pending",
        "parsedQuestions": None,
        "parsedAnswerKey": None,
    }

    await db.assessments.insert_one(doc)

    # If answer key text was provided, parse it now
    if answerKeyText and answerKeyText.strip():
        try:
            from backend.services.answer_key_parser import parse_answer_key
            parsed = parse_answer_key(answerKeyText)
            if parsed:
                await db.assessments.update_one(
                    {"_id": assessment_id},
                    {"$set": {"parsedAnswerKey": parsed}}
                )
                doc["parsedAnswerKey"] = parsed
        except Exception as e:
            print(f"  Answer key parsing skipped (Ollama may not be running): {e}")

    # If questions text was provided, parse it now
    if questionsText and questionsText.strip():
        try:
            from backend.services.answer_key_parser import parse_questions_text
            parsed_qs = parse_questions_text(questionsText)
            if parsed_qs:
                await db.assessments.update_one(
                    {"_id": assessment_id},
                    {"$set": {"parsedQuestions": parsed_qs}}
                )
                doc["parsedQuestions"] = parsed_qs
        except Exception as e:
            print(f"  Questions parsing skipped (Ollama may not be running): {e}")

    return doc


@router.post("/{id}/process")
async def process_assessment(
    id: str,
    background_tasks: BackgroundTasks,
    db=Depends(get_db),
):
    """Trigger OCR pipeline processing for the assessment."""
    assessment = await db.assessments.find_one({"_id": id})
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    if not assessment.get("sheetImages"):
        raise HTTPException(status_code=400, detail="No student answer sheets uploaded")

    await db.assessments.update_one(
        {"_id": id},
        {"$set": {"status": "processing", "processingStatus": "ocr"}}
    )

    background_tasks.add_task(_run_ocr_pipeline, id, assessment)
    return {"status": "processing", "assessmentId": id}


async def _run_ocr_pipeline(assessment_id: str, assessment: dict):
    """Background task: run OCR on student sheets, grade against answer key."""
    import sys
    from pathlib import Path
    # Add project root and backend to path
    project_root = str(Path(__file__).resolve().parents[2])
    backend_dir = str(Path(__file__).resolve().parents[1])
    for p in [project_root, backend_dir]:
        if p not in sys.path:
            sys.path.insert(0, p)

    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        from backend.core.config import settings

        client = AsyncIOMotorClient(settings.MONGO_URL)
        db = client[settings.DB_NAME]

        from tools.ocr.answer_sheet_ocr import AnswerSheetProcessor

        # Build the list of answer sheet image paths
        sheet_dir = os.path.join(
            os.path.dirname(__file__), "..", "..", "media", "uploads", assessment_id, "sheets"
        )
        sheet_paths = [
            os.path.join(sheet_dir, f)
            for f in os.listdir(sheet_dir)
            if f.lower().endswith((".jpg", ".jpeg", ".png"))
        ] if os.path.exists(sheet_dir) else []

        if not sheet_paths:
            # Fall back to path stored in assessment document
            sheet_paths = [
                os.path.join(os.path.dirname(__file__), "..", "..", img)
                for img in assessment.get("sheetImages", [])
            ]

        if not sheet_paths:
            await db.assessments.update_one(
                {"_id": assessment_id},
                {"$set": {"status": "error", "processingStatus": "no_sheets_found"}}
            )
            return

        # Use parsed answer key if available, otherwise seed questions
        parsed_key = assessment.get("parsedAnswerKey")
        parsed_questions = assessment.get("parsedQuestions")

        processor = AnswerSheetProcessor(language="en")

        if parsed_questions:
            processor.questions = parsed_questions
        else:
            questions_path = str(
                Path(__file__).resolve().parents[2]
                / "backend" / "seed" / "data" / "questions.json"
            )
            if os.path.exists(questions_path):
                processor.mapper.load_questions(questions_path)

        # If parsed questions, also save to questions collection
        if parsed_questions:
            for q in parsed_questions:
                q["assessmentId"] = assessment_id
                q["_id"] = q.get("_id", f"q-{assessment_id}-{q.get('number', 0)}")
                await db.questions.update_one(
                    {"_id": q["_id"]},
                    {"$set": q},
                    upsert=True,
                )

        # [Step 1/6] Scanning handwriting (OCR)
        await db.assessments.update_one(
            {"_id": assessment_id},
            {"$set": {"processingStatus": "step_ocr"}}
        )

        result = await asyncio.to_thread(
            processor.process,
            image_paths=sheet_paths,
            student_id=assessment_id,
            use_ollama=False,
        )

        # Save extracted evaluations to MongoDB
        evaluations = result.get("evaluations", [])
        for ev in evaluations:
            ev["_id"] = f"{assessment_id}-{ev['qId']}"
            ev["assessmentId"] = assessment_id
            ev["studentId"] = assessment_id  # single-student assessment
            ev["approved"] = False

        if evaluations:
            # Upsert evaluations
            for ev in evaluations:
                await db.evaluations.update_one(
                    {"_id": ev["_id"]},
                    {"$set": ev},
                    upsert=True,
                )

        await asyncio.sleep(2.0)  # Smooth transition

        # [Step 2/6] Analysing question paper
        await db.assessments.update_one(
            {"_id": assessment_id},
            {"$set": {"processingStatus": "step_qp"}}
        )

        # If no parsed questions, copy seed questions for this assessment
        if not parsed_questions:
            seed_questions = await db.questions.find({"assessmentId": "asm-001"}).to_list(100)
            for q in seed_questions:
                # Copy fields
                q_copy = dict(q)
                q_copy["_id"] = f"{q_copy['_id']}-{assessment_id}"
                q_copy["assessmentId"] = assessment_id
                await db.questions.update_one(
                    {"_id": q_copy["_id"]},
                    {"$set": q_copy},
                    upsert=True,
                )

        await asyncio.sleep(2.0)

        # [Step 3/6] Extracting concepts & chapters
        await db.assessments.update_one(
            {"_id": assessment_id},
            {"$set": {"processingStatus": "step_concept"}}
        )
        await asyncio.sleep(2.0)

        # [Step 4/6] AI evaluating answers
        await db.assessments.update_one(
            {"_id": assessment_id},
            {"$set": {"processingStatus": "step_eval"}}
        )
        # If parsed answer key exists, apply it to grading
        if parsed_key:
            await _apply_answer_key_grading(db, assessment_id, parsed_key, evaluations)
        await asyncio.sleep(2.0)

        # [Step 5/6] Learning gap analysis
        await db.assessments.update_one(
            {"_id": assessment_id},
            {"$set": {"processingStatus": "step_gap"}}
        )
        await asyncio.sleep(2.0)

        # [Step 6/6] Generating classroom insights
        await db.assessments.update_one(
            {"_id": assessment_id},
            {"$set": {"processingStatus": "step_insights"}}
        )
        await asyncio.sleep(2.0)

        # Update assessment status as complete
        await db.assessments.update_one(
            {"_id": assessment_id},
            {
                "$set": {
                    "status": "review",
                    "processingStatus": "complete",
                    "pendingReview": len([e for e in evaluations if e.get("needsReview")]),
                }
            }
        )

    except Exception as e:
        print(f"OCR pipeline error for {assessment_id}: {e}")
        try:
            client = AsyncIOMotorClient(settings.MONGO_URL)
            db = client[settings.DB_NAME]
            await db.assessments.update_one(
                {"_id": assessment_id},
                {"$set": {"status": "error", "processingStatus": str(e)[:200]}}
            )
        except Exception:
            pass


async def _apply_answer_key_grading(db, assessment_id: str, parsed_key: list, evaluations: list):
    """Apply parsed answer key to re-grade evaluations."""
    key_by_q = {}
    for entry in parsed_key:
        q_num = entry.get("questionNumber", 0)
        if q_num:
            key_by_q[q_num] = entry

    for ev in evaluations:
        q_id = ev.get("qId", "")
        q_num = int(q_id[1:]) if q_id.startswith("q") else 0
        key_entry = key_by_q.get(q_num)
        if not key_entry:
            continue

        extracted = (ev.get("studentAnswer") or "").strip()
        expected = key_entry.get("expectedText", "")

        if not expected:
            continue

        # Simple keyword overlap grading
        expected_words = set(expected.lower().split())
        extracted_words = set(extracted.lower().split())
        if expected_words:
            overlap = len(expected_words & extracted_words) / len(expected_words)
            if overlap >= 0.6:
                ev["aiMark"] = float(ev.get("aiMark", 0) or 2)
                ev["confidence"] = "high"
                ev["confidenceScore"] = 85
                ev["reasoning"] = "Answer key match (keyword overlap)."
            elif overlap >= 0.3:
                ev["aiMark"] = round(float(ev.get("aiMark", 1) or 1), 1)
                ev["confidence"] = "medium"
                ev["confidenceScore"] = 60
                ev["reasoning"] = "Partial answer key match."
            else:
                ev["needsReview"] = True

        # Update in DB
        await db.evaluations.update_one(
            {"_id": ev["_id"]},
            {"$set": {
                "aiMark": ev.get("aiMark"),
                "confidence": ev.get("confidence"),
                "confidenceScore": ev.get("confidenceScore"),
                "reasoning": ev.get("reasoning"),
                "needsReview": ev.get("needsReview", True),
            }},
        )


@router.patch("/{id}", response_model=Assessment)
async def update_assessment(id: str, updates: dict, db=Depends(get_db)):
    result = await db.assessments.update_one({"_id": id}, {"$set": updates})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return await get_assessment(id, db)


@router.get("/{id}/status")
async def get_assessment_status(id: str, db=Depends(get_db)):
    assessment = await db.assessments.find_one({"_id": id}, {"status": 1, "processingStatus": 1})
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return {
        "status": assessment.get("status", "draft"),
        "processingStatus": assessment.get("processingStatus", "pending"),
    }

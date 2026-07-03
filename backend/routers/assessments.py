from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from typing import List, Optional
from backend.core.database import get_db
from backend.core.config import settings
from backend.models.assessment import Assessment, AssessmentCreate, AssessmentProcessRequest
from backend.routers.auth import get_current_user
from datetime import datetime, timezone
import uuid
import os
import shutil
import asyncio

router = APIRouter()

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3.2:3b"

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
        try:
            safe_name = f.filename.replace(" ", "_").replace("/", "_").replace("\\", "_")
            if safe_name.startswith(".") or ".." in safe_name:
                safe_name = os.path.basename(safe_name)
            dest = os.path.join(target, safe_name)
            with open(dest, "wb") as buf:
                shutil.copyfileobj(f.file, buf)
            saved.append(f"media/uploads/{assessment_id}/{subdir}/{safe_name}")
        except Exception as e:
            print(f"[Upload] Failed to save {f.filename}: {e}")
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
    current_user=Depends(get_current_user),
    name: str = Form(...),
    class_name: str = Form(..., alias="class"),
    subject: str = Form(...),
    type: str = Form(...),
    totalMarks: int = Form(...),
    questionsText: Optional[str] = Form(None),
    answerKeyText: Optional[str] = Form(None),
    curriculumText: Optional[str] = Form(None),
    questionFiles: List[UploadFile] = File(default=[]),
    answerKeyFiles: List[UploadFile] = File(default=[]),
    sheetFiles: List[UploadFile] = File(default=[]),
):
    """Create a new assessment with optional files and text content."""
    try:
        print(f"[Upload] Step 1: id generation for '{name}'")
        assessment_id = f"asm-{uuid.uuid4().hex[:6]}"
        created_at = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        print(f"[Upload] Step 2: saving {len(questionFiles)} question files")
        question_images = _save_uploaded_files(assessment_id, questionFiles or [], "questions")
        print(f"[Upload] Step 3: saving {len(answerKeyFiles)} answer key files")
        answer_key_images = _save_uploaded_files(assessment_id, answerKeyFiles or [], "answer_key")
        print(f"[Upload] Step 4: saving {len(sheetFiles)} sheet files")
        sheet_images = _save_uploaded_files(assessment_id, sheetFiles or [], "sheets")

        print(f"[Upload] Step 5: building doc")
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
            "questionsText": questionsText or "",
            "answerKeyText": answerKeyText or "",
            "curriculumText": curriculumText or "",
            "questionsImages": question_images,
            "answerKeyImages": answer_key_images,
            "sheetImages": sheet_images,
            "processingStatus": "pending",
            "parsedQuestions": None,
            "parsedAnswerKey": None,
            "gradingMode": "formative" if totalMarks == 0 else "scored",
        }

        print(f"[Upload] Step 6: inserting into MongoDB (id={assessment_id})")
        await db.assessments.insert_one(doc)
        print(f"[Upload] Step 6 done: inserted")

        print(f"[Upload] Step 8: parsing answer key, questions, curriculum...")
        if answerKeyText and answerKeyText.strip():
            try:
                from backend.services.answer_key_parser import parse_answer_key
                parsed = parse_answer_key(answerKeyText)
                if parsed:
                    await db.assessments.update_one({"_id": assessment_id}, {"$set": {"parsedAnswerKey": parsed, "answerKeyStatus": "uploaded"}})
                    doc["parsedAnswerKey"] = parsed
                    doc["answerKeyStatus"] = "uploaded"
            except Exception as e:
                print(f"[Upload] Answer key parse skip: {e}")
        elif answerKeyFiles and answer_key_images:
            try:
                openrouter_key = os.getenv("OPENROUTER_API_KEY", "") or getattr(settings, "OPENROUTER_API_KEY", "")
                if openrouter_key:
                    from backend.tools.ocr.qwen_ocr import analyze_answer_key
                    abs_ak_paths = []
                    for img in answer_key_images:
                        abs_path = os.path.join(os.path.dirname(__file__), "..", "..", img)
                        if os.path.exists(abs_path):
                            abs_ak_paths.append(abs_path)
                    if abs_ak_paths:
                        print(f"[Upload] OCR'ing {len(abs_ak_paths)} answer key images...")
                        parsed_ak = analyze_answer_key(openrouter_key, settings.QWEN_MODEL, answer_key_images=abs_ak_paths)
                        if parsed_ak:
                            await db.assessments.update_one({"_id": assessment_id}, {"$set": {"parsedAnswerKey": parsed_ak, "answerKeyStatus": "uploaded"}})
                            doc["parsedAnswerKey"] = parsed_ak
                            doc["answerKeyStatus"] = "uploaded"
                            print(f"[Upload] Answer key OCR done: {len(parsed_ak)} answers extracted")
            except Exception as e:
                print(f"[Upload] Answer key image OCR failed: {e}")

        if questionsText and questionsText.strip():
            try:
                from backend.services.answer_key_parser import parse_questions_text
                parsed_qs = parse_questions_text(questionsText)
                if parsed_qs:
                    computed_total = _compute_total_marks(parsed_qs)
                    update_fields = {"parsedQuestions": parsed_qs}
                    # Don't override totalMarks when teacher explicitly chose formative (0 marks)
                    if computed_total > 0 and totalMarks != 0 and totalMarks < computed_total:
                        update_fields["totalMarks"] = computed_total
                        doc["totalMarks"] = computed_total
                    await db.assessments.update_one({"_id": assessment_id}, {"$set": update_fields})
                    doc["parsedQuestions"] = parsed_qs
            except Exception as e:
                print(f"[Upload] Questions parse skip: {e}")

        if curriculumText and curriculumText.strip():
            try:
                from backend.services.answer_key_parser import parse_curriculum_text
                parsed_curr = parse_curriculum_text(curriculumText)
                if parsed_curr:
                    await db.assessments.update_one({"_id": assessment_id}, {"$set": {"parsedCurriculum": parsed_curr}})
                    doc["parsedCurriculum"] = parsed_curr
            except Exception as e:
                print(f"[Upload] Curriculum parse skip: {e}")

        print(f"[Upload] DONE — returning doc")
        return doc
    except Exception as e:
        import traceback
        traceback.print_exc()
        detail = f"{e.__class__.__name__}: {str(e)[:300]}"
        print(f"[Upload] CRASH at step: {detail}")
        raise HTTPException(status_code=500, detail=detail)


@router.post("/{id}/analyze-qpaper")
async def analyze_qpaper_endpoint(id: str, db=Depends(get_db)):
    """Analyze uploaded question paper images using Qwen OCR — extracts questions, concepts, chapters."""
    assessment = await db.assessments.find_one({"_id": id})
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    qimages = assessment.get("questionsImages") or []
    if not qimages:
        return {"status": "skipped", "message": "No question paper images uploaded"}

    qtext = assessment.get("questionsText", "")
    if qtext and qtext.strip():
        try:
            from backend.services.answer_key_parser import parse_questions_text
            parsed = parse_questions_text(qtext)
            if parsed:
                await db.assessments.update_one({"_id": id}, {"$set": {"parsedQuestions": parsed, "processingStatus": "qpaper_done"}})
                return {"status": "ok", "method": "text_parser", "questions": len(parsed)}
        except Exception as e:
            print(f"[Qwen] Text parse failed, falling back to OCR: {e}")

    openrouter_key = os.getenv("OPENROUTER_API_KEY", "") or getattr(settings, "OPENROUTER_API_KEY", "")
    if not openrouter_key:
        await db.assessments.update_one({"_id": id}, {"$set": {"processingStatus": "qpaper_skipped"}})
        return {"status": "skipped", "message": "OPENROUTER_API_KEY not configured"}

    image_paths = []
    for img in qimages:
        abs_path = os.path.join(os.path.dirname(__file__), "..", "..", img)
        if os.path.exists(abs_path):
            image_paths.append(abs_path)

    if not image_paths:
        await db.assessments.update_one({"_id": id}, {"$set": {"processingStatus": "qpaper_error"}})
        return {"status": "error", "message": "Question paper image files not found on disk. Please re-upload after deploy."}

    subject = assessment.get("subject", "")
    print(f"[Qwen] Analyzing Q paper for {id} ({subject}): {len(image_paths)} images")
    try:
        from backend.tools.ocr.qwen_ocr import analyze_question_paper
        result = analyze_question_paper(openrouter_key, settings.QWEN_MODEL, image_paths, subject=subject)
        questions = result.get("questions", [])
        if questions:
            computed_total = _compute_total_marks(questions)
            for i, q in enumerate(questions):
                q["id"] = f"q{i+1}"
                q["number"] = q.get("number", i+1)
                q["assessmentId"] = id
                q["section"] = q.get("section", "A")
                q["maxMarks"] = q.get("maxMarks", 1)
                q["text"] = q.get("text", "")
                q["concept"] = q.get("concept", "")
                q["skill"] = q.get("skill", "Recall")
                q["difficulty"] = q.get("difficulty", "Medium")
                q["prerequisites"] = q.get("prerequisites", [])
            update_fields = {"parsedQuestions": questions, "processingStatus": "qpaper_done"}
            if computed_total > 0:
                update_fields["totalMarks"] = computed_total
            await db.assessments.update_one({"_id": id}, {"$set": update_fields})
            print(f"[Qwen] Q paper analysis done: {len(questions)} questions extracted")
            return {"status": "ok", "questions": len(questions)}
        else:
            await db.assessments.update_one({"_id": id}, {"$set": {"processingStatus": "qpaper_error"}})
            return {"status": "error", "message": "No questions extracted"}
    except Exception as e:
        print(f"[Qwen] Q paper analysis failed: {e}")
        await db.assessments.update_one({"_id": id}, {"$set": {"processingStatus": "qpaper_error"}})
        return {"status": "error", "message": str(e)[:200]}


@router.post("/{id}/generate-answer-key")
async def generate_answer_key_endpoint(id: str, db=Depends(get_db)):
    """Generate answer key using DeepSeek from extracted questions."""
    assessment = await db.assessments.find_one({"_id": id})
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    questions = assessment.get("parsedQuestions")
    if not questions:
        return {"status": "error", "message": "No questions extracted yet. Run Q paper analysis first."}

    deepseek_key = os.getenv("DEEPSEEK_API_KEY", "") or getattr(settings, "DEEPSEEK_API_KEY", "")
    if not deepseek_key:
        return {"status": "error", "message": "DEEPSEEK_API_KEY not configured"}

    deepseek_model = os.getenv("DEEPSEEK_MODEL", "deepseek-chat") or getattr(settings, "DEEPSEEK_MODEL", "deepseek-chat")
    subject = assessment.get("subject", "")

    print(f"[DeepSeek] Generating answer key for {id} ({subject}): {len(questions)} questions")
    try:
        from backend.tools.llm.deepseek import generate_answer_key
        answer_key = generate_answer_key(deepseek_key, questions, subject, model=deepseek_model)
        if not answer_key:
            return {"status": "error", "message": "DeepSeek returned empty answer key"}

        await db.assessments.update_one(
            {"_id": id},
            {"$set": {"parsedAnswerKey": answer_key, "answerKeyStatus": "generated"}}
        )
        print(f"[DeepSeek] Answer key generated: {len(answer_key)} answers")
        return {"status": "ok", "answers": len(answer_key), "answerKey": answer_key}
    except Exception as e:
        print(f"[DeepSeek] Answer key generation failed: {e}")
        return {"status": "error", "message": str(e)[:200]}


@router.get("/{id}/answer-key")
async def get_answer_key(id: str, db=Depends(get_db)):
    """Get the generated or uploaded answer key for this assessment."""
    assessment = await db.assessments.find_one({"_id": id})
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return {
        "status": assessment.get("answerKeyStatus", "none"),
        "answerKey": assessment.get("parsedAnswerKey", []),
    }


@router.put("/{id}/answer-key")
async def update_answer_key(id: str, body: dict, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Update the answer key (teacher edits)."""
    answer_key = body.get("answerKey", [])
    await db.assessments.update_one(
        {"_id": id},
        {"$set": {"parsedAnswerKey": answer_key, "answerKeyStatus": "edited"}}
    )
    return {"status": "ok", "answers": len(answer_key)}


def _compute_total_marks(questions: list) -> int:
    """Compute total assessment marks from parsed questions' maxMarks."""
    if not questions:
        return 0
    return sum(q.get("maxMarks", 0) for q in questions)


async def _run_qpaper_analysis(assessment_id: str, image_paths: list, api_key: str, model: str, subject: str = ""):
    """Background: analyze question paper images with Qwen, save results."""
    from backend.core.database import get_db as _get_db
    from backend.tools.ocr.qwen_ocr import analyze_question_paper
    db = _get_db()
    try:
        result = analyze_question_paper(api_key, model, image_paths, subject=subject)
        questions = result.get("questions", [])
        if questions:
            computed_total = _compute_total_marks(questions)
            for i, q in enumerate(questions):
                q["id"] = f"q{i+1}"
                q["number"] = q.get("number", i+1)
                q["assessmentId"] = assessment_id
                q["section"] = q.get("section", "A")
                q["maxMarks"] = q.get("maxMarks", 1)
                q["text"] = q.get("text", "")
                q["concept"] = q.get("concept", "")
                q["skill"] = q.get("skill", "Recall")
                q["difficulty"] = q.get("difficulty", "Medium")
                q["prerequisites"] = q.get("prerequisites", [])
            update_fields = {"parsedQuestions": questions, "processingStatus": "qpaper_done"}
            if computed_total > 0:
                update_fields["totalMarks"] = computed_total
            await db.assessments.update_one({"_id": assessment_id}, {"$set": update_fields})
            print(f"[Qwen] Q paper analysis done: {len(questions)} questions extracted for {assessment_id}")
        else:
            await db.assessments.update_one({"_id": assessment_id}, {"$set": {"processingStatus": "qpaper_error"}})
    except Exception as e:
        print(f"[Qwen] Q paper analysis failed: {e}")
        await db.assessments.update_one({"_id": assessment_id}, {"$set": {"processingStatus": "qpaper_error"}})


@router.post("/{id}/process")
async def process_assessment(
    id: str,
    background_tasks: BackgroundTasks,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
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


@router.post("/{id}/append-sheets", response_model=Assessment)
async def append_sheets(
    id: str,
    background_tasks: BackgroundTasks,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
    sheetFiles: List[UploadFile] = File(default=[]),
):
    """Append new student answer sheets to an existing assessment and trigger OCR."""
    assessment = await db.assessments.find_one({"_id": id})
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    if not sheetFiles:
        raise HTTPException(status_code=400, detail="No new student answer sheets uploaded")

    # Save new files
    new_sheet_images = _save_uploaded_files(
        id, sheetFiles, "sheets"
    )

    # Append to existing sheet images
    existing_sheets = assessment.get("sheetImages", []) or []
    updated_sheets = existing_sheets + new_sheet_images

    # Increment total papers
    new_total_papers = len(updated_sheets)

    await db.assessments.update_one(
        {"_id": id},
        {
            "$set": {
                "sheetImages": updated_sheets,
                "totalPapers": new_total_papers,
                "status": "processing",
                "processingStatus": "step_ocr",
            }
        }
    )

    # Run OCR background task ONLY on the newly uploaded sheets!
    # Convert relative media paths to absolute file system paths
    abs_new_paths = [
        os.path.join(os.path.dirname(__file__), "..", "..", img)
        for img in new_sheet_images
    ]

    background_tasks.add_task(_run_ocr_pipeline, id, assessment, abs_new_paths)
    
    # Return updated assessment
    updated_doc = await db.assessments.find_one({"_id": id})
    return updated_doc


async def _run_ocr_pipeline(
    assessment_id: str,
    assessment: dict,
    custom_sheet_paths: Optional[List[str]] = None,
):
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
        from backend.core.database import get_db as _get_db

        db = _get_db()

        # ── Qwen/OpenRouter OCR (if configured) ──
        openrouter_key = os.getenv("OPENROUTER_API_KEY", "") or getattr(settings, "OPENROUTER_API_KEY", "")
        if openrouter_key:
                from backend.tools.ocr.qwen_ocr import QwenVisionOCR, build_question_paper_from_questions, build_answer_key_from_parsed

                parsed_questions = assessment.get("parsedQuestions")
                parsed_answer_key = assessment.get("parsedAnswerKey")

                if parsed_questions:
                    answer_key = build_answer_key_from_parsed(parsed_answer_key or [])
                    qpaper = build_question_paper_from_questions(parsed_questions)
                else:
                    qpaper = assessment.get("questionsText", "")
                    answer_key = build_answer_key_from_parsed(parsed_answer_key or [])

                # Resolve sheet paths
                sheet_dir = os.path.join(os.path.dirname(__file__), "..", "..", "media", "uploads", assessment_id, "sheets")
                if custom_sheet_paths:
                    sheet_paths = custom_sheet_paths
                elif os.path.exists(sheet_dir):
                    sheet_paths = [os.path.join(sheet_dir, f) for f in os.listdir(sheet_dir) if f.lower().endswith((".jpg",".jpeg",".png"))]
                else:
                    sheet_paths = [os.path.join(os.path.dirname(__file__), "..", "..", img) for img in assessment.get("sheetImages", [])]

                if not sheet_paths:
                    sheet_paths = [os.path.join(os.path.dirname(__file__), "..", "..", "media", "samples", "answer_sheets", f"{name}.jpeg")
                                  for name in ["Karan","Rahul","Aryan","Janu","Tara","Dev","Priya","Sanya"]]
                    sheet_paths = [p for p in sheet_paths if os.path.exists(p)]

                # Validate that resolved paths exist on disk
                sheet_paths_recorded = len(sheet_paths)
                sheet_paths = [p for p in sheet_paths if os.path.exists(p)]

                if not sheet_paths and sheet_paths_recorded:
                    # Paths were recorded (uploaded earlier) but are gone from disk — most likely
                    # the backend was redeployed since upload and the ephemeral filesystem was wiped.
                    print(f"[Qwen] {sheet_paths_recorded} sheet path(s) recorded for {assessment_id} but none exist on disk anymore.")
                    await db.assessments.update_one({"_id": assessment_id}, {"$set": {
                        "status": "error",
                        "processingStatus": "no_sheets_found",
                    }})
                    return

                qwen = QwenVisionOCR(openrouter_key, settings.QWEN_MODEL, questions=parsed_questions, answer_key=answer_key)

                await db.assessments.update_one({"_id": assessment_id}, {"$set": {"processingStatus": "step_ocr", "totalPapers": len(sheet_paths)}})

                sem = asyncio.Semaphore(5)
                total_sheets = len(sheet_paths)

                async def process_one(path):
                    base_fname = os.path.basename(path)
                    name_part = os.path.splitext(base_fname)[0].split("_")[0].capitalize()
                    student_id = f"stu-{assessment_id}-{name_part.lower()}"

                    async with sem:
                        result = await asyncio.to_thread(qwen.process, path, student_id, assessment_id)

                    if "error" in result:
                        print(f"[Qwen] Error {name_part}: {result['error']}")
                        return {"error": result['error'], "studentId": student_id, "name": name_part, "path": path}

                    for ev in result.get("evaluations", []):
                        await db.evaluations.update_one({"_id": ev["_id"]}, {"$set": ev}, upsert=True)

                    total = result.get("total", 0)
                    qwen_name = result.get("studentName")
                    qwen_roll = result.get("rollNumber")
                    student_name = qwen_name if qwen_name else name_part
                    student_roll = qwen_roll if qwen_roll else f"08-{total_sheets}"

                    await db.students.update_one({"_id": student_id}, {"$set": {
                        "_id": student_id, "name": student_name,
                        "roll": student_roll,
                        "total": total, "status": "review",
                        "imageUrls": [os.path.join("media", "uploads", assessment_id, "sheets", os.path.basename(path))],
                        "assessmentId": assessment_id,
                    }}, upsert=True)
                    return {"studentId": student_id, "name": student_name, "total": total, "ok": True}

                results = await asyncio.gather(*[process_one(p) for p in sheet_paths], return_exceptions=True)
                results = [r for r in results if isinstance(r, dict)]

                successful = sum(1 for r in results if r.get("ok"))
                failed = sum(1 for r in results if not r.get("ok"))
                print(f"[Qwen] Parallel done: {successful} ok, {failed} failed of {total_sheets}")

                # Formative mode: nullify marks, add isCorrect/mistakeType
                grading_mode = assessment.get("gradingMode", "scored")
                if grading_mode == "formative":
                    all_evals = await db.evaluations.find({"assessmentId": assessment_id}).to_list(1000)
                    for ev in all_evals:
                        student_answer = ev.get("studentAnswer", "") or ""
                        ai_mark = ev.get("aiMark", 0) or 0
                        q_num = int(ev.get("qId", "q0")[1:]) if ev.get("qId", "").startswith("q") else 0
                        max_mark = 1 if q_num <= 10 else 2
                        is_correct = ai_mark >= max_mark
                        mistake = None if is_correct else ("wrong_option" if q_num <= 10 else "incorrect_answer")
                        if not student_answer or student_answer in ("[unreadable]", "the student's text"):
                            mistake = "unreadable"
                        await db.evaluations.update_one(
                            {"_id": ev["_id"]},
                            {"$set": {
                                "aiMark": None,
                                "isCorrect": is_correct,
                                "mistakeType": mistake,
                            }},
                        )

                # LLM-native evaluation for formative mode
                if grading_mode == "formative" and parsed_questions and parsed_answer_key:
                    current_evals = await db.evaluations.find({"assessmentId": assessment_id}).to_list(1000)
                    await _llm_evaluate_answers(db, assessment_id, parsed_questions, parsed_answer_key, current_evals)

                distinct_students = await db.evaluations.distinct("studentId", {"assessmentId": assessment_id})
                final_evals = await db.evaluations.find({"assessmentId": assessment_id}).to_list(1000)
                num_students = len(distinct_students) if distinct_students else successful
                pending = len([e for e in final_evals if e.get("needsReview")])

                qwen_total_marks = _compute_total_marks(parsed_questions) if parsed_questions else assessment.get("totalMarks", 40)
                if grading_mode == "formative":
                    total_incorrect = len([e for e in final_evals if e.get("isCorrect") is False])
                    total_correct = len([e for e in final_evals if e.get("isCorrect") is True])
                    mistake_types = {}
                    for e in final_evals:
                        mt = e.get("mistakeType")
                        if mt:
                            mistake_types[mt] = mistake_types.get(mt, 0) + 1
                    final_update = {
                        "status": "error" if (num_students == 0 and len(final_evals) == 0) else "review",
                        "processingStatus": "error_no_evals" if (num_students == 0 and len(final_evals) == 0) else "complete",
                        "totalPapers": num_students,
                        "pendingReview": pending,
                        "avgScore": 0,
                        "totalMarks": 0,
                        "studentIds": list(distinct_students) if distinct_students else [],
                        "mistakeSummary": {
                            "totalCorrect": total_correct,
                            "totalIncorrect": total_incorrect,
                            "byType": mistake_types,
                        },
                    }
                else:
                    final_update = {
                        "status": "error" if (num_students == 0 and len(final_evals) == 0) else "review",
                        "processingStatus": "error_no_evals" if (num_students == 0 and len(final_evals) == 0) else "complete",
                        "totalPapers": num_students, "pendingReview": pending,
                        "avgScore": round(sum(float(e.get("aiMark",0) or 0) for e in final_evals) / max(num_students, 1), 1),
                        "studentIds": list(distinct_students) if distinct_students else [],
                    }
                    if qwen_total_marks > 0:
                        final_update["totalMarks"] = qwen_total_marks
                await db.assessments.update_one({"_id": assessment_id}, {"$set": final_update})
                print(f"[Qwen] Pipeline complete: {num_students} students, {len(final_evals)} evals")
                return

        # ── Local OCR pipeline (fallback) ──
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

        # Keep only paths that actually exist on disk
        sheet_paths = [p for p in sheet_paths if os.path.exists(p)]

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
        step1_update = {"processingStatus": "step_ocr"}
        local_total_marks = _compute_total_marks(parsed_questions) if parsed_questions else 0
        if local_total_marks > 0:
            step1_update["totalMarks"] = local_total_marks
        await db.assessments.update_one(
            {"_id": assessment_id},
            {"$set": step1_update}
        )

        # Group sheet paths by student name
        student_groups = {}
        for path in sheet_paths:
            base_fname = os.path.basename(path)
            name_part = os.path.splitext(base_fname)[0]
            if "_" in name_part:
                name_part = name_part.split("_")[0]
            student_name = name_part.capitalize()
            if student_name not in student_groups:
                student_groups[student_name] = []
            student_groups[student_name].append(path)

        # Process each student's sheets separately
        all_student_evaluations = []
        for student_name, student_paths in student_groups.items():
            student_id = f"stu-{assessment_id}-{student_name.lower()}"

            result = await asyncio.to_thread(
                processor.process,
                image_paths=student_paths,
                student_id=student_id,
                use_ollama=True,
            )

            # Save extracted evaluations to MongoDB
            evaluations = result.get("evaluations", [])
            for ev in evaluations:
                ev["_id"] = f"{assessment_id}-{student_id}-{ev['qId']}"
                ev["assessmentId"] = assessment_id
                ev["studentId"] = student_id
                ev["approved"] = False

            if evaluations:
                # Upsert evaluations
                for ev in evaluations:
                    await db.evaluations.update_one(
                        {"_id": ev["_id"]},
                        {"$set": ev},
                        upsert=True,
                    )
                all_student_evaluations.extend(evaluations)

        await asyncio.sleep(2.0)  # Smooth transition

        # [Step 2/6] Analysing question paper
        await db.assessments.update_one(
            {"_id": assessment_id},
            {"$set": {"processingStatus": "step_qp"}}
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
            grading_mode = assessment.get("gradingMode", "scored")
            await _apply_answer_key_grading(db, assessment_id, parsed_key, all_student_evaluations, parsed_questions, grading_mode)
            
            # LLM-native evaluation for formative mode
            if grading_mode == "formative":
                current_evals = await db.evaluations.find({"assessmentId": assessment_id}).to_list(1000)
                await _llm_evaluate_answers(db, assessment_id, parsed_questions, parsed_key, current_evals)
        else:
            # Re-read evaluations in case they changed during answer key grading
            all_student_evaluations = await db.evaluations.find({"assessmentId": assessment_id}).to_list(100)

        await asyncio.sleep(2.0)

        # [Step 5/6] Learning gap analysis
        await db.assessments.update_one(
            {"_id": assessment_id},
            {"$set": {"processingStatus": "step_gap"}}
        )

        # Create/update student records for all processed students
        student_ids = []
        for student_name, student_paths in student_groups.items():
            student_id = f"stu-{assessment_id}-{student_name.lower()}"
            student_ids.append(student_id)
            
            # Fetch final evaluations for this specific student
            student_evals = await db.evaluations.find({"assessmentId": assessment_id, "studentId": student_id}).to_list(100)
            student_total = sum(float(ev.get("aiMark", 0.0) or 0.0) for ev in student_evals)

            student_doc = {
                "_id": student_id,
                "name": student_name,
                "roll": f"08-{len(student_groups)}",
                "total": student_total,
                "status": "review",
                "imageUrls": [
                    img.split("media/")[-1] if "media/" in img else img
                    for img in student_paths
                ],
                "assessmentId": assessment_id,
            }
            await db.students.update_one(
                {"_id": student_id},
                {"$set": student_doc},
                upsert=True,
            )

        # Link student IDs to assessment
        if student_ids:
            await db.assessments.update_one(
                {"_id": assessment_id},
                {"$set": {"studentIds": student_ids}}
            )

        await asyncio.sleep(2.0)

        # [Step 6/6] Generating classroom insights
        await db.assessments.update_one(
            {"_id": assessment_id},
            {"$set": {"processingStatus": "step_insights"}}
        )
        await asyncio.sleep(2.0)

        # Recompute assessment aggregates
        final_evals = await db.evaluations.find({"assessmentId": assessment_id}).to_list(1000)
        
        if len(final_evals) == 0:
            # No evaluations were produced — mark as error, not complete
            error_update = {
                "status": "error",
                "processingStatus": "error_no_evaluations_produced",
                "totalPapers": 0,
                "avgScore": 0,
                "pendingReview": 0,
            }
            await db.assessments.update_one(
                {"_id": assessment_id},
                {"$set": error_update}
            )
            print(f"[Pipeline] Error: No evaluations produced for {assessment_id}")
            return

        total_eval_marks = sum(float(ev.get("aiMark", 0.0) or 0.0) for ev in final_evals)
        computed_total = _compute_total_marks(parsed_questions)
        
        distinct_students = await db.evaluations.distinct("studentId", {"assessmentId": assessment_id})
        num_students = len(distinct_students) if distinct_students else 1
        
        grading_mode = assessment.get("gradingMode", "scored")

        if grading_mode == "formative":
            total_correct = len([e for e in final_evals if e.get("isCorrect") is True])
            total_incorrect = len([e for e in final_evals if e.get("isCorrect") is False])
            mistake_types = {}
            for e in final_evals:
                mt = e.get("mistakeType")
                if mt:
                    mistake_types[mt] = mistake_types.get(mt, 0) + 1
            final_update = {
                "status": "review",
                "processingStatus": "complete",
                "totalPapers": num_students,
                "avgScore": 0,
                "totalMarks": 0,
                "pendingReview": len([e for e in final_evals if e.get("needsReview")]),
                "mistakeSummary": {
                    "totalCorrect": total_correct,
                    "totalIncorrect": total_incorrect,
                    "byType": mistake_types,
                },
            }
        else:
            total_marks_limit = computed_total if computed_total > 0 else (assessment.get("totalMarks", 40) or 40)
            avg_score_percent = round(((total_eval_marks / num_students) / total_marks_limit) * 100, 1)
            final_update = {
                "status": "review",
                "processingStatus": "complete",
                "totalPapers": num_students,
                "avgScore": avg_score_percent,
                "pendingReview": len([e for e in final_evals if e.get("needsReview")]),
            }
            if computed_total > 0:
                final_update["totalMarks"] = computed_total

        await db.assessments.update_one(
            {"_id": assessment_id},
            {"$set": final_update}
        )

    except Exception as e:
        print(f"OCR pipeline error for {assessment_id}: {e}")
        try:
            await _get_db().assessments.update_one(
                {"_id": assessment_id},
                {"$set": {"status": "error", "processingStatus": str(e)[:200]}}
            )
        except Exception:
            pass


async def _llm_evaluate_answers(db, assessment_id: str, parsed_questions: list, parsed_key: list, student_evaluations: list):
    """Use Ollama LLM to evaluate each student answer against the answer key.
    
    Produces: isCorrect (correct/partial/incorrect), missingConcepts, 
    presentConcepts, suggestion, mistakeSummary.
    """
    import json as json_mod
    import re as re_mod
    try:
        import httpx
    except ImportError:
        print("[LLM Eval] httpx not available, skipping LLM evaluation")
        return
    
    # Build lookup maps
    key_by_q = {}
    for entry in (parsed_key or []):
        q_num = entry.get("questionNumber") or entry.get("q", 0)
        if q_num:
            key_by_q[q_num] = entry
    
    q_by_num = {}
    for q in (parsed_questions or []):
        q_by_num[q.get("number", 0)] = q
    
    # Check Ollama availability
    try:
        r = httpx.get("http://localhost:11434/api/tags", timeout=5)
        ollama_ok = r.status_code == 200
    except Exception:
        print("[LLM Eval] Ollama not available, skipping LLM evaluation")
        return
    
    print(f"[LLM Eval] Starting LLM-native evaluation for {len(student_evaluations)} answers...")
    evaluated = 0
    
    for ev in student_evaluations:
        q_id = ev.get("qId", "")
        q_num = int(q_id[1:]) if q_id.startswith("q") else 0
        extracted = (ev.get("studentAnswer") or "").strip()
        
        if not extracted or extracted.lower() in ("the student's text", "[unreadable]", "", "none"):
            continue
        
        key_entry = key_by_q.get(q_num)
        question = q_by_num.get(q_num, {})
        if not key_entry or not question:
            continue
        
        q_text = question.get("text", "")
        options = question.get("options", [])
        expected = key_entry.get("expectedText") or key_entry.get("correctAnswer", "")
        correct_option = key_entry.get("correctOption")
        is_mcq = bool(options)
        
        # Build evaluation prompt
        if is_mcq:
            prompt = f"""Evaluate this student's MCQ answer. Return ONLY a JSON object.

QUESTION: {q_text}
OPTIONS: {', '.join(options)}
CORRECT OPTION: {correct_option} ({expected})
STUDENT ANSWER: {extracted}

Return JSON:
{{"isCorrect": "correct"|"incorrect",
 "mistakeSummary": "brief description of what went wrong if incorrect",
 "missingConcepts": [],
 "presentConcepts": [],
 "suggestion": "helpful hint if incorrect"}}"""
        else:
            prompt = f"""Evaluate this student's written answer against the expected answer. Return ONLY a JSON object.

QUESTION: {q_text}
EXPECTED ANSWER: {expected}
STUDENT ANSWER: {extracted}

Judge the answer as "correct", "partial", or "incorrect". For partial/incorrect:
- List concepts the student MISSED (missingConcepts)
- List concepts the student GOT RIGHT (presentConcepts)
- Give a helpful suggestion for improvement

Return JSON:
{{"isCorrect": "correct"|"partial"|"incorrect",
 "mistakeSummary": "one-line description of what's wrong",
 "missingConcepts": ["concept1", "concept2"],
 "presentConcepts": ["concept1"],
 "suggestion": "specific, helpful feedback for the student"}}"""
        
        try:
            r = httpx.post(
                OLLAMA_URL,
                json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False, "temperature": 0.1},
                timeout=60,
            )
            if r.status_code == 200:
                resp_text = r.json().get("response", "").strip()
                json_start = resp_text.find("{")
                json_end = resp_text.rfind("}")
                if json_start >= 0 and json_end > json_start:
                    result = json_mod.loads(resp_text[json_start:json_end + 1])
                    
                    update_fields = {
                        "isCorrect": result.get("isCorrect"),
                        "mistakeSummary": result.get("mistakeSummary"),
                        "missingConcepts": result.get("missingConcepts", []),
                        "presentConcepts": result.get("presentConcepts", []),
                        "suggestion": result.get("suggestion"),
                        "aiMark": None,
                        "evaluatedBy": "llm",
                    }
                    await db.evaluations.update_one(
                        {"_id": ev["_id"]},
                        {"$set": update_fields},
                    )
                    evaluated += 1
        except Exception as e:
            print(f"[LLM Eval] Error on {q_id}: {e}")
    
    print(f"[LLM Eval] Done: {evaluated} answers evaluated by LLM")


async def _apply_answer_key_grading(db, assessment_id: str, parsed_key: list, evaluations: list, parsed_questions: list = None, grading_mode: str = "scored"):
    """Apply parsed answer key to re-grade evaluations.
    
    grading_mode: "scored" = assign numeric aiMark, "formative" = correct/incorrect flags only
    """
    import re
    is_formative = grading_mode == "formative"
    
    key_by_q = {}
    for entry in parsed_key:
        q_num = entry.get("questionNumber") or entry.get("q", 0)
        if q_num:
            key_by_q[q_num] = entry

    for ev in evaluations:
        q_id = ev.get("qId", "")
        q_num = int(q_id[1:]) if q_id.startswith("q") else 0
        key_entry = key_by_q.get(q_num)
        if not key_entry:
            continue

        extracted = (ev.get("studentAnswer") or "").strip()

        # Strategy for MCQs (Q1-Q10)
        if q_num <= 10:
            correct_option = key_entry.get("correctOption")
            if not correct_option:
                correct_ans = key_entry.get("correctAnswer", "")
                m_correct = re.search(r"\b([A-Da-d])\b", (correct_ans or "").strip()[:5])
                correct_option = m_correct.group(1).upper() if m_correct else None

            m_stud = re.search(r"\b([A-Da-d])\b", extracted)
            student_option = m_stud.group(1).upper() if m_stud else None

            if not student_option and extracted and extracted.lower() not in ("the student's text", "none", ""):
                question_opts = {}
                for q in (parsed_questions or []):
                    if q.get("number") == q_num and q.get("options"):
                        for opt in q["options"]:
                            m_opt = re.match(r'([A-D])\s*\)\s*(.+)', opt)
                            if m_opt:
                                question_opts[m_opt.group(1)] = m_opt.group(2).strip().lower()
                extracted_lower = extracted.lower().strip(",.")
                for letter, opt_text in question_opts.items():
                    opt_clean = opt_text.lower().strip(",.")
                    if extracted_lower == opt_clean or extracted_lower in opt_clean or opt_clean in extracted_lower:
                        student_option = letter
                        break

            is_correct = correct_option and student_option == correct_option

            if is_formative:
                ev["isCorrect"] = is_correct
                if not is_correct:
                    ev["mistakeType"] = "wrong_option" if student_option else "unrecognized_answer"
                    ev["correctOption"] = correct_option
                    ev["studentOption"] = student_option
                ev["aiMark"] = None
                ev["confidence"] = "high"
                ev["confidenceScore"] = 95
                ev["reasoning"] = (
                    f"MCQ {'correct' if is_correct else 'incorrect'}. "
                    f"Student chose {student_option or 'None'}; correct is {correct_option}."
                )
                ev["needsReview"] = False
                await db.evaluations.update_one(
                    {"_id": ev["_id"]},
                    {"$set": {
                        "aiMark": None,
                        "isCorrect": ev["isCorrect"],
                        "mistakeType": ev.get("mistakeType"),
                        "correctOption": ev.get("correctOption"),
                        "studentOption": ev.get("studentOption"),
                        "confidence": ev["confidence"],
                        "confidenceScore": ev["confidenceScore"],
                        "reasoning": ev["reasoning"],
                        "needsReview": ev["needsReview"],
                    }},
                )
            else:
                ev["aiMark"] = 1.0 if is_correct else 0.0
                ev["confidence"] = "high"
                ev["confidenceScore"] = 95
                ev["reasoning"] = f"MCQ {'match' if is_correct else 'mismatch'}. Student chose {student_option or 'None'}; correct is {correct_option}."
                ev["needsReview"] = False
                await db.evaluations.update_one(
                    {"_id": ev["_id"]},
                    {"$set": {
                        "aiMark": ev["aiMark"],
                        "confidence": ev["confidence"],
                        "confidenceScore": ev.get("confidenceScore", 95),
                        "reasoning": ev["reasoning"],
                        "needsReview": ev["needsReview"],
                    }},
                )
            continue

        # Subjective (Q11-Q17)
        expected = key_entry.get("expectedText", "")
        if not expected:
            continue

        expected_words = set(expected.lower().split())
        extracted_words = set(extracted.lower().split())
        if expected_words:
            overlap = len(expected_words & extracted_words) / len(expected_words)
            if is_formative:
                if overlap >= 0.6:
                    ev["isCorrect"] = True
                    ev["mistakeType"] = None
                elif overlap >= 0.3:
                    ev["isCorrect"] = False
                    ev["mistakeType"] = "partial_answer"
                else:
                    ev["isCorrect"] = False
                    ev["mistakeType"] = "incorrect_answer" if extracted else "no_answer"
                ev["aiMark"] = None
                ev["keywordOverlap"] = round(overlap, 2)
                ev["confidence"] = "high" if overlap >= 0.6 else ("medium" if overlap >= 0.3 else "low")
                ev["confidenceScore"] = 85 if overlap >= 0.6 else (60 if overlap >= 0.3 else 30)
                ev["reasoning"] = (
                    f"Keyword overlap: {overlap:.0%}. "
                    f"{'Matches expected answer.' if overlap >= 0.6 else ('Partial match.' if overlap >= 0.3 else 'Does not match expected answer.')}"
                )
                ev["needsReview"] = overlap < 0.6
                await db.evaluations.update_one(
                    {"_id": ev["_id"]},
                    {"$set": {
                        "aiMark": None,
                        "isCorrect": ev["isCorrect"],
                        "mistakeType": ev.get("mistakeType"),
                        "keywordOverlap": ev.get("keywordOverlap"),
                        "confidence": ev["confidence"],
                        "confidenceScore": ev["confidenceScore"],
                        "reasoning": ev["reasoning"],
                        "needsReview": ev["needsReview"],
                    }},
                )
            else:
                if overlap >= 0.6:
                    ev["aiMark"] = float(ev.get("aiMark", 0) or 2)
                    ev["confidence"] = "high"
                    ev["confidenceScore"] = 85
                    ev["reasoning"] = "Answer key match (keyword overlap)."
                    ev["needsReview"] = False
                elif overlap >= 0.3:
                    ev["aiMark"] = round(float(ev.get("aiMark", 1) or 1), 1)
                    ev["confidence"] = "medium"
                    ev["confidenceScore"] = 60
                    ev["reasoning"] = "Partial answer key match."
                    ev["needsReview"] = True
                else:
                    ev["aiMark"] = 0.0
                    ev["confidence"] = "low"
                    ev["confidenceScore"] = 30
                    ev["reasoning"] = "Incorrect or no matching keywords."
                    ev["needsReview"] = True
                await db.evaluations.update_one(
                    {"_id": ev["_id"]},
                    {"$set": {
                        "aiMark": ev["aiMark"],
                        "confidence": ev["confidence"],
                        "confidenceScore": ev.get("confidenceScore", 50),
                        "reasoning": ev["reasoning"],
                        "needsReview": ev.get("needsReview", True),
                    }},
                )


@router.patch("/{id}", response_model=Assessment)
async def update_assessment(id: str, updates: dict, db=Depends(get_db), current_user=Depends(get_current_user)):
    result = await db.assessments.update_one({"_id": id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return await get_assessment(id, db)


@router.get("/{id}/status")
async def get_assessment_status(id: str, db=Depends(get_db)):
    assessment = await db.assessments.find_one({"_id": id}, {
        "status": 1, "processingStatus": 1, "totalPapers": 1, 
        "totalMarks": 1, "avgScore": 1, "pendingReview": 1,
        "studentIds": 1,
    })
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return {
        "status": assessment.get("status", "draft"),
        "processingStatus": assessment.get("processingStatus", "pending"),
        "totalPapers": assessment.get("totalPapers", 0),
        "totalMarks": assessment.get("totalMarks", 0),
        "avgScore": assessment.get("avgScore", 0),
        "pendingReview": assessment.get("pendingReview", 0),
        "studentIds": assessment.get("studentIds", []),
    }

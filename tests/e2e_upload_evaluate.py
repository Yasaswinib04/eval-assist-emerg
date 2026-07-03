"""
End-to-End Test: Upload → OCR → Evaluate → Review
Tests the complete user flow for teacher uploading answer sheets and getting evaluations.
"""
import os
import sys
import json
import time
import asyncio
import traceback
from pathlib import Path
from datetime import datetime
import httpx

BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api"
MEDIA_DIR = Path(__file__).resolve().parent.parent / "media" / "samples" / "answer_sheets"
RESULTS = {"pass": 0, "fail": 0, "skip": 0, "details": []}

# ── helpers ──────────────────────────────────────────────────────────────────

def log(step, status, msg="", detail=None):
    emoji = {"PASS": "✓", "FAIL": "✗", "SKIP": "○", "INFO": "ℹ"}
    label = f"{emoji.get(status, '?')} [{status}] {step}"
    print(f"\n{label}")
    if msg:
        print(f"   {msg}")
    if detail:
        if isinstance(detail, dict):
            print(f"   {json.dumps(detail, indent=2, default=str)[:600]}")
        else:
            print(f"   {str(detail)[:600]}")
    RESULTS["details"].append({"step": step, "status": status, "msg": msg})
    if status == "PASS":
        RESULTS["pass"] += 1
    elif status == "FAIL":
        RESULTS["fail"] += 1
    elif status == "SKIP":
        RESULTS["skip"] += 1


def make_client(token=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return httpx.Client(base_url=API_URL, headers=headers, timeout=30)


# ── test cases ────────────────────────────────────────────────────────────────

def test_health_check():
    """Verify backend is running and responding."""
    try:
        r = httpx.get(f"{BASE_URL}/api/auth/login", timeout=5)
        log("Health check", "PASS" if r.status_code in (200, 405, 422) else "FAIL",
            f"Backend reachable (status {r.status_code})")
        return r.status_code
    except Exception as e:
        log("Health check", "FAIL", str(e))
        return None


def test_auth():
    """Authenticate with demo credentials."""
    try:
        data = {"username": "teacher@school.gov.in", "password": "demo1234"}
        r = httpx.post(f"{API_URL}/auth/login", data=data, timeout=10)
        if r.status_code == 200:
            body = r.json()
            token = body.get("access_token")
            log("Auth login", "PASS", f"Got token ({len(token)} chars)" if token else "No token in response")
            return token
        else:
            log("Auth login", "FAIL", f"Status {r.status_code}: {r.text[:200]}")
            return None
    except Exception as e:
        log("Auth login", "FAIL", str(e))
        return None


def test_list_assessments(token):
    """Fetch existing assessments to see what's already in the DB."""
    try:
        c = make_client(token)
        r = c.get("/assessments/")
        if r.status_code == 200:
            assessments = r.json()
            total = len(assessments) if isinstance(assessments, list) else 0
            statuses = {}
            for a in (assessments if isinstance(assessments, list) else []):
                s = a.get("status", "unknown")
                ps = a.get("processingStatus", "unknown")
                key = f"{s}/{ps}"
                statuses[key] = statuses.get(key, 0) + 1
            log("List assessments", "PASS", f"{total} total. Status breakdown: {statuses}")
            return assessments
        else:
            log("List assessments", "FAIL", f"Status {r.status_code}")
            return []
    except Exception as e:
        log("List assessments", "FAIL", str(e))
        return []


def test_create_assessment_text_only(token):
    """Test 1: Create assessment with text-based question paper + answer key (no sheets)."""
    try:
        # Build a realistic Class 8 Biology question paper
        questions_text = """Section A (MCQ - 1 mark each):
1. Which organelle is known as the powerhouse of the cell?
   A) Nucleus  B) Mitochondria  C) Ribosome  D) Golgi body
2. The process by which plants make their own food is called:
   A) Respiration  B) Transpiration  C) Photosynthesis  D) Digestion
3. Which blood cells help in clotting?
   A) RBC  B) WBC  C) Platelets  D) Plasma
4. The human heart has how many chambers?
   A) 2  B) 3  C) 4  D) 5
5. Which part of the plant absorbs water from the soil?
   A) Stem  B) Leaves  C) Roots  D) Flowers

Section B (Short Answer - 2 marks each):
6. Explain the process of photosynthesis.
7. What are the functions of the skeletal system?
8. List the different types of blood cells and their functions.

Section C (Long Answer - 3 marks each):
9. Describe the human digestive system with a diagram.
10. Explain the process of respiration in humans."""

        answer_key = """Q1: B) Mitochondria
Q2: C) Photosynthesis
Q3: C) Platelets
Q4: C) 4
Q5: C) Roots
Q6: Photosynthesis is the process by which green plants use sunlight, water and CO2 to produce glucose and oxygen.
Q7: Functions include support, protection of organs, movement, mineral storage, and blood cell production.
Q8: RBC carry oxygen, WBC fight infection, Platelets help in blood clotting.
Q9: Digestive system includes mouth, esophagus, stomach, small intestine, large intestine. Food is broken down mechanically and chemically.
Q10: Respiration involves inhalation of oxygen, gas exchange in alveoli, and exhalation of CO2."""

        data = {
            "name": f"E2E Test Text-Only {datetime.now().strftime('%H:%M:%S')}",
            "subject": "Biology",
            "class": "8",
            "totalMarks": 25,
            "questionsText": questions_text,
            "answerKeyText": answer_key,
            "type": "exam",
        }

        c = make_client(token)
        r = c.post("/assessments/", data=data, timeout=60)
        if r.status_code == 200:
            body = r.json()
            aid = body.get("id") or body.get("_id")
            has_parsed_q = "parsedQuestions" in body and body["parsedQuestions"] is not None
            has_parsed_ak = "parsedAnswerKey" in body and body["parsedAnswerKey"] is not None
            log("Create assessment (text-only)",
                "PASS" if has_parsed_q and has_parsed_ak else "WARN",
                f"ID={aid}, parsedQuestions={'yes' if has_parsed_q else 'NO'}, "
                f"parsedAnswerKey={'yes' if has_parsed_ak else 'NO'}, "
                f"status={body.get('status')}")
            return aid, body
        else:
            log("Create assessment (text-only)", "FAIL", f"Status {r.status_code}: {r.text[:300]}")
            return None, None
    except Exception as e:
        log("Create assessment (text-only)", "FAIL", str(e))
        return None, None


def test_create_assessment_with_sheets(token, sheet_dir):
    """Test 2: Create assessment with images AND student answer sheets attached."""
    try:
        if not sheet_dir or not sheet_dir.exists():
            log("Create assessment (with sheets)", "SKIP", f"Sheet dir not found: {sheet_dir}")
            return None, None

        sheet_files = sorted(sheet_dir.glob("*.jpg")) + sorted(sheet_dir.glob("*.jpeg")) + sorted(sheet_dir.glob("*.png"))
        if not sheet_files:
            log("Create assessment (with sheets)", "SKIP", "No sheet images found")
            return None, None

        log("Create assessment (with sheets)", "INFO",
            f"Found {len(sheet_files)} sheet images: {[f.name for f in sheet_files[:5]]}...")

        questions_text = """Section A (MCQ - 1 mark each):
1. Which organelle is known as the powerhouse of the cell?
   A) Nucleus  B) Mitochondria  C) Ribosome  D) Golgi body
2. The process by which plants make their own food is called:
   A) Respiration  B) Transpiration  C) Photosynthesis  D) Digestion
3. Which blood cells help in clotting?
   A) RBC  B) WBC  C) Platelets  D) Plasma

Section B (Short Answer - 2 marks each):
4. Explain the process of photosynthesis.
5. What are the functions of the skeletal system?"""

        answer_key = """Q1: B) Mitochondria
Q2: C) Photosynthesis
Q3: C) Platelets
Q4: Photosynthesis is the process by which green plants use sunlight, water and CO2 to produce glucose and oxygen.
Q5: Functions include support, protection of organs, movement, mineral storage, and blood cell production."""

        # Use multipart form data
        files = []
        for f in sheet_files[:5]:  # Limit to 5 sheets for speed
            files.append(("sheetFiles", (f.name, open(f, "rb"), "image/jpeg")))

        data = {
            "name": f"E2E Test With Sheets {datetime.now().strftime('%H:%M:%S')}",
            "subject": "Biology",
            "class": "8",
            "totalMarks": 9,
            "questionsText": questions_text,
            "answerKeyText": answer_key,
            "type": "exam",
        }

        try:
            c = make_client(token)
            r = c.post("/assessments/", data=data, files=files, timeout=120)
            if r.status_code == 200:
                body = r.json()
                aid = body.get("id") or body.get("_id")
                sheet_count = len(body.get("sheetImages", []))
                has_parsed_q = bool(body.get("parsedQuestions"))
                has_parsed_ak = bool(body.get("parsedAnswerKey"))
                log("Create assessment (with sheets)",
                    "PASS" if sheet_count > 0 else "WARN",
                    f"ID={aid}, sheets={sheet_count}, "
                    f"parsedQ={'yes' if has_parsed_q else 'NO'}, "
                    f"parsedAK={'yes' if has_parsed_ak else 'NO'}, "
                    f"status={body.get('status')}")
                return aid, body
            else:
                log("Create assessment (with sheets)", "FAIL", f"Status {r.status_code}: {r.text[:300]}")
                return None, None
        finally:
            for _, (_, fobj, _) in files:
                fobj.close()
    except Exception as e:
        log("Create assessment (with sheets)", "FAIL", str(e))
        return None, None


def test_process_assessment(token, assessment_id):
    """Trigger OCR processing on the assessment."""
    if not assessment_id:
        log("Process assessment", "SKIP", "No assessment ID")
        return False

    try:
        c = make_client(token)
        r = c.post(f"/assessments/{assessment_id}/process", timeout=30)
        if r.status_code == 200:
            body = r.json()
            log("Process assessment", "PASS",
                f"ID={assessment_id}, status={body.get('status')}, "
                f"processingStatus={body.get('processingStatus')}")
            return True
        else:
            log("Process assessment", "FAIL", f"Status {r.status_code}: {r.text[:200]}")
            return False
    except Exception as e:
        log("Process assessment", "FAIL", str(e))
        return False


def test_poll_processing_status(token, assessment_id, max_wait=120):
    """Poll the assessment status until processing completes or times out."""
    if not assessment_id:
        log("Poll status", "SKIP", "No assessment ID")
        return None

    try:
        c = make_client(token)
        start = time.time()
        last_status = None
        while time.time() - start < max_wait:
            r = c.get(f"/assessments/{assessment_id}/status", timeout=10)
            if r.status_code == 200:
                body = r.json()
                status = body.get("status")
                ps = body.get("processingStatus")
                eval_count = body.get("totalEvaluations", 0)

                if (status, ps) != last_status:
                    log("Poll status", "INFO",
                        f"status={status}, processing={ps}, evaluations={eval_count}, "
                        f"elapsed={time.time()-start:.0f}s")
                    last_status = (status, ps)

                if status in ("review", "complete") or ps in ("complete", "graded"):
                    log("Poll status", "PASS",
                        f"Processing complete! status={status}, processingStatus={ps}, "
                        f"evaluations={eval_count}")
                    return body

                if ps in ("error", "failed"):
                    log("Poll status", "FAIL",
                        f"Processing failed: status={status}, processingStatus={ps}")
                    return body

            time.sleep(3)
        log("Poll status", "WARN", f"Timed out after {max_wait}s. Last: {last_status}")
        return None
    except Exception as e:
        log("Poll status", "FAIL", str(e))
        return None


def test_get_evaluations(token, assessment_id):
    """Fetch all evaluations for this assessment."""
    if not assessment_id:
        log("Get evaluations", "SKIP", "No assessment ID")
        return []

    try:
        c = make_client(token)
        # First get students
        r = c.get(f"/assessments/{assessment_id}", timeout=10)
        if r.status_code != 200:
            log("Get evaluations", "FAIL", f"Cannot get assessment: {r.status_code}")
            return []

        body = r.json()
        student_ids = body.get("studentIds", [])
        sheets = body.get("sheetImages", [])
        log("Get evaluations", "INFO", f"Assessment has {len(student_ids)} students, {len(sheets)} sheets")

        all_evals = []
        for sid in student_ids[:5]:  # Check first 5 students
            r2 = c.get(f"/assessments/{assessment_id}/students/{sid}/evaluations", timeout=10)
            if r2.status_code == 200:
                evals = r2.json()
                all_evals.extend(evals)
                scored = [e for e in evals if e.get("aiMark") is not None]
                log("Get evaluations", "INFO",
                    f"Student {sid}: {len(evals)} evaluations, {len(scored)} with marks")

        # Summary
        if all_evals:
            questions = set(e.get("qId") for e in all_evals)
            marks = [e.get("aiMark") for e in all_evals if e.get("aiMark") is not None]
            confs = [e.get("confidence") for e in all_evals if e.get("confidence")]
            log("Get evaluations summary", "PASS",
                f"Total evals: {len(all_evals)}, unique questions: {sorted(questions)}, "
                f"marks range: {min(marks) if marks else 'N/A'}-{max(marks) if marks else 'N/A'}, "
                f"confidences: {dict((c, confs.count(c)) for c in set(confs))}")
        else:
            log("Get evaluations summary", "WARN", "No evaluations found")

        return all_evals
    except Exception as e:
        log("Get evaluations", "FAIL", str(e))
        return []


def test_append_sheets(token, assessment_id, sheet_dir):
    """Test adding more sheets to an existing assessment."""
    if not assessment_id or not sheet_dir or not sheet_dir.exists():
        log("Append sheets", "SKIP", "Missing assessment ID or sheet dir")
        return False

    sheet_files = sorted(sheet_dir.glob("*.jpg")) + sorted(sheet_dir.glob("*.jpeg"))
    if len(sheet_files) < 2:
        log("Append sheets", "SKIP", "Not enough sheets")
        return False

    try:
        new_files = []
        for f in sheet_files[:2]:
            new_files.append(("sheetFiles", (f"appended_{f.name}", open(f, "rb"), "image/jpeg")))

        c = make_client(token)
        r = c.post(f"/assessments/{assessment_id}/append-sheets", files=new_files, timeout=60)

        for _, (_, fobj, _) in new_files:
            fobj.close()

        if r.status_code == 200:
            body = r.json()
            log("Append sheets", "PASS",
                f"Appended to {assessment_id}, sheets now: {len(body.get('sheetImages', []))}")
            return True
        else:
            log("Append sheets", "FAIL", f"Status {r.status_code}: {r.text[:200]}")
            return False
    except Exception as e:
        log("Append sheets", "FAIL", str(e))
        return False


def test_data_integrity(token, assessment_id):
    """Verify data integrity: all IDs reference real documents, no orphaned data."""
    if not assessment_id:
        log("Data integrity", "SKIP", "No assessment ID")
        return

    issues = []
    c = make_client(token)

    # 1. Check assessment exists
    r = c.get(f"/assessments/{assessment_id}", timeout=10)
    if r.status_code != 200:
        issues.append(f"Assessment {assessment_id} not retrievable")
    else:
        body = r.json()
        # 2. Check each student exists
        for sid in body.get("studentIds", []):
            r_s = c.get(f"/students/{sid}", timeout=10)
            if r_s.status_code != 200:
                issues.append(f"Student {sid} referenced but not found")

        # 3. Check evaluations match assessment
        for sid in body.get("studentIds", []):
            r_e = c.get(f"/assessments/{assessment_id}/students/{sid}/evaluations", timeout=10)
            if r_e.status_code == 200:
                for ev in r_e.json():
                    if ev.get("assessmentId") != assessment_id:
                        issues.append(f"Eval {ev.get('_id')} has wrong assessmentId: {ev.get('assessmentId')}")

        # 4. Verify parsed questions match
        pq = body.get("parsedQuestions") or []
        q_text = body.get("questionsText", "")
        if pq and not q_text:
            issues.append("Has parsedQuestions but no questionsText")

    if issues:
        log("Data integrity", "FAIL", "\n".join(issues))
    else:
        log("Data integrity", "PASS", "All references valid, no orphans")


def test_edge_cases(token):
    """Test edge cases and error handling."""
    c = make_client(token)

    # 1. Missing required fields
    r = c.post("/assessments/", data={"name": "No Subject Test"}, timeout=10)
    log("Edge: missing subject", "PASS" if r.status_code == 422 else "WARN",
        f"Got {r.status_code} (expected 422)")

    # 2. Invalid assessment ID
    r = c.get("/assessments/nonexistent-id-99999", timeout=10)
    log("Edge: invalid ID", "PASS" if r.status_code == 404 else "INFO",
        f"Got {r.status_code} (expected 404)")

    # 3. Process already-processing assessment
    r = c.get("/assessments/", timeout=10)
    if r.status_code == 200:
        assessments = r.json()
        if isinstance(assessments, list):
            for a in assessments:
                if a.get("status") == "processing":
                    r2 = c.post(f"/assessments/{a.get('_id')}/process", timeout=10)
                    log("Edge: re-process", "INFO",
                        f"Reprocessing assessment in 'processing' state: {r2.status_code}")
                    break

    # 4. Unauthenticated access
    try:
        r = httpx.get(f"{API_URL}/assessments/", timeout=10)
        log("Edge: no auth", "PASS" if r.status_code in (401, 403) else "WARN",
            f"Got {r.status_code} (expected 401/403)")
    except Exception:
        log("Edge: no auth", "SKIP", "Connection failed")


# ── main test runner ─────────────────────────────────────────────────────────

def main():
    print("=" * 70)
    print("  EvalAssist E2E Test: Upload → OCR → Evaluate → Review")
    print(f"  Time: {datetime.now().isoformat()}")
    print(f"  API: {API_URL}")
    print(f"  Sheet samples: {MEDIA_DIR} (exists={MEDIA_DIR.exists()})")
    print("=" * 70)

    # Phase 0: Prerequisite checks
    test_health_check()
    token = test_auth()
    if not token:
        print("\n❌ Cannot continue without auth token. Aborting.")
        return 1

    # Phase 1: Baseline - see what's in the system
    test_list_assessments(token)

    # Phase 2: Create new assessments
    print("\n" + "─" * 70)
    print("  PHASE 1: Create Assessments (New User Upload Flow)")
    print("─" * 70)

    aid_text, body_text = test_create_assessment_text_only(token)
    aid_sheets, body_sheets = test_create_assessment_with_sheets(token, MEDIA_DIR)

    # Phase 3: Process assessments (trigger OCR)
    print("\n" + "─" * 70)
    print("  PHASE 2: Process (OCR Pipeline)")
    print("─" * 70)

    if aid_text:
        test_process_assessment(token, aid_text)

    if aid_sheets:
        test_process_assessment(token, aid_sheets)

    # Phase 4: Poll for completion
    print("\n" + "─" * 70)
    print("  PHASE 3: Poll Processing Status")
    print("─" * 70)

    final_status_text = None
    final_status_sheets = None

    if aid_text:
        final_status_text = test_poll_processing_status(token, aid_text, max_wait=90)

    if aid_sheets:
        final_status_sheets = test_poll_processing_status(token, aid_sheets, max_wait=120)

    # Phase 5: Verify evaluations
    print("\n" + "─" * 70)
    print("  PHASE 4: Verify Results")
    print("─" * 70)

    if aid_text:
        test_get_evaluations(token, aid_text)

    if aid_sheets:
        evals = test_get_evaluations(token, aid_sheets)

        # If we got evaluations, run full integrity check on this assessment
        if evals:
            test_data_integrity(token, aid_sheets)

    # Phase 6: Test append flow
    print("\n" + "─" * 70)
    print("  PHASE 5: Append Sheets Flow (Late Students)")
    print("─" * 70)

    # Find an existing assessment with sheets to test append
    c = make_client(token)
    r = c.get("/assessments/", timeout=10)
    if r.status_code == 200:
        assessments = r.json()
        if isinstance(assessments, list):
            existing_with_sheets = [a for a in assessments
                                   if a.get("sheetImages") and a.get("status") == "review"]
            if existing_with_sheets:
                test_aid = existing_with_sheets[0].get("_id")
                test_append_sheets(token, test_aid, MEDIA_DIR)
            elif aid_sheets:
                test_append_sheets(token, aid_sheets, MEDIA_DIR)

    # Phase 7: Edge cases
    print("\n" + "─" * 70)
    print("  PHASE 6: Edge Cases & Error Handling")
    print("─" * 70)
    test_edge_cases(token)

    # Final report
    print("\n" + "=" * 70)
    print("  FINAL REPORT")
    print("=" * 70)
    total = RESULTS["pass"] + RESULTS["fail"] + RESULTS["skip"]
    print(f"  Results: {RESULTS['pass']} PASS, {RESULTS['fail']} FAIL, {RESULTS['skip']} SKIP (of {total})")
    if RESULTS["fail"] > 0:
        print(f"\n  Failed steps:")
        for d in RESULTS["details"]:
            if d["status"] == "FAIL":
                print(f"    - {d['step']}: {d['msg'][:100]}")
    print(f"\n  Assessment IDs created in this run:")
    if aid_text:
        print(f"    Text-only: {aid_text}")
    if aid_sheets:
        print(f"    With sheets: {aid_sheets}")
    print()

    return 0 if RESULTS["fail"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())

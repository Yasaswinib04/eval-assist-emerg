"""
Regenerate seed evaluations using Qwen Vision OCR.

Usage:
  python3 backend/seed/seed_qwen.py

Processes all sample answer sheets in media/samples/answer_sheets/
through Qwen3 VL 235B via OpenRouter and generates fresh evaluations.json.
"""

import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.core.config import settings
from backend.tools.ocr.qwen_ocr import QwenVisionOCR, build_question_paper_text, build_answer_key_json

SAMPLES_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "media", "samples", "answer_sheets")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "data")

STUDENT_MAP = {
    "Karan.jpeg": ("stu-01", "Karan", "08-01"),
    "Rahul.jpeg": ("stu-02", "Rahul", "08-02"),
    "Aryan.jpeg": ("stu-03", "Aryan", "08-03"),
    "Janu.jpeg": ("stu-04", "Janu", "08-04"),
    "TARA_01.jpeg": ("stu-05", "Tara", "08-05"),
    "Dev_01.jpeg": ("stu-06", "Dev", "08-06"),
    "Sanya_01.jpeg": ("stu-07", "Sanya", "08-07"),
    "Priya_01.jpeg": ("stu-08", "Priya", "08-08"),
}


async def regenerate_evaluations():
    api_key = os.getenv("OPENROUTER_API_KEY", settings.OPENROUTER_API_KEY)
    if not api_key:
        print("ERROR: No OPENROUTER_API_KEY found")
        return

    model = os.getenv("QWEN_MODEL", getattr(settings, "QWEN_MODEL", "qwen/qwen3-vl-235b-a22b-instruct"))
    answer_key_path = os.path.join(os.path.dirname(__file__), "data", "answer_key.json")
    answer_key = build_answer_key_json(answer_key_path)
    qpaper = build_question_paper_text()

    qwen = QwenVisionOCR(api_key, model, qpaper, answer_key)

    all_evaluations = {}
    all_students = []

    for filename, (student_id, name, roll) in STUDENT_MAP.items():
        path = os.path.join(SAMPLES_DIR, filename)
        if not os.path.exists(path):
            print(f"Skip {filename} — not found")
            continue

        print(f"\nProcessing {name} ({filename})...")
        result = qwen.process(path, student_id)

        if "error" in result:
            print(f"  ERROR: {result['error']}")
            continue

        evals = result["evaluations"]
        all_evaluations[student_id] = evals
        total = result["total"]
        print(f"  {len(evals)} evaluations, total: {total}/40")

        all_students.append({
            "id": student_id,
            "name": name,
            "roll": roll,
            "total": total,
            "status": "review",
            "imageUrls": [f"/media/samples/answer_sheets/{filename}"],
            "assessmentId": "asm-001",
        })

    evals_path = os.path.join(OUTPUT_DIR, "evaluations.json")
    with open(evals_path, "w") as f:
        evals_out = {}
        for sid, ev_list in all_evaluations.items():
            ev_out = []
            for e in ev_list:
                ev_out.append({
                    "qId": e["qId"],
                    "aiMark": e["aiMark"],
                    "confidence": e["confidence"],
                    "confidenceScore": e.get("confidenceScore", 50),
                    "needsReview": e.get("needsReview", False),
                    "studentAnswer": e.get("studentAnswer", ""),
                    "reasoning": e.get("reasoning", ""),
                })
            evals_out[sid] = ev_out
        json.dump(evals_out, f, indent=2)
    print(f"\nSaved {sum(len(v) for v in all_evaluations.values())} evaluations to {evals_path}")

    students_path = os.path.join(OUTPUT_DIR, "students.json")
    with open(students_path, "w") as f:
        json.dump(all_students, f, indent=2)
    print(f"Saved {len(all_students)} students to {students_path}")

    print("\nDone! Run `backend/seed/seed.py` to load new data into MongoDB.")


if __name__ == "__main__":
    asyncio.run(regenerate_evaluations())

"""Qwen Vision OCR via OpenRouter API.

Single API call per student answer sheet:
  Image → Qwen3 VL 235B → Handwriting OCR → Answer extraction → Grading → Evaluations

No preprocessing, segmentation, or local models needed.
"""

import base64
import json
import os
import time
import requests
from typing import List, Dict, Optional


class QwenVisionOCR:
    def __init__(self, api_key: str, model: str, question_paper_text: str, answer_key: list):
        self.api_key = api_key
        self.model = model
        self.question_paper = question_paper_text
        self.answer_key = answer_key
        self.endpoint = "https://openrouter.ai/api/v1/chat/completions"

    def _build_prompt(self) -> str:
        return f"""You are grading a Class 8 Biological Science SA1 exam. Below is the complete question paper, the answer key, and a scanned image of a student's handwritten answer sheet.

QUESTION PAPER:
{self.question_paper}

ANSWER KEY (correct answers with mark allocation):
{json.dumps(self.answer_key, indent=2, ensure_ascii=False)}

Examine the student's handwritten answer sheet image carefully. For EACH of the 17 questions:
1. Read the student's handwritten answer from the image
2. For MCQs (Q1-Q10): extract which option letter (A/B/C/D) the student circled or wrote
3. For subjective questions (Q11-Q17): extract the full written answer text
4. Compare to the correct answer in the answer key above
5. Assign a mark based on the maxMarks for each question
6. Provide a confidence score (0-100) for your extraction

Return ONLY a JSON array with exactly 17 elements, one per question. No extra text:
[{{"q": 1, "studentAnswer": "...", "mcqChoice": "A", "mark": 1, "maxMarks": 1, "confidence": 95, "correct": true, "reasoning": "Student wrote A which matches correct answer Frog"}}, ...]"""

    def _image_to_base64(self, image_path: str) -> str:
        with open(image_path, "rb") as f:
            return base64.b64encode(f.read()).decode("utf-8")

    def _parse_evaluations(self, raw_json: list, student_id: str) -> List[dict]:
        evaluations = []
        for entry in raw_json:
            q_num = entry.get("q", 0)
            q_id = f"q{q_num}"
            mark = entry.get("mark", 0)
            max_m = entry.get("maxMarks", 1)
            confidence = entry.get("confidence", 50)
            correct = entry.get("correct", False)
            reasoning = entry.get("reasoning", "")
            student_answer = entry.get("studentAnswer", "")
            mcq_choice = entry.get("mcqChoice", "")

            needs_review = confidence < 70 or (q_num == 15) or "diagram" in str(student_answer).lower()

            evaluations.append({
                "_id": f"asm-001-{student_id}-{q_id}",
                "qId": q_id,
                "assessmentId": "asm-001",
                "studentId": student_id,
                "aiMark": float(mark),
                "maxMarks": max_m,
                "confidence": "high" if confidence >= 85 else "medium" if confidence >= 60 else "low",
                "confidenceScore": confidence,
                "needsReview": needs_review,
                "approved": False,
                "studentAnswer": student_answer if student_answer else (mcq_choice if mcq_choice else "[unreadable]"),
                "reasoning": reasoning,
                "correct": correct,
            })
        return evaluations

    def process(self, image_path: str, student_id: str) -> dict:
        if not os.path.exists(image_path):
            return {"error": f"Image not found: {image_path}", "studentId": student_id}

        image_b64 = self._image_to_base64(image_path)
        prompt = self._build_prompt()

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}},
                    ],
                }
            ],
            "max_tokens": 4096,
            "temperature": 0.1,
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://eval-assist-emerg.onrender.com",
            "X-Title": "EvalAssist Demo",
        }

        print(f"[Qwen] Processing {os.path.basename(image_path)} for student {student_id}...")
        print(f"[Qwen] API key: {self.api_key[:20]}... (length: {len(self.api_key)})")
        resp = requests.post(self.endpoint, headers=headers, json=payload, timeout=120)
        resp.raise_for_status()

        data = resp.json()
        content = data["choices"][0]["message"]["content"]

        json_start = content.find("[")
        json_end = content.rfind("]") + 1
        if json_start >= 0 and json_end > json_start:
            content = content[json_start:json_end]

        try:
            raw_evals = json.loads(content)
        except json.JSONDecodeError:
            print(f"[Qwen] Failed to parse JSON response: {content[:200]}...")
            return {"error": "Failed to parse Qwen response", "studentId": student_id}

        evaluations = self._parse_evaluations(raw_evals, student_id)
        total = sum(e["aiMark"] for e in evaluations)
        print(f"[Qwen] {student_id}: {len(evaluations)} evals, total {total}/40")

        return {
            "studentId": student_id,
            "evaluations": evaluations,
            "total": total,
            "maxTotal": 40,
        }


def build_question_paper_text() -> str:
    return """SELF ASSESSMENT TERM 1 MODEL PAPER - 2025-2026
Class: 8 | Subject: Biological Science | 17 Questions | 40 Marks | Duration: 1 hr 30 min

Section A: Multiple Choice Questions (10 x 1 = 10 marks)
Q1. Identify the odd one with respect to their fertilization: A) Frog B) Butterfly C) Hen D) Humans
Q2. Identify the correct statement about IVF: A) Baby develops in test tube B) Fertilization inside female body C) Done when oviducts are blocked D) IVF is asexual
Q3. Best way to prevent Hepatitis A: A) Mosquito nets B) Boiled drinking water C) Insecticides D) Isolation
Q4. Reason for growing wheat in Rabi season: A) Plenty of water B) High temperature C) High humidity D) Cool & dry weather
Q5. Metamorphosis is seen in: A) Frog only B) Frog and Butterfly C) Frog, Butterfly, Hen D) Dog only
Q6. Identify the organism in the picture (single cell with pseudopodia): A) Paramoecium B) Chlamydomonas C) Amoeba D) Spirogyra
Q7. Assertion: Combine is a modern tool for ploughing. Reason: Ploughing makes soil loose and porous. A) Both true, R explains A B) Both true, R doesn't explain A C) A true, R false D) A false, R true
Q8. Best irrigation during drought: A) Drip irrigation B) Moat and chain pump C) Lever system D) Dhekli
Q9. Find the incorrect statement: A) Hydra reproduces by budding B) Amoeba by binary fission C) Cloning is sexual D) Butterfly is oviparous
Q10. Why no chick hatched from market egg? A) Hen only incubates own eggs B) Eggs not fertilised C) Treated with chemicals D) Too small

Section B: Short Answer (3 x 2 = 6 marks)
Q11. What are unwanted plants growing with crops called? How can we control them?
Q12. Raju takes excessive antibiotics. Is it correct? What precautions must be taken?
Q13. Write any two differences between egg and sperm.

Section C: Long Answer (2 x 4 = 8 marks)
Q14. List four food preservation methods used at home with examples.
Q15. Draw a neat labelled diagram of the Female Reproductive System.

Section D: Essay (2 x 8 = 16 marks)
Q16A. i) Which organism causes polio? ii) Give an example of a bacterial disease. iii) How to prevent Malaria? iv) Mode of transmission of Chicken pox?
Q17A. What is asexual reproduction? Explain any two methods with examples."""


def build_answer_key_json(answer_key_path: str = None) -> list:
    if answer_key_path and os.path.exists(answer_key_path):
        with open(answer_key_path) as f:
            return json.load(f)
    raise FileNotFoundError(f"Answer key not found at {answer_key_path}")


def analyze_question_paper(api_key: str, model: str, image_paths: list, answer_key_path: str = None) -> dict:
    """Send question paper images to Qwen to extract questions."""
    if not image_paths:
        return {"error": "No question paper images provided"}

    prompt = """Read every question from this exam paper image. Return ONLY a JSON array of questions:
[
  {"number": 1, "text": "complete question text including all options if MCQ", "section": "A", "maxMarks": 1},
  {"number": 2, "text": "complete question text including all options", "section": "A", "maxMarks": 1},
  ...
]
Include every question you can read. For MCQs, include ALL option choices in the text field. For subjective questions, include the complete question. If you can't read something, skip that question. Return ONLY the JSON array, no other text."""

    results = {"questions": [], "totalMarks": 40, "images": len(image_paths)}
    for i, path in enumerate(image_paths):
        print(f"[Qwen] Analyzing page {i+1}: {os.path.basename(path)}")
        with open(path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")

        payload = {
            "model": model,
            "messages": [{"role": "user", "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
            ]}],
            "max_tokens": 4096, "temperature": 0.1,
        }
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json",
                    "HTTP-Referer": "https://eval-assist-emerg.onrender.com", "X-Title": "EvalAssist"}
        resp = None
        for attempt in range(3):
            resp = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload, timeout=120)
            if resp.status_code == 429:
                print(f"[Qwen] Rate limited, retrying ({attempt+1}/3)...")
                time.sleep(2)
                continue
            break
        resp.raise_for_status()
        data = resp.json()
        if "error" in data:
            raise Exception(f"OpenRouter error: {data['error']}")
        if "choices" not in data:
            raise Exception(f"Unexpected OpenRouter response: {json.dumps(data)[:200]}")
        content = data["choices"][0]["message"]["content"]
        print(f"[Qwen] Raw response ({len(content)} chars): {content[:300]}...")
        try:
            j_start = content.find("[")
            j_end = content.rfind("]") + 1
            if j_start >= 0 and j_end > j_start:
                parsed = json.loads(content[j_start:j_end])
                if isinstance(parsed, list):
                    results["questions"].extend(parsed)
                elif isinstance(parsed, dict) and "questions" in parsed:
                    results["questions"].extend(parsed["questions"])
            else:
                print(f"[Qwen] No JSON array found in response. Trying raw text extraction...")
                lines = [l.strip() for l in content.split("\n") if l.strip() and any(c.isdigit() for c in l[:5])]
                for line in lines[:30]:
                    results["questions"].append({"number": len(results["questions"])+1, "text": line[:200], "section": "?", "maxMarks": 1})
        except Exception as e:
            print(f"[Qwen] Parse error for page {i+1}: {e}")
    return results


def analyze_answer_key(api_key: str, model: str, answer_key_text: str = None, answer_key_images: list = None) -> list:
    """Send answer key text or images to Qwen to extract structured correct answers."""
    if answer_key_text:
        prompt = f"""Extract the correct answers from this answer key text. For each question, provide: question number, correct option (if MCQ), correct answer text, and max marks. Return ONLY a JSON array: [{{"q": 1, "correctOption": "A", "correctAnswer": "Frog", "maxMarks": 1}}, ...]

ANSWER KEY TEXT:
{answer_key_text}"""
        payload = {"model": model, "messages": [{"role": "user", "content": prompt}], "max_tokens": 2048, "temperature": 0.1}
    elif answer_key_images:
        b64_list = []
        for path in answer_key_images:
            with open(path, "rb") as f:
                b64_list.append({"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64.b64encode(f.read()).decode('utf-8')}"}})
        prompt = "Extract correct answers from this answer key image. Return JSON array: [{q: 1, correctOption: 'A', correctAnswer: 'Frog', maxMarks: 1}, ...]"
        payload = {"model": model, "messages": [{"role": "user", "content": [{"type": "text", "text": prompt}] + b64_list}], "max_tokens": 2048, "temperature": 0.1}
    else:
        return []

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json",
               "HTTP-Referer": "https://eval-assist-emerg.onrender.com", "X-Title": "EvalAssist"}
    resp = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload, timeout=120)
    resp.raise_for_status()
    content = resp.json()["choices"][0]["message"]["content"]
    try:
        return json.loads(content[content.find("["):content.rfind("]")+1])
    except:
        print(f"[Qwen] Failed to parse answer key")
        return []

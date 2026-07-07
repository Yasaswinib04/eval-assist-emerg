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
    def __init__(self, api_key: str, model: str, question_paper_text: str = "", answer_key: list = None, questions: list = None):
        self.api_key = api_key
        self.model = model
        self.question_paper = question_paper_text
        self.answer_key = answer_key or []
        self.questions = questions or []
        self.endpoint = "https://openrouter.ai/api/v1/chat/completions"

    def _build_prompt(self) -> str:
        if self.questions:
            return self._build_prompt_from_questions()
        return self._build_prompt_from_text()

    def _build_prompt_from_text(self) -> str:
        return f"""You are grading a student exam. Below is the complete question paper, the answer key, and a scanned image of a student's handwritten answer sheet.

QUESTION PAPER:
{self.question_paper}

ANSWER KEY (correct answers with mark allocation):
{json.dumps(self.answer_key, indent=2, ensure_ascii=False)}

Examine the student's handwritten answer sheet image carefully. For EACH question:
1. Read the student's handwritten answer from the image
2. For MCQs: extract which option letter (A/B/C/D) the student circled or wrote
3. For subjective questions: extract the full written answer text
4. Compare to the correct answer in the answer key above
5. Assign a mark based on the maxMarks for each question
6. Provide a confidence score (0-100) for your extraction

Return ONLY a JSON array with one element per question. No extra text:
[{{"q": 1, "studentAnswer": "...", "mcqChoice": "A", "mark": 1, "maxMarks": 1, "confidence": 95, "correct": true, "reasoning": "..."}}, ...]"""

    def _build_prompt_from_questions(self) -> str:
        q_lines = []
        for q in sorted(self.questions, key=lambda x: x.get("number", 0)):
            num = q.get("number", "?")
            section = q.get("section", "")
            marks = q.get("maxMarks", 1)
            text = q.get("text", "")
            options = q.get("options", [])
            opt_str = ""
            if options:
                letters = ["A", "B", "C", "D", "E", "F"]
                opt_str = " Options: " + ", ".join(f"{letters[i]}) {o}" for i, o in enumerate(options[:6]))
            q_lines.append(f"Q{num} [{section} {marks} mark{'s' if marks > 1 else ''}] {text}{opt_str}")

        ak_lines = []
        for entry in self.answer_key:
            qn = entry.get("questionNumber", entry.get("q", ""))
            co = entry.get("correctOption", "")
            ca = entry.get("correctAnswer", "")
            et = entry.get("expectedText", "")
            parts = [f"Q{qn}"]
            if co:
                parts.append(f"correctOption={co}")
            if ca:
                parts.append(f"correctAnswer={ca}")
            if et:
                parts.append(f"expected={et[:200]}")
            ak_lines.append(" ".join(parts))

        return f"""You are grading a student exam. Below is the question paper, the answer key, and a scanned image of a student's handwritten answer sheet.

First, look at the top of the answer sheet and extract the student's name and roll number if written.

QUESTION PAPER:
{chr(10).join(q_lines)}

ANSWER KEY:
{chr(10).join(ak_lines) if ak_lines else "No answer key provided — grade based on question requirements."}

Examine the student's handwritten answer sheet image carefully. For EACH question:
1. Read the student's handwritten answer from the image
2. For MCQs: extract which option letter (A/B/C/D) the student circled or wrote
3. For subjective questions: extract the full written answer text
4. Compare to the correct answer in the answer key above
5. Assign a mark based on the maxMarks for each question
6. Provide a confidence score (0-100) for your extraction

Return ONLY a JSON object with "studentName", "rollNumber", and "questions" array. No extra text:
{{"studentName": "Student Name", "rollNumber": "0000", "questions": [{{"q": 1, "studentAnswer": "...", "mcqChoice": "A", "mark": 1, "maxMarks": 1, "confidence": 95, "correct": true, "reasoning": "..."}}, ...]}}"""

    def _image_to_base64(self, image_path: str) -> str:
        with open(image_path, "rb") as f:
            return base64.b64encode(f.read()).decode("utf-8")

    def _parse_evaluations(self, raw: dict, student_id: str, assessment_id: str) -> tuple:
        evaluations = []
        student_name = None
        roll_number = None

        if isinstance(raw, dict):
            student_name = raw.get("studentName") or raw.get("name")
            roll_number = raw.get("rollNumber") or raw.get("roll")
            questions = raw.get("questions", [])
        elif isinstance(raw, list):
            questions = raw
        else:
            questions = []

        for entry in questions:
            q_num = entry.get("q", 0)
            q_id = f"q{q_num}"
            mark = entry.get("mark", 0)
            max_m = entry.get("maxMarks", 1)
            confidence = entry.get("confidence", 50)
            correct = entry.get("correct", False)
            reasoning = entry.get("reasoning", "")
            student_answer = entry.get("studentAnswer", "")
            mcq_choice = entry.get("mcqChoice", "")

            needs_review = confidence < 70 or "diagram" in str(student_answer).lower()

            evaluations.append({
                "_id": f"{assessment_id}-{student_id}-{q_id}",
                "qId": q_id,
                "assessmentId": assessment_id,
                "studentId": student_id,
                "aiMark": float(mark),
                "maxMarks": max_m,
                "confidence": "high" if confidence >= 85 else "medium" if confidence >= 60 else "low",
                "confidenceScore": confidence,
                "needsReview": needs_review,
                "approved": False,
                "studentAnswer": student_answer if student_answer else (mcq_choice if mcq_choice else "[unreadable]"),
                "mcqChoice": (mcq_choice or "").strip().upper()[:1] or None,
                "reasoning": reasoning,
                "correct": correct,
            })
        return evaluations, student_name, roll_number

    def process(self, image_path: str, student_id: str, assessment_id: str = "asm-001") -> dict:
        return self.process_pages([image_path], student_id, assessment_id)

    def process_pages(self, image_paths: List[str], student_id: str, assessment_id: str = "asm-001") -> dict:
        """Grade one student's answer sheet from one or more page images.

        All pages are sent to the model in a single request so it can
        follow an answer that continues across pages, rather than grading
        each page in isolation.
        """
        existing_paths = [p for p in image_paths if os.path.exists(p)]
        if not existing_paths:
            return {"error": f"Image(s) not found: {image_paths}", "studentId": student_id}

        prompt = self._build_prompt()
        if len(existing_paths) > 1:
            prompt += f"\n\nNote: this student's answer sheet spans {len(existing_paths)} pages, provided in order. Treat them as one continuous answer sheet."

        content = [{"type": "text", "text": prompt}]
        for path in existing_paths:
            image_b64 = self._image_to_base64(path)
            content.append({"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}})

        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": content}],
            "max_tokens": 4096,
            "temperature": 0.1,
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://eval-assist-emerg.onrender.com",
            "X-Title": "EvalAssist Demo",
        }

        page_names = ", ".join(os.path.basename(p) for p in existing_paths)
        print(f"[Qwen] Processing {page_names} for student {student_id}...")
        resp = requests.post(self.endpoint, headers=headers, json=payload, timeout=180)
        resp.raise_for_status()

        data = resp.json()
        content = data["choices"][0]["message"]["content"]

        json_start = content.find("{")
        json_end = content.rfind("}") + 1
        if json_start >= 0 and json_end > json_start:
            content = content[json_start:json_end]
        else:
            json_start = content.find("[")
            json_end = content.rfind("]") + 1
            if json_start >= 0 and json_end > json_start:
                content = content[json_start:json_end]

        try:
            raw_parsed = json.loads(content)
        except json.JSONDecodeError:
            print(f"[Qwen] Failed to parse JSON response: {content[:200]}...")
            return {"error": "Failed to parse Qwen response", "studentId": student_id}

        evaluations, student_name, roll_number = self._parse_evaluations(raw_parsed, student_id, assessment_id)
        total = sum(e["aiMark"] for e in evaluations)
        max_total = sum(q.get("maxMarks", 1) for q in (self.questions or self.answer_key)) or 40
        print(f"[Qwen] {student_id}: {len(evaluations)} evals, total {total}/{max_total}")

        return {
            "studentId": student_id,
            "studentName": student_name,
            "rollNumber": roll_number,
            "evaluations": evaluations,
            "total": total,
            "maxTotal": max_total,
        }


def build_answer_key_from_parsed(parsed_key: list) -> list:
    if not parsed_key:
        return []
    return parsed_key


def build_question_paper_from_questions(questions: list) -> str:
    if not questions:
        return ""
    lines = []
    for q in sorted(questions, key=lambda x: x.get("number", 0)):
        num = q.get("number", "?")
        section = q.get("section", "")
        marks = q.get("maxMarks", 1)
        text = q.get("text", "")
        lines.append(f"Q{num} [{section} {marks}m] {text[:300]}")
    return "\n".join(lines)


def analyze_question_paper(api_key: str, model: str, image_paths: list, subject: str = "", answer_key_path: str = None) -> dict:
    """Send question paper images to Qwen to extract questions with chapters, concepts, and prerequisites."""
    if not image_paths:
        return {"error": "No question paper images provided"}

    subject_context = f" This is a {subject} exam." if subject else ""
    prompt = f"""Read every question from this exam paper image.{subject_context} Return ONLY a JSON array of questions. For each question, identify:
- "number": question number
- "text": complete question text including ALL options if MCQ
- "section": A/B/C/D
- "maxMarks": marks for this question
- "concept": the specific concept being tested (e.g., "F=ma", "Refraction", "Cell Division")
- "skill": Bloom's taxonomy level — one of "Recall", "Understanding", "Application", "Analysis"
- "difficulty": one of "Easy", "Medium", "Hard"
- "prerequisites": list of concepts students must know before attempting this question

Example:
[
  {{"number": 1, "text": "What is the SI unit of force? A) Joule B) Newton C) Watt D) Pascal", "section": "A", "maxMarks": 1, "concept": "Force", "skill": "Recall", "difficulty": "Easy", "prerequisites": ["Units of Measurement"]}},
  {{"number": 2, "text": "Explain the process of photosynthesis with a diagram.", "section": "B", "maxMarks": 4, "concept": "Photosynthesis", "skill": "Understanding", "difficulty": "Medium", "prerequisites": ["Chlorophyll", "Stomata"]}}
]
Return ONLY the JSON array, no other text."""

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


def extract_curriculum_from_images(api_key: str, model: str, image_paths: list, subject: str = "") -> str:
    """OCR textbook/chapter images into plain topic outline text for downstream curriculum parsing."""
    if not image_paths:
        return ""
    subject_ctx = f" This is a {subject} textbook." if subject else ""
    prompt = (
        f"Read the textbook/chapter pages in these images.{subject_ctx} "
        "Produce a clean plain-text outline of chapters, topics, and subtopics — one topic per line, "
        "use 'Chapter N: Title' headings and '- subtopic' bullets. Do NOT invent content that isn't on the page. "
        "Return ONLY the outline, no commentary."
    )
    content_parts = [{"type": "text", "text": prompt}]
    for path in image_paths:
        try:
            with open(path, "rb") as f:
                b64 = base64.b64encode(f.read()).decode("utf-8")
            content_parts.append({"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}})
        except Exception as e:
            print(f"[Qwen] curriculum image read failed for {path}: {e}")
    payload = {"model": model, "messages": [{"role": "user", "content": content_parts}], "max_tokens": 3072, "temperature": 0.1}
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json",
               "HTTP-Referer": "https://eval-assist-emerg.onrender.com", "X-Title": "EvalAssist"}
    try:
        resp = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload, timeout=120)
        resp.raise_for_status()
        return (resp.json()["choices"][0]["message"]["content"] or "").strip()
    except Exception as e:
        print(f"[Qwen] curriculum image OCR failed: {e}")
        return ""

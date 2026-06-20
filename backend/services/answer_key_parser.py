"""Parse teacher-submitted answer key text into structured question JSON.

Uses Ollama (Llama 3.2) to extract per-question answers from free-form
text that the teacher pastes into the Upload page.
"""

import json
import re
import httpx
from typing import List, Dict, Optional, Any

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3.2:3b"


def parse_answer_key(text: str) -> List[Dict[str, Any]]:
    """Parse free-text answer key into structured question array.

    Accepts formats like:
    - "1. A  2. C  3. B  ..."
    - "Q1: Humans (option A)  Q2: Done when oviducts are blocked..."
    - "1. Human -> B  2. IVF -> C  ..."
    - "11. Weeds are unwanted plants. Controlled by weeding.  12. No..."
    - "11) Weeds = unwanted plants, controlled by weeding..."

    Returns list of {questionNumber, correctAnswer, correctOption, expectedText}.
    """

    # Try heuristic extraction first (fast, no API call)
    heuristic = _heuristic_parse(text)
    if heuristic and len(heuristic) >= 3:
        return heuristic

    # Fall back to Ollama for complex answer keys
    try:
        ollama_result = _ollama_parse(text)
        if ollama_result:
            return ollama_result
    except Exception:
        pass

    # If Ollama failed and heuristic found anything at all, return it
    return heuristic if heuristic else []


def _heuristic_parse(text: str) -> List[Dict[str, Any]]:
    """Fast rule-based extraction of MCQ and short-answer keys."""
    results = []
    lines = [l.strip() for l in text.split("\n") if l.strip()]

    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            continue

        # Pattern: "1. A" or "1) B" or "1. A) Human" or "Q1. Human"
        # MCQ first: match number then letter
        mcq = re.match(r'^Q?\s*(\d{1,2})\s*[.)\s]\s*([A-Da-d])\b', line)
        if mcq:
            q_num = int(mcq.group(1))
            letter = mcq.group(2).upper()
            # Extract the answer text after the letter if present
            rest = line[mcq.end():].strip()
            answer_text = rest if rest and len(rest) > 1 else f"Option {letter}"
            results.append({
                "questionNumber": q_num,
                "correctOption": letter,
                "correctAnswer": answer_text,
                "expectedText": answer_text,
            })
            continue

        # Subjective: "11. Weeds are unwanted plants..." (no letter after number)
        subj = re.match(r'^Q?\s*(\d{1,2})\s*[.)]\s+(.+)$', line)
        if subj:
            q_num = int(subj.group(1))
            answer_text = subj.group(2).strip()
            results.append({
                "questionNumber": q_num,
                "correctOption": None,
                "correctAnswer": answer_text,
                "expectedText": answer_text,
            })
            continue

    if len(results) >= 3:
        results.sort(key=lambda r: r["questionNumber"])
        return results
    return []


def _ollama_parse(text: str) -> List[Dict[str, Any]]:
    """Use Ollama to parse complex answer key text."""
    prompt = f"""Parse the following answer key into a JSON array. Each item has:
- questionNumber: int
- correctOption: "A"/"B"/"C"/"D" or null (only for MCQs)
- correctAnswer: the correct answer text
- expectedText: what a good student answer should look like

ANSWER KEY TEXT:
{text[:5000]}

Return ONLY a JSON array. No markdown, no explanation."""

    try:
        resp = httpx.post(
            OLLAMA_URL,
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False, "temperature": 0.0},
            timeout=120,
        )
        resp.raise_for_status()
        response_text = resp.json().get("response", "").strip()

        json_start = response_text.find("[")
        json_end = response_text.rfind("]")
        if json_start >= 0 and json_end > json_start:
            parsed = json.loads(response_text[json_start:json_end + 1])
            if isinstance(parsed, list) and len(parsed) >= 1:
                return parsed
    except Exception as e:
        print(f"  Ollama answer key parsing failed: {e}")

    return []


def parse_questions_text(text: str) -> List[Dict[str, Any]]:
    """Parse teacher-submitted questions text into structured question array.

    Returns list matching the questions.json schema:
    {id, number, section, maxMarks, text, options[], correctAnswer, expected}
    """

    prompt = f"""Parse these exam questions into a JSON array. Each item should have:
- number: int (question number, starting from 1)
- text: string (the question text)
- section: "A"/"B"/"C"/"D" based on the mark weight or explicitly stated section
- maxMarks: int (estimated marks based on question complexity: 1 for MCQs/simple, 2-4 for short, 8 for essay)
- options: array of strings (if MCQ, 4 options; otherwise empty array)
- correctAnswer: string (if the answer is provided, the correct answer text; otherwise null)
- expected: string (if provided in the text, the expected answer; otherwise null)

If you see answer key mixed in with questions, extract that as the correctAnswer field.
If no answers are provided, set correctAnswer and expected to null.

QUESTIONS TEXT:
{text[:8000]}

Return ONLY a JSON array. No markdown, no explanation."""

    try:
        resp = httpx.post(
            OLLAMA_URL,
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False, "temperature": 0.0},
            timeout=120,
        )
        resp.raise_for_status()
        response_text = resp.json().get("response", "").strip()

        json_start = response_text.find("[")
        json_end = response_text.rfind("]")
        if json_start >= 0 and json_end > json_start:
            parsed = json.loads(response_text[json_start:json_end + 1])
            if isinstance(parsed, list) and len(parsed) >= 1:
                for i, q in enumerate(parsed):
                    q["id"] = q.get("id", f"q{q.get('number', i + 1)}")
                    q["_id"] = q.get("id")
                    q["assessmentId"] = "__parsed__"
                return parsed
    except Exception as e:
        print(f"  Ollama questions parsing failed: {e}")

    return []

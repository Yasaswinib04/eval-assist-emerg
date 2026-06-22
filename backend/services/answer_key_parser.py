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

    # Try heuristic parse first (for instant offline result!)
    heuristic = _heuristic_parse_questions(text)
    if heuristic and len(heuristic) >= 5:
        print(f"  Heuristically parsed {len(heuristic)} questions successfully.")
        return heuristic

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

    return heuristic if heuristic else []


def _heuristic_parse_questions(text: str) -> List[Dict[str, Any]]:
    """Heuristically parse free-text questions into structured Question format."""
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    questions = []
    q_num = 1
    current_section = "A"

    def is_valid_question_line(line):
        lower = line.lower()
        if "section" in lower and ("answer" in lower or "multiple" in lower or "questions" in lower or "booklet" in lower):
            return False
        if "self assessment" in lower or "udise" in lower:
            return False
        if len(line) < 15:
            return False
        return True

    for line in lines:
        lower_line = line.lower()
        if "section b" in lower_line:
            current_section = "B"
            continue
        elif "section c" in lower_line:
            current_section = "C"
            continue
        elif "section d" in lower_line:
            current_section = "D"
            continue

        if not is_valid_question_line(line):
            continue

        # Pattern for "16. A)" or "1." or "16)"
        num_match = re.match(r'^(?:Q|q)?(\d{1,2})\s*[\.?)\s-]*\s*([A-Ba-b])?[\.?)\s-]*\s*(.+)$', line)

        q_text = line
        custom_num = None
        if num_match:
            custom_num = int(num_match.group(1))
            suffix = num_match.group(2) or ""
            q_text = num_match.group(3).strip()
            if suffix:
                q_text = f"{suffix}) {q_text}"

        options = []
        if current_section == "A" or "A)" in q_text:
            opts_match = re.findall(r'([A-D])\s*\)\s*([^A-D\n]+)', q_text)
            if len(opts_match) >= 2:
                options = [f"{o[0]}) {o[1].strip()}" for o in opts_match]
                q_text = re.split(r'\b[A-D]\s*\)', q_text)[0].strip()

        actual_num = custom_num if custom_num else q_num

        if actual_num <= 10:
            sect = "A"
            marks = 1
        elif actual_num <= 13:
            sect = "B"
            marks = 2
        elif actual_num <= 15:
            sect = "C"
            marks = 4
        else:
            sect = "D"
            marks = 8

        questions.append({
            "id": f"q{actual_num}",
            "_id": f"q{actual_num}",
            "number": actual_num,
            "section": sect,
            "maxMarks": marks,
            "text": q_text,
            "options": options,
            "correctAnswer": None,
            "expected": None,
            "assessmentId": "__parsed__"
        })

        q_num = actual_num + 1

    return questions


def parse_curriculum_text(text: str) -> List[Dict[str, Any]]:
    """Parse teacher-provided curriculum/chapter summary text.

    Accepts formats like:
    - "Chapter 1: Cell Structure - cell membrane, cytoplasm, nucleus"
    - "Topic: Fertilization (External vs Internal)"
    - Bullet lists of concepts under chapter headers
    - "ch1: Cell Structure -> cell wall, cell membrane, nucleus, cytoplasm"

    Returns list matching curriculum chapters format:
    [{id, name, concepts: [{name, keywords, description}]}]
    """

    # Try heuristic first
    heuristic = _heuristic_parse_curriculum(text)
    if heuristic and len(heuristic) >= 1:
        return heuristic

    # Fallback to Ollama
    return _ollama_parse_curriculum(text)


def _heuristic_parse_curriculum(text: str) -> List[Dict[str, Any]]:
    """Heuristically parse curriculum text into chapters/concepts."""
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    chapters = []
    current_chapter = None
    ch_counter = 0

    # Color palette for chapters
    colors = ["blue", "emerald", "amber", "rose", "violet", "orange", "teal"]

    for line in lines:
        # Detect chapter headers: "Chapter 1: Cell Structure", "Ch1: ...", "1. Cell..."
        ch_match = re.match(
            r'^(?:Chapter|Ch|Lesson)\s*(\d+)[:\-.\s)]+\s*(.+)$', line, re.IGNORECASE
        )
        if not ch_match:
            ch_match = re.match(r'^(\d+)\.\s*(.+?)(?:\s*[-–—]\s*.+)?$', line)

        if ch_match:
            ch_counter += 1
            ch_name = ch_match.group(2).strip()
            current_chapter = {
                "id": f"ch{ch_counter}",
                "name": ch_name[:80],
                "order": ch_counter,
                "color": colors[(ch_counter - 1) % len(colors)],
                "concepts": [],
            }
            chapters.append(current_chapter)
            continue

        # Detect topic/concept lines: "- Cell Structure", "* Fertilization", "Topic: ..."
        concept_match = re.match(r'^[-*•]\s*(.+)$', line)
        if not concept_match:
            concept_match = re.match(r'^(?:Topic|Concept|Sub-topic)[:\s]+(.+)$', line, re.IGNORECASE)

        if concept_match and current_chapter is not None:
            concept_text = concept_match.group(1).strip()
            # Split by comma for keywords
            parts = [p.strip() for p in concept_text.split(",")]
            name = parts[0][:60] if parts else concept_text[:60]
            keywords = parts[1:4] if len(parts) > 1 else []

            current_chapter["concepts"].append({
                "name": name,
                "keywords": keywords,
                "description": concept_text[:200],
                "prerequisites": [],
                "difficulty": "Medium",
                "expectedSkills": ["Recall"],
            })
            continue

        # If line has substantial text and we already have a chapter, treat as description
        if current_chapter is not None and len(line) > 20 and current_chapter["concepts"]:
            current_chapter["concepts"][-1]["description"] += " " + line

    return chapters


def _ollama_parse_curriculum(text: str) -> List[Dict[str, Any]]:
    """Use Ollama to parse curriculum text into structured JSON."""
    prompt = f"""Parse this curriculum / chapter summary into a JSON array of chapters.

Each chapter has:
- id: "ch1", "ch2", etc.
- name: chapter title
- order: number
- color: one of ["blue", "emerald", "amber", "rose", "violet", "orange", "teal"]
- concepts: array of {{name, keywords: [string], description, prerequisites: [], difficulty: "Easy"/"Medium"/"Hard", expectedSkills: ["Recall"]}}

CURRICULUM TEXT:
{text[:8000]}

Return ONLY a JSON array. No markdown, no explanation."""

    try:
        import httpx
        resp = httpx.post(
            "http://localhost:11434/api/generate",
            json={"model": "llama3.2:3b", "prompt": prompt, "stream": False, "temperature": 0.0},
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
        print(f"  Ollama curriculum parsing failed: {e}")
    return []

"""Parse teacher-submitted answer key text into structured question JSON.

Uses Ollama (Llama 3.2) to extract per-question answers from free-form
text that the teacher pastes into the Upload page.
"""

import json
import os
import re
import httpx
from typing import List, Dict, Optional, Any

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3.2:3b"
DEEPSEEK_ENDPOINT = "https://api.deepseek.com/v1/chat/completions"


def _get_deepseek_key() -> str:
    key = os.getenv("DEEPSEEK_API_KEY", "")
    if key:
        return key
    try:
        from backend.core.config import settings
        return getattr(settings, "DEEPSEEK_API_KEY", "") or ""
    except Exception:
        return ""


def _llm_complete(prompt: str) -> str:
    """Get a text completion from whichever LLM is actually reachable.

    Ollama only runs on a local/offline machine — it is NOT reachable from
    the deployed server, so any feature depending on it (concept tagging,
    the questions-text LLM fallback) silently does nothing in production.
    Prefer the cloud DeepSeek API (already used elsewhere and confirmed
    reachable in production) whenever a key is configured, and only fall
    back to local Ollama for offline/dev setups without one.
    """
    deepseek_key = _get_deepseek_key()
    if deepseek_key:
        try:
            resp = httpx.post(
                DEEPSEEK_ENDPOINT,
                headers={"Authorization": f"Bearer {deepseek_key}", "Content-Type": "application/json"},
                json={
                    "model": "deepseek-chat",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 4096,
                    "temperature": 0.1,
                },
                timeout=90,
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            print(f"  DeepSeek completion failed, falling back to Ollama: {e}")

    resp = httpx.post(
        OLLAMA_URL,
        json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False, "temperature": 0.1},
        timeout=120,
    )
    resp.raise_for_status()
    return resp.json().get("response", "").strip()


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


_AK_MCQ_START_RE = re.compile(r'^Q?\s*(\d{1,3})\s*[.):\s-]\s*([A-Da-d])\b')
_AK_SUBJ_START_RE = re.compile(r'^Q?\s*(\d{1,3})\s*[.):-]\s+(.+)$')
_AK_SECTION_HEADER_RE = re.compile(r'^section\s+([a-d])\b', re.IGNORECASE)
# "16. A) ..." style — Section-D alternatives that share a question number
_AK_ALT_START_RE = re.compile(r'^Q?\s*(\d{1,3})\s*\.\s*([AB])\)\s*(.*)$')


def _strip_ak_markdown(line: str) -> str:
    line = _MD_HEADING_RE.sub('', line)
    line = line.replace('**', '').replace('__', '')
    return line.strip()


def _heuristic_parse(text: str) -> List[Dict[str, Any]]:
    """Rule-based extraction of MCQ and subjective answer keys.

    Groups continuation lines (Term:, Precautions:, bullet points, etc.)
    under the most recent numbered answer, so a subjective answer with
    multiple detail lines under one heading isn't truncated to just the
    heading. Handles "16. A) ..." / "16. B) ..." internal-choice pairs by
    emitting each as its own row (same question number, distinct option).
    """
    lines = text.split("\n")
    blocks: List[Dict[str, Any]] = []
    current: Optional[Dict[str, Any]] = None
    # Only Section A entries are MCQs; Section D entries with an A)/B) suffix
    # are internal-choice essay alternatives (same question number, different
    # sub-answer) — so we need section context to tell them apart, since
    # "1. A) Frog" and "16. A) Disease Table Analysis" have identical shape.
    section = "A"

    for raw in lines:
        line = _strip_ak_markdown(raw)
        if not line:
            continue
        sh = _AK_SECTION_HEADER_RE.match(line)
        if sh:
            section = sh.group(1).upper()
            current = None
            continue

        if section == "A":
            mcq = _AK_MCQ_START_RE.match(line)
            if mcq:
                q_num = int(mcq.group(1))
                letter = mcq.group(2).upper()
                rest = line[mcq.end():].strip()
                rest = re.sub(r'^[)\]\-]\s*', '', rest)
                current = {
                    "questionNumber": q_num,
                    "correctOption": letter,
                    "isSubjective": False,
                    "lines": [rest] if rest else [],
                }
                blocks.append(current)
                continue

        if section != "A":
            alt = _AK_ALT_START_RE.match(line)
            if alt:
                q_num = int(alt.group(1))
                alt_letter = alt.group(2).upper()
                rest = alt.group(3).strip()
                # Internal-choice alternatives (16A/16B, 17A/17B) share a
                # question number but are subjective essay-style answers, not
                # MCQ options — leave correctOption null and record the choice
                # separately so the frontend classifies them as subjective.
                current = {
                    "questionNumber": q_num,
                    "correctOption": None,
                    "alternative": alt_letter,
                    "isSubjective": True,
                    "lines": [rest] if rest else [],
                }
                blocks.append(current)
                continue

        subj = _AK_SUBJ_START_RE.match(line)
        if subj:
            q_num = int(subj.group(1))
            current = {
                "questionNumber": q_num,
                "correctOption": None,
                "isSubjective": True,
                "lines": [subj.group(2).strip()],
            }
            blocks.append(current)
            continue

        if current is not None:
            current["lines"].append(line)

    results: List[Dict[str, Any]] = []
    for b in blocks:
        if b["isSubjective"]:
            answer_text = " ".join(l for l in b["lines"] if l).strip()
            if not answer_text and b["correctOption"]:
                answer_text = f"Option {b['correctOption']}"
        else:
            first = b["lines"][0] if b["lines"] else ""
            answer_text = first if first and len(first) > 1 else f"Option {b['correctOption']}"

        row = {
            "questionNumber": b["questionNumber"],
            "correctOption": b["correctOption"],
            "correctAnswer": answer_text,
            "expectedText": answer_text,
        }
        if b.get("alternative"):
            row["alternative"] = b["alternative"]
        results.append(row)

    if len(results) >= 3:
        results.sort(key=lambda r: (r["questionNumber"], r.get("alternative") or ""))
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
        response_text = _llm_complete(prompt)
        json_start = response_text.find("[")
        json_end = response_text.rfind("]")
        if json_start >= 0 and json_end > json_start:
            parsed = json.loads(response_text[json_start:json_end + 1])
            if isinstance(parsed, list) and len(parsed) >= 1:
                return parsed
    except Exception as e:
        print(f"  Answer key LLM parsing failed: {e}")

    return []


def tag_question_concepts(questions: List[Dict[str, Any]], subject: str = "") -> List[Dict[str, Any]]:
    """Fill in concept/skill/difficulty/prerequisites via LLM (DeepSeek/Ollama).

    Mirrors the schema the Qwen vision path already asks for — this just
    covers the text/heuristic parsing path, which never requested these
    fields. Deliberately not curriculum-dependent: the model infers concepts
    directly from question text + subject, same as the image path does.
    Skips questions that already have a concept (e.g. tagged by Qwen).
    """
    missing = [q for q in questions if not q.get("concept")]
    if not missing:
        return questions

    subject_context = f" This is a {subject} exam." if subject else ""
    items = "\n".join(f'{q["number"]}. {q["text"]}' for q in missing)
    prompt = f"""For each numbered question below, identify:{subject_context}
- "number": the question number (must match exactly)
- "concept": the specific concept being tested (e.g., "Newton's Laws", "Photosynthesis")
- "skill": MUST be exactly one of these four strings, verbatim: "Recall", "Understanding", "Application", "Analysis"
- "difficulty": MUST be exactly one of these three strings, verbatim: "Easy", "Medium", "Hard"
- "prerequisites": list of concepts students must know before attempting this question

QUESTIONS:
{items}

Return ONLY a JSON array like [{{"number": 1, "concept": "...", "skill": "...", "difficulty": "...", "prerequisites": ["..."]}}]. No markdown, no explanation."""

    try:
        response_text = _llm_complete(prompt)
        json_start = response_text.find("[")
        json_end = response_text.rfind("]")
        if json_start >= 0 and json_end > json_start:
            tags = json.loads(response_text[json_start:json_end + 1])
            by_num = {t.get("number"): t for t in tags if isinstance(t, dict)}
            valid_skills = {"Recall", "Understanding", "Application", "Analysis"}
            valid_difficulty = {"Easy", "Medium", "Hard"}
            for q in missing:
                tag = by_num.get(q["number"])
                if tag:
                    q["concept"] = tag.get("concept", "") or ""
                    skill = tag.get("skill")
                    q["skill"] = skill if skill in valid_skills else "Recall"
                    difficulty = tag.get("difficulty")
                    q["difficulty"] = difficulty if difficulty in valid_difficulty else "Medium"
                    q["prerequisites"] = tag.get("prerequisites") or []
    except Exception as e:
        print(f"  Concept tagging failed: {e}")

    return questions


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
        response_text = _llm_complete(prompt)
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
        print(f"  Questions LLM parsing failed: {e}")

    return heuristic if heuristic else []


_SECTION_HEADER_RE = re.compile(r'^section\s+([a-d])\b[:\-.]?\s*(.*)$', re.IGNORECASE)
_MARKS_SPEC_RE = re.compile(r'(\d+)\s*(?:x|\\times|×)\s*(\d+)\s*=\s*(\d+)')
_DEFAULT_SECTION_MARKS = {"A": 1, "B": 2, "C": 4, "D": 8}
# Option marker must be preceded by start-of-string or whitespace, never by a
# letter/paren — otherwise "Assertion (A): ..." falsely reads as an "A)" option.
_OPTION_RE = re.compile(r'(?:^|\s)([A-D])\)\s*(.+?)(?=(?:\s[A-D]\))|$)')
_OPTION_START_RE = re.compile(r'(?:^|\s)([A-D])\)')
_SECTION_D_MARKER_RE = re.compile(r'^(\d+)\.\s*([AB])\)\s*(.*)$')
_SUBPART_SPLIT_RE = re.compile(r'\b(i{1,3}v?|iv|v)\)\s*')
_QUESTION_MARKER_RE = re.compile(r'^(\d{1,3})[.)]\s*(.*)$')
_HR_RE = re.compile(r'^[-*_]{3,}$')
_MD_HEADING_RE = re.compile(r'^#{1,6}\s*')


def _strip_markdown(line: str) -> str:
    """Strip common markdown noise (headings, bold/italic markers) that LLM-
    formatted question text tends to add, so the plain-text heuristics below
    still match."""
    line = _MD_HEADING_RE.sub('', line)
    line = line.replace('**', '').replace('__', '')
    return line.strip()


def _extract_options(text: str) -> List[str]:
    opts = _OPTION_RE.findall(text)
    if len(opts) >= 2:
        return [f"{o[0]}) {o[1].strip()}" for o in opts]
    return []


def _is_noise_line(line: str) -> bool:
    lower = line.lower()
    if "self assessment" in lower or "udise" in lower:
        return True
    if len(line) < 10:
        return True
    return False


def _split_into_blocks(lines: List[str], expected_start: int) -> List[Dict[str, Any]]:
    """Group section body lines into per-question blocks.

    If the section actually numbers its questions (the expected next number,
    continuing the running count from prior sections, appears as a line-
    leading marker), split on those markers — this also correctly ignores
    unrelated numbered lists embedded inside a question body (e.g. "1. Frog
    2. Butterfly...") since they won't match the *expected* next number.
    Otherwise (e.g. Section A/B/C papers with no printed numbers at all —
    one question per paragraph), each non-empty line is its own block.
    """
    has_valid_start = any(
        (m := _QUESTION_MARKER_RE.match(line)) and int(m.group(1)) == expected_start
        for line in lines
    )
    if not has_valid_start:
        return [{"num": None, "lines": [line]} for line in lines]

    blocks = []
    current = None
    expected = expected_start
    for line in lines:
        m = _QUESTION_MARKER_RE.match(line)
        if m and int(m.group(1)) == expected:
            current = {"num": expected, "lines": []}
            rest = m.group(2).strip()
            if rest:
                current["lines"].append(rest)
            blocks.append(current)
            expected += 1
        elif current is not None:
            current["lines"].append(line)
        # else: stray content before the first valid marker (e.g. a "Note:"
        # line) — drop it.
    return blocks


def _heuristic_parse_questions(text: str) -> List[Dict[str, Any]]:
    """Heuristically parse free-text questions into structured Question format.

    Splits the paper by "Section A/B/C/D" headers (deriving marks-per-question
    from patterns like "10x1=10"), discards front-matter above the first
    section header (title, UDISE code, roll no, etc.), and numbers questions
    sequentially across sections so the original 1..N hierarchy is preserved
    rather than exploding every line into its own top-level question.
    """
    lines = [_strip_markdown(l) for l in text.split("\n")]
    lines = [l for l in lines if l and not _HR_RE.match(l)]

    start = None
    for i, line in enumerate(lines):
        if _SECTION_HEADER_RE.match(line):
            start = i
            break
    if start is None:
        return []
    lines = lines[start:]

    sections = []
    current = None
    for line in lines:
        m = _SECTION_HEADER_RE.match(line)
        if m:
            current = {"letter": m.group(1).upper(), "header": line, "body": []}
            sections.append(current)
        elif current is not None:
            current["body"].append(line)

    questions: List[Dict[str, Any]] = []
    q_num = 1

    for sec in sections:
        letter = sec["letter"]
        mm = _MARKS_SPEC_RE.search(sec["header"] + " " + " ".join(sec["body"]))
        marks_each = int(mm.group(2)) if mm else _DEFAULT_SECTION_MARKS.get(letter, 1)

        if letter == "D":
            q_num = _parse_section_d(sec["body"], marks_each, q_num, questions)
            continue

        for block in _split_into_blocks(sec["body"], q_num):
            q_text = " ".join(block["lines"]).strip()
            if not q_text or _is_noise_line(q_text):
                continue

            options = _extract_options(q_text)
            if options:
                first_opt = _OPTION_START_RE.search(q_text)
                if first_opt:
                    q_text = q_text[:first_opt.start()].strip()

            questions.append({
                "id": f"q{q_num}",
                "_id": f"q{q_num}",
                "number": q_num,
                "section": letter,
                "maxMarks": marks_each,
                "text": q_text,
                "options": options,
                "correctAnswer": None,
                "expected": None,
                "subQuestions": [],
                "assessmentId": "__parsed__"
            })
            q_num += 1

    return questions


def _parse_section_d(body_lines: List[str], marks_each: int, start_num: int, questions: List[Dict[str, Any]]) -> int:
    """Parse Section D style content: numbered questions with an internal
    "(Or)" choice between an A) and B) alternative, and inline roman-numeral
    sub-parts (i) ii) iii) ...) nested under the same top-level question.
    """
    blocks = []
    current = None
    for line in body_lines:
        if line.strip().lower() in ("(or)", "or"):
            continue
        m = _SECTION_D_MARKER_RE.match(line)
        if m:
            current = {"num": int(m.group(1)), "letter": m.group(2).upper(), "lines": []}
            rest = m.group(3).strip()
            if rest:
                current["lines"].append(rest)
            blocks.append(current)
        elif current is not None:
            current["lines"].append(line)

    grouped: Dict[int, Dict[str, List[str]]] = {}
    order = []
    for b in blocks:
        if b["num"] not in grouped:
            grouped[b["num"]] = {}
            order.append(b["num"])
        grouped[b["num"]][b["letter"]] = b["lines"]

    q_num = start_num
    for num in order:
        alts = grouped[num]
        a_lines = alts.get("A", [])
        b_lines = alts.get("B", [])

        combined_a = " ".join(a_lines).strip()
        parts = _SUBPART_SPLIT_RE.split(combined_a)
        sub_questions = []
        main_text = combined_a
        if len(parts) > 2:
            main_text = parts[0].strip()
            for j in range(1, len(parts) - 1, 2):
                roman = parts[j]
                sub_text = parts[j + 1].strip()
                if sub_text:
                    sub_questions.append({"number": f"{num}-{roman}", "text": sub_text, "maxMarks": 0})

        text_out = main_text
        if b_lines:
            b_text = " ".join(b_lines).strip()
            text_out = f"{main_text} (OR) {b_text}" if main_text else b_text

        questions.append({
            "id": f"q{q_num}",
            "_id": f"q{q_num}",
            "number": q_num,
            "section": "D",
            "maxMarks": marks_each,
            "text": text_out.strip(),
            "options": [],
            "correctAnswer": None,
            "expected": None,
            "subQuestions": sub_questions,
            "assessmentId": "__parsed__"
        })
        q_num += 1

    return q_num


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
        response_text = _llm_complete(prompt)
        json_start = response_text.find("[")
        json_end = response_text.rfind("]")
        if json_start >= 0 and json_end > json_start:
            parsed = json.loads(response_text[json_start:json_end + 1])
            if isinstance(parsed, list) and len(parsed) >= 1:
                return parsed
    except Exception as e:
        print(f"  Curriculum LLM parsing failed: {e}")
    return []

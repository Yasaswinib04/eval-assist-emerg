#!/usr/bin/env python3
"""
Curriculum Builder — End-to-end textbook PDF → structured curriculum JSON.

Pipeline:
  1. Extract English pages from PDF (pages 18-108, even only)
  2. Split text by chapter boundaries
  3. Send each chapter to Ollama (Llama 3.2) for concept extraction
  4. Merge and validate output
  5. Save curriculum JSON

Usage:
    python3 backend/tools/ocr/curriculum_builder.py \
        --pdf Biology/8_Biology_SEM-1_Textbook.pdf \
        --output backend/seed/curriculum/ap-class8-bio.json
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

# Known chapter page ranges (English pages only, even numbers 18-108)
CHAPTER_RANGES = [
    {"id": "ch1", "name": "Cell — Structure & Functions", "start": 18, "end": 36, "color": "blue"},
    {"id": "ch2", "name": "Microorganisms — Friend and Foe", "start": 38, "end": 66, "color": "emerald"},
    {"id": "ch3", "name": "Crop Production & Management", "start": 68, "end": 98, "color": "amber"},
    {"id": "ch4", "name": "Reproduction in Animals", "start": 100, "end": 108, "color": "rose"},
]


def extract_chapter_text(pdf_path: str, chapter: dict) -> str:
    """Extract text from English pages for a single chapter."""
    import fitz

    doc = fitz.open(pdf_path)
    all_text = []

    for i in range(chapter["start"], chapter["end"] + 1, 2):
        pn = i - 1
        if pn < len(doc):
            text = doc[pn].get_text().strip()
            if len(text) > 100:
                text = re.sub(r'\n+', '\n', text)
                text = re.sub(r'\s+', ' ', text).strip()
                all_text.append(text)

    return '\n\n'.join(all_text)


def condense_text(text: str, max_chars: int = 7000) -> str:
    """Condense chapter text by extracting key structural elements.

    Keeps section headings, key terms, definitions. Removes verbose prose.
    """
    # Split into sentences/segments
    segments = re.split(r'(?<=[.!?])\s+', text)
    condensed = []
    seen = set()

    for seg in segments:
        seg = seg.strip()
        if not seg or len(seg) < 20:
            continue

        # Keep segments that look like headers or contain key terms
        is_header = bool(re.match(r'^[\d.]+[\s]', seg))  # "1.2 Cell Structure"
        is_key_term = any(
            kw in seg.lower()
            for kw in [
                "is called", "are called", "refers to", "defined as",
                "examples", "e.g.", "such as", "types of", "function",
                "structure", "process", "importance", "role of",
                "difference", "similar", "types", "stages",
                "characteristics", "features", "steps", "methods",
                "prevention", "causes", "effects", "uses",
            ]
        )
        is_section_label = any(
            seg.lower().startswith(w)
            for w in [
                "what", "how", "why", "where", "when",
                "define", "explain", "describe", "list",
                "note", "key", "important", "remember",
            ]
        )

        if is_header or is_key_term or is_section_label:
            short = seg[:150]
            if short not in seen:
                condensed.append(short)
                seen.add(short)

    result = '\n'.join(condensed)
    if len(result) > max_chars:
        result = result[:max_chars].rsplit('\n', 1)[0]

    return result


def build_chapter_prompt(chapter: dict, text: str) -> str:
    """Build a focused prompt for a single chapter."""
    condensed = condense_text(text, max_chars=7000)

    # Use raw text if condensation is too short (< 3000 chars)
    if len(condensed) < 3000:
        condensed = text[:12000]

    return f"""Extract ALL teachable concepts from this Class 8 Biology chapter as JSON.

Chapter: {chapter['name']}

CHAPTER TEXT:
{condensed}

Output ONLY valid JSON. No other text.
{{"concepts": [
  {{"name": "cell wall", "keywords": ["keyword1", "keyword2"], "description": "short description", "prerequisites": [], "difficulty": "Easy", "expectedSkills": ["Recall"]}}
]}}"""


def call_ollama(prompt: str, model: str = "llama3.2:3b") -> str:
    """Call Ollama API for text generation."""
    import httpx

    url = "http://localhost:11434/api/generate"
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.0, "num_predict": 2048},
    }

    try:
        resp = httpx.post(url, json=payload, timeout=300)
        resp.raise_for_status()
        return resp.json().get("response", "")
    except httpx.HTTPError as e:
        if "not found" in str(e).lower():
            print(f"Model '{model}' not found. Please run: ollama pull {model}")
        else:
            print(f"Ollama error: {e}")
        sys.exit(1)


def json_try_parse(text: str) -> dict:
    """Try to extract JSON from LLM response."""
    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try to find JSON block
    match = re.search(r'```(?:json)?\s*\n(.*?)\n```', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    # Try to find any JSON object
    match = re.search(r'(\{.*\})', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    return None


def ensure_chapter_keys(ch: dict, ch_order: int, ch_name: str) -> dict:
    """Fill in required fields for a chapter."""
    ch["id"] = ch.get("id", f"ch{ch_order}")
    ch["name"] = ch.get("name", ch_name)
    ch["order"] = ch.get("order", ch_order)
    ch["concepts"] = ch.get("concepts", [])
    for ci, c in enumerate(ch["concepts"]):
        c["id"] = c.get("id", f"ch{ch_order}-c{ci+1}")
        c["keywords"] = c.get("keywords", [])
        c["description"] = c.get("description", "")
        c["prerequisites"] = c.get("prerequisites", [])
        c["difficulty"] = c.get("difficulty", "Medium")
        c["expectedSkills"] = c.get("expectedSkills", ["Recall"])
    return ch


def build_curriculum(pdf_path: str, output_path: str, model: str = "llama3.2:3b"):
    """Full pipeline: PDF → chapter splits → Ollama → merged curriculum."""
    curriculum = {
        "_id": "ap-class8-bio-v1",
        "board": "Andhra Pradesh State Board",
        "class": "Class 8",
        "subject": "Biology",
        "language": "en",
        "version": 1,
        "chapters": [],
    }

    for ch in CHAPTER_RANGES:
        ch_name = ch["name"]
        print(f"\n{'='*60}")
        print(f"Processing: {ch_name}")
        print(f"{'='*60}")

        text = extract_chapter_text(pdf_path, ch)
        print(f"  Extracted {len(text)} chars")

        ch["order"] = CHAPTER_RANGES.index(ch) + 1
        prompt = build_chapter_prompt(ch, text)

        # Save prompt for debugging
        prompt_path = f"/tmp/prompt_{ch['id']}.txt"
        with open(prompt_path, "w") as f:
            f.write(prompt)

        print(f"  Calling Ollama...")
        response = call_ollama(prompt, model=model)

        result = json_try_parse(response)
        if result is None:
            print(f"  WARNING: Could not parse JSON. Saving raw response.")
            with open(f"/tmp/response_{ch['id']}.raw.txt", "w") as f:
                f.write(response)
            concepts = []
        elif isinstance(result, list):
            concepts = result
        else:
            # Response could be {"concepts": [...]} or {"chapters": [{"concepts": [...]}]}
            concepts = result.get("concepts", [])
            if not concepts:
                chapters = result.get("chapters", [])
                if chapters:
                    concepts = chapters[0].get("concepts", [])

        chapter_data = {
            "id": ch["id"],
            "name": ch_name,
            "order": ch["order"],
            "color": ch["color"],
            "concepts": concepts,
        }
        chapter_data = ensure_chapter_keys(chapter_data, ch["order"], ch_name)
        curriculum["chapters"].append(chapter_data)
        print(f"  Found {len(chapter_data.get('concepts', []))} concepts")

        # Write partial progress
        with open(output_path + ".partial", "w") as f:
            json.dump(curriculum, f, indent=2)

    # Final validation
    if not curriculum["chapters"]:
        print("ERROR: No chapters extracted!")
        sys.exit(1)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(curriculum, f, indent=2)

    print(f"\n{'='*60}")
    print(f"Curriculum saved to: {output_path}")
    print(f"Total chapters: {len(curriculum['chapters'])}")
    for ch in curriculum["chapters"]:
        print(f"  {ch['name']}: {len(ch.get('concepts', []))} concepts")


def main():
    parser = argparse.ArgumentParser(description="Build curriculum from textbook PDF")
    parser.add_argument("--pdf", required=True)
    parser.add_argument("--output", default="backend/seed/curriculum/ap-class8-bio.json")
    parser.add_argument("--model", default="llama3.2:3b")
    args = parser.parse_args()
    build_curriculum(args.pdf, args.output, args.model)


if __name__ == "__main__":
    main()

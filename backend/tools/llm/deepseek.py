"""DeepSeek API — text-only answer key generation.

No vision needed. Takes extracted question text as input, returns correct answers.
"""

import json
import time
import requests

DEEPSEEK_ENDPOINT = "https://api.deepseek.com/v1/chat/completions"


def generate_answer_key(api_key: str, questions: list, subject: str = "",
                        model: str = "deepseek-chat") -> list:
    if not questions:
        return []

    subject_line = f" This is a {subject} exam paper for school students." if subject else ""

    prompt = f"""You are an expert teacher.{subject_line} Below is a question paper extracted from a scanned exam. Generate the complete answer key.

QUESTION PAPER:
{json.dumps(questions, indent=2, ensure_ascii=False)}

For EACH question provide the correct answer. Use this format:

{{
  "q": <question number>,
  "type": "mcq" | "short" | "long" | "numerical" | "diagram",
  "correctOption": "<A/B/C/D>" (for MCQ only, empty string otherwise),
  "correctAnswer": "<full correct answer text>",
  "maxMarks": <marks for this question>,
  "explanation": "<1-2 line reason why this is correct>",
  "keyPoints": ["<point 1>", "<point 2>", ...] (for subjective questions),
  "markingScheme": "<how marks are distributed>" (for multi-mark questions)
}}

For MCQs: just the correct option letter and a brief explanation.
For short answers (2-3 marks): answer text with 2-3 key points.
For long answers (4+ marks): complete model answer with key points and marking scheme.
For numerical questions: show the formula and final answer with units.
For diagram questions: describe what should be drawn and labelled.

Return ONLY a JSON array. No other text."""

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 4096,
        "temperature": 0.1,
    }

    for attempt in range(3):
        resp = requests.post(DEEPSEEK_ENDPOINT, headers=headers, json=payload, timeout=90)
        if resp.status_code == 429:
            print(f"[DeepSeek] Rate limited, retry ({attempt+1}/3)...")
            time.sleep(3)
            continue
        resp.raise_for_status()
        break

    data = resp.json()
    if "error" in data:
        raise Exception(f"DeepSeek error: {data['error']}")
    if "choices" not in data:
        raise Exception(f"Unexpected DeepSeek response: {json.dumps(data)[:200]}")

    content = data["choices"][0]["message"]["content"]
    print(f"[DeepSeek] Raw response ({len(content)} chars)")

    json_start = content.find("[")
    json_end = content.rfind("]") + 1
    if json_start >= 0 and json_end > json_start:
        try:
            return json.loads(content[json_start:json_end])
        except json.JSONDecodeError as e:
            print(f"[DeepSeek] JSON parse error: {e}")
            print(f"[DeepSeek] Content was: {content[:500]}...")
            return []

    print(f"[DeepSeek] No JSON array in response. Content: {content[:300]}...")
    return []

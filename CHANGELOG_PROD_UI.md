# prod-ui Branch — Bugs Fixed & Architecture Decisions

## Architecture Changes

### 1. Replaced Local OCR Stack with Vision LLM (OpenRouter)
**Old**: TrOCR (torch + transformers) for handwriting → EasyOCR fallback  
**New**: Gemini Pro via OpenRouter (`~google/gemini-pro-latest`) receives base64-encoded images directly

- All OCR now happens in a single API call per student
- Removes ~4 GB of model weights (torch, torchvision, transformers, easyocr) from dependencies
- Model is configurable via `VISION_MODEL` env var

### 2. Replaced DeepSeek with OpenRouter TEXT_MODEL
**Old**: Ollama/DeepSeek running locally for question paper parsing and answer key generation  
**New**: OpenRouter text model (`~google/gemini-flash-latest`) for all text-only LLM tasks

- Question paper parsing (`parse_questions_text`)
- Answer key generation (`generate-answer-key` endpoint)
- Configurable via `TEXT_MODEL` env var

### 3. Two-Model Strategy
| Task | Model | Env Var |
|------|-------|---------|
| OCR extraction from images | `~google/gemini-pro-latest` | `VISION_MODEL` |
| Subjective semantic grading | `~google/gemini-pro-latest` | `VISION_MODEL` |
| Question paper parsing (text) | `~google/gemini-flash-latest` | `TEXT_MODEL` |
| Answer key generation (text) | `~google/gemini-flash-latest` | `TEXT_MODEL` |

### 4. `~` Prefix = Extended Thinking on OpenRouter
The `~` prefix before a model name enables reasoning/thinking mode on OpenRouter.  
**Rule**: never strip or modify the model string — pass it to the API as-is.

### 5. Multi-Page Answer Sheet Grouping
**Old**: Each uploaded file = one student (broke multi-page sheets)  
**New**: Files grouped by name prefix (`Sanya_01.jpeg`, `Sanya_02.jpeg` → one student "Sanya"), all pages sent together in one LLM call

### 6. Student Identity from Sheet Header (not filename)
**Old**: Student name inferred from filename prefix  
**New**: LLM reads `Name:` and roll number from the handwritten sheet header; filename prefix used only as fallback

### 7. SPA Routing Fix
**Old**: `StaticFiles(html=True)` — doesn't serve `index.html` for arbitrary paths like `/review/asm-abc`  
**New**: Explicit `/{full_path:path}` catch-all route that returns `index.html` for all non-API paths

### 8. MongoDB TLS Only for Remote Connections
**Old**: `certifi.where()` applied unconditionally, breaking localhost MongoDB  
**New**: TLS only applied when connection URL is not `localhost`/`127.0.0.1`

### 9. Lazy MongoDB Connection
MongoDB client is created on first use (not at import time), preventing startup failure when DB is not yet ready.

---

## Bugs Fixed

### OCR / Grading Pipeline

| # | Bug | Fix |
|---|-----|-----|
| 1 | `list index out of range` when building MCQ options prompt | Changed `opts = q.get("options")` → `opts = q.get("options") or []` with `if len(opts) >= 2` guard |
| 2 | `KeyError: 'questionNumber'` in answer key lookup | Generated answer key uses `"q"` field; fixed `key_by_num` to check both `k.get("questionNumber") or k.get("q")` |
| 3 | Subjective questions graded as MCQ ("Could not determine MCQ choice.") | `is_mcq = "options" in q` was True for all questions (even with empty list). Fixed to `is_mcq = bool(q.get("options"))` |
| 4 | Subjective grading always "Pending LLM grading." (0 marks) | `grade_answers()` looked for `expectedText` only; generated answer key uses `correctAnswer` + `keyPoints`. Added fallback to use those fields |
| 5 | LLM JSON response truncated, breaking JSON parse | Increased `max_tokens` from 2000 → 8000 for extraction, 4000 for grading |
| 6 | OpenRouter returning cached responses | Added `X-No-Cache: true` header to all LLM calls |
| 7 | `~` prefix stripped before sending model to OpenRouter | `.lstrip("~")` removed; model string passed as-is |
| 8 | Multi-page sheets created duplicate students | Files now grouped by name prefix; all pages sent together |
| 9 | Second page of answer sheet ignored | Process-one was called per-file, not per-student |

### Frontend / API

| # | Bug | Fix |
|---|-----|-----|
| 10 | `GET /api/assessments` → 404 | FastAPI route `"/"` intercepted by StaticFiles mount before redirect; changed routes to `""` |
| 11 | `/dashboard` → 404 | `StaticFiles(html=True)` doesn't serve index.html for non-root paths; replaced with explicit SPA catch-all |
| 12 | Students showing as "undefined" in evaluations fetch | Students API returned `_id` (Pydantic alias); frontend used `s.id`. Fixed by adding `s["id"] = s["_id"]` in router |
| 13 | Review page stuck on "Processing" screen despite status=complete | `s.id` was `undefined` so evaluations fetch called wrong URL; same fix as above |
| 14 | Answer sheet image not loading (broken placeholder) | Stored as `media/uploads/...` (relative); on `/review/id` this resolved to `/review/media/...`. Fixed to store as `/media/uploads/...` |
| 15 | `analyze-qpaper` ignoring text input | Route returned early if no images before checking `questionsText`. Fixed check order |
| 16 | `GET/POST /api/assessments/` → 405 on prod | Trailing slash route intercepted by static file mount. Removed trailing slash from routes |

### Auth / Config

| # | Bug | Fix |
|---|-----|-----|
| 17 | `TypeError: unsupported operand type(s) for \|` on Python 3.9 | `timedelta \| None` union syntax requires Python 3.10+. Changed to `Optional[timedelta]` |
| 18 | `students/undefined/evaluations` 404 | See bug #12 |

### Question Parser

| # | Bug | Fix |
|---|-----|-----|
| 19 | Heuristic parser creating 33 questions from 17 (section headers, option lines counted as questions) | Rewrote heuristic: only numbered lines become questions; section headers skipped; option lines attached to previous question |
| 20 | Heuristic parser fallback not triggered when count wrong | Added sanity check: falls back to LLM if question count < 5 or > 30, or duplicate numbers |

---

## Dependencies Removed
- `torch`, `torchvision`, `transformers` — no longer needed (no local model inference)
- `easyocr` — replaced by vision LLM
- `opencv-python` — no longer used
- `numpy` — no longer used

## Dependencies Added
- `openai` — OpenRouter API client
- `python-jose[cryptography]` — JWT token handling
- `certifi` — MongoDB Atlas TLS
- `httpx` — required by openai client

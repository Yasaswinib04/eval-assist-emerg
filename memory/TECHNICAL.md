# EvalAssist — Technical Documentation

> Version: 3.0  
> Last Updated: 2026-06-19  
> Target Environment: macOS (Apple Silicon), Linux (CUDA), CPU fallback

---

## 1. System Architecture

### 1.1 High-Level Data Flow

```
Answer Sheet JPEG
       │
       ▼
┌─────────────────────────────┐
│ Preprocessor                │
│  - Load image (PIL→OpenCV)  │
│  - Grayscale + Deskew       │
│  - Bleed-through removal    │
│  - Ruling line erasure      │
│  - CLAHE contrast enhance   │
│  - Adaptive threshold       │
│  Returns: (binary, gray)    │
└──────────┬──────────────────┘
           ▼
┌─────────────────────────────┐
│ LineSegmenter               │
│  - Detect page type         │
│  - Horizontal projection    │
│  - Split tall blocks        │
│  - Diagram detection        │
│  Returns: [(x1,y1,x2,y2)]   │
└──────────┬──────────────────┘
           ▼
┌─────────────────────────────┐
│ OCR Engine (lang-aware)     │
│  EN: TrOCR (greedy/beam)    │
│  HI/TE: PaddleOCR→EasyOCR   │
│  Returns: [(text, conf)]    │
└──────────┬──────────────────┘
           ▼
┌─────────────────────────────┐
│ AnswerMapper                │
│  - Multi-page merge check   │
│  - Ollama structuring        │
│  - MCQ row parsing          │
│  - Review flag computation  │
│  - Grading (fuzzy match)    │
│  Returns: structured JSON   │
└─────────────────────────────┘
```

### 1.2 Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Backend Framework | FastAPI | 0.110.1 |
| Python | CPython | 3.13 |
| Database | MongoDB (motor async) | 4.5.0 |
| Auth | JWT (python-jose) + bcrypt | 4.1.3 |
| Frontend | React | 19 |
| CSS | Tailwind CSS | 3.x |
| UI Components | shadcn/ui | latest |
| State Management | @tanstack/react-query | v5 |
| Routing | react-router-dom | v7 |
| Charts | recharts | latest |
| OCR Framework | transformers (HuggingFace) | latest |
| ML Runtime | PyTorch | latest |
| Image Processing | OpenCV | 4.10+ |
| Indic OCR Primary | PaddleOCR | 2.9+ |
| Indic OCR Fallback | EasyOCR | 1.7+ |
| LLM Post-processing | Ollama (Llama 3.2 3B) | latest |

---

## 2. OCR Pipeline — Deep Dive

### 2.1 Answer Sheet Processor (`answer_sheet_ocr.py`)

The main orchestrator. Modularized into 4 classes:

#### `Preprocessor`

| Method | Purpose |
|--------|---------|
| `preprocess(path) → (binary, gray)` | Full preprocessing pipeline |
| `_load_image(path) → BGR` | PIL→OpenCV conversion |
| `_deskew(gray) → gray` | Min-area-rect angle correction |
| `_remove_bleed_through(gray) → gray` | Morphological opening (kernel 1×15) |
| `_erase_ruling_lines(gray) → (gray, lines)` | Projection peak detection → cv2.line(white) |
| `detect_page_type(binary) → str` | "ruled" or "freeform" |

**Bleed-through algorithm (I2)**:
```
1. Create vertical kernel (1×15) via getStructuringElement(MORPH_RECT)
2. Morphological OPEN: removes horizontal ink blobs
3. Weighted blend: gray * 0.75 + opened * 0.25
```

**Ruling line erasure**:
```
1. Invert image (255 - gray)
2. Horizontal projection → mean pixel intensity per row
3. Detect peaks where h_proj > mean * 2.0
4. Cluster adjacent peaks into line groups
5. For each line y, draw cv2.line(white, thickness=2)
```

#### `LineSegmenter`

| Method | Purpose |
|--------|---------|
| `segment_regions(binary, page_type) → [(x1,y1,x2,y2)]` | Full segmentation |
| `_projection_segment(binary) → regions` | Horizontal projection with threshold `max(2.5, mean*0.12)` |
| `_split_tall_regions(binary, regions) → regions` | Split blocks > 60px (MAX_LINE_HEIGHT) |
| `_merge_close_regions(regions, gap=2) → regions` | Merge if gap < 2px |
| `is_diagram_region(crop) → bool` | White-ratio > 60% + irregular contour check |

**Tall block splitting** (handles dense handwriting):
```
Strategy 1: Sub-projection within block at threshold max(1.5, block_mean*0.05)
Strategy 2: Even-split using estimated_line_height (median of short regions)
  - Add 3px gap between heuristic lines to prevent re-merging
```

**Diagram detection (I5)**:
```
1. Compute white-space ratio: (gray > 200).sum() / total_pixels
2. If ratio <= 0.60 → not a diagram
3. Threshold at 200, find contours
4. For each contour area > 200: compute area/perimeter²
5. If < 0.04 (irregular shape): count as irregular
6. Return True if >= 2 large irregular contours exist
```

#### `AnswerMapper`

| Method | Purpose |
|--------|---------|
| `postprocess(texts, use_ollama, hint) → structured` | Route to Ollama or fallback |
| `_postprocess_ollama(texts, hint) → structured` | Build prompt, call Ollama, parse JSON |
| `_fallback_postprocess(texts) → structured` | Heuristic MCQ + sequential mapping |
| `_parse_mcq_row(text) → {q_num: letter}` | Regex `\d{1,2}\s*[.)\s]*\s*[A-Da-d]` |
| `grade(extracted) → evaluations` | Compare to questions.json |
| `compute_review_flags(text, mcq, is_mcq, q_id) → flags` | Independent review flags |
| `_is_sentence_complete(text) → bool` | Multi-page merge detection |

#### `AnswerSheetProcessor`

| Method | Purpose |
|--------|---------|
| `_get_ocr_engine() → engine` | Language-aware engine factory |
| `_init_trocr() → TrOCREngine` | Wraps handwriting_ocr singleton |
| `_init_indic_ocr() → PaddleEngine/EasyOCREngine` | Tries PaddleOCR first |
| `process(paths, student_id, use_ollama) → dict` | Full pipeline |
| `process_all(students_json, dir, ...) → list` | Batch mode |

### 2.2 Handwriting OCR (`handwriting_ocr.py`)

TrOCR-base-handwritten wrapper. Singleton pattern.

```
Device priority: CUDA → MPS (Apple Silicon) → CPU

read_line(path, max_new_tokens=128)
  → greedy decode (do_sample=False)
  → Returns: str

read_line_with_confidence(path, max_new_tokens=128, use_beam=False)
  → greedy: heuristic confidence from text quality (alpha ratio, length, <unk>)
  → beam: num_beams=4, output_scores=True, conf = exp(score/seq_len) ∈ [0,1]
  → Returns: (str, float)
```

**Confidence scoring (I4)**:
- Greedy mode: `0.4 + 0.5 * alpha_ratio` (ratio of alphabetic chars), clamped to [0, 0.9]
- Beam mode: normalized sequence log-probability
- `<unk>` tokens → 0.2
- Empty text → 0.0

### 2.3 Other OCR Models

#### Layout Detector (`layout_detector.py`)
- Model: `Armaggheddon/yolo11n-document-layout` (2.7M params, MIT)
- Detects 11 classes: text, title, table, figure, caption, list-item, formula, section-header, page-header, page-footer, footnote
- Auto-downloads to `_models/yolo11n_doc_layout.pt` on first use

#### Printed OCR (`printed_ocr.py`)
- Model: `ds4sd/SmolDocling-256M-preview` (256M params, Apache 2.0)
- Full-page printed document → Markdown via DocTags
- Attention: flash_attention_2 on CUDA, eager on CPU/MPS

#### Concept Matcher (`concept_matcher.py`)
- Model: `sentence-transformers/all-MiniLM-L6-v2` (22M params, Apache 2.0)
- Question text + curriculum concepts → cosine similarity ranking
- Top-3 concept matches returned

---

## 3. CLI Reference

### `pipeline.py` Subcommands

```bash
# Answer sheet processing (main use case)
python3 backend/tools/ocr/pipeline.py answersheet \
  [--images PATH [PATH ...]] \
  [--student-id ID] \
  [--questions PATH] \
  [--output PATH] \
  [--lang {en,hi,te}] \
  [--no-ollama] \
  [--all-students] \
  [--students PATH] \
  [--sheets-dir PATH]

# Layout detection
python3 backend/tools/ocr/pipeline.py layout \
  --pdf PATH [--page N] [--conf 0.0-1.0]

# Printed OCR (textbook/question paper)
python3 backend/tools/ocr/pipeline.py ocr \
  --pdf PATH [--image PATH]

# Full textbook pipeline
python3 backend/tools/ocr/pipeline.py textbook \
  --pdf PATH [--max-pages N] [--output PATH]

# Handwriting recognition (single lines)
python3 backend/tools/ocr/pipeline.py handwriting \
  --images PATH [PATH ...]

# Concept matching
python3 backend/tools/ocr/pipeline.py match \
  --question "text" [--curriculum PATH]
```

### Output Format

Single student output (`answers_{sid}.json`):
```json
{
  "studentId": "stu-01",
  "studentName": "Karan",
  "language": "en",
  "imagesProcessed": ["media/samples/answer_sheets/Karan.jpeg"],
  "rawTexts": ["denmark", "# Section A. \"", ...],
  "structured": [
    {
      "questionNumber": 1,
      "extractedAnswer": "denmark",
      "mcqChoice": null,
      "needsReview": true,
      "ocrConfidence": 0.5
    }
  ],
  "evaluations": [
    {
      "qId": "q1",
      "aiMark": 0,
      "confidence": "low",
      "confidenceScore": 30,
      "needsReview": true,
      "studentAnswer": "denmark",
      "reasoning": "Could not determine MCQ choice."
    }
  ]
}
```

---

## 4. Database Schema (MongoDB)

### Collections

| Collection | Documents | Key Fields |
|-----------|-----------|------------|
| `users` | Teacher accounts | `email`, `hashed_password`, `name` |
| `curricula` | Class 8 Biology | `chapters[].name`, `.concepts[].name`, `.concepts[].keywords` |
| `assessments` | 4 assessments | `id`, `name`, `status`, `subject`, `class` |
| `questions` | 17 questions | `id`, `number`, `section`, `maxMarks`, `text`, `options[]`, `correctAnswer`, `chapter`, `concept`, `skill`, `difficulty` |
| `students` | 8 students | `id`, `name`, `roll`, `total`, `status`, `imageUrls[]` |
| `evaluations` | 1242 records | `qId`, `aiMark`, `confidence`, `studentAnswer`, `reasoning`, `needsReview` |
| `interventions` | AI action plans | `concept`, `priority`, `action`, `studentsAffected`, `planned` |

---

## 5. Frontend Architecture

### Component Tree

```
App
├── AppContext (auth + i18n)
├── Layout
│   ├── Sidebar (collapsible left rail)
│   │   ├── Workspace: Dashboard, Assessments, Review, Insights, Interventions
│   │   ├── Account: Settings
│   │   └── LanguageToggle (EN/HI/TE)
│   ├── MobileTopBar
│   └── <Outlet /> (react-router)
│       ├── Login
│       ├── Dashboard
│       ├── Upload (Create Assessment)
│       ├── Analysis
│       ├── Processing
│       ├── Review
│       ├── Insights
│       ├── Interventions
│       └── StudentProfile
└── Breadcrumbs (conditional)
```

### Data Layer

```
Page Component
  → useQuery (via @tanstack/react-query)
    → apiClient.js
      → try: fetch("http://localhost:8000/api/...")
      → catch: fall back to mockData.js
```

### Key Hooks

| Hook | Purpose |
|------|---------|
| `useApp()` | Auth state, user, translations, language |
| `useCountUp(target, {duration, decimals})` | Animated counter (ease-out cubic) |

---

## 6. Configuration

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `MONGODB_URI` | `mongodb://localhost:27017` | MongoDB connection |
| `JWT_SECRET` | (auto-generated) | JWT signing key |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama API endpoint |

### OCR Constants

| Constant | Value | Location |
|----------|-------|----------|
| `MAX_LINE_HEIGHT` | 60px | `answer_sheet_ocr.py:LineSegmenter` |
| `MERGE_GAP` | 2px | `answer_sheet_ocr.py:LineSegmenter` |
| YOLO confidence | 0.25 | `layout_detector.py` (overridable via `--conf`) |
| PDF render DPI | 150 | `layout_detector.py`, `printed_ocr.py` |
| TrOCR max_new_tokens | 128 | `handwriting_ocr.py` |
| TrOCR num_beams | 4 (beam mode) | `handwriting_ocr.py` |
| Ollama model | `llama3.2:3b` | `answer_sheet_ocr.py` |

---

## 7. Performance Characteristics

### OCR Pipeline (per student, 1 sheet, ~40 regions)

| Platform | Greedy Decode | Beam Search (4) |
|----------|--------------|-----------------|
| Apple MPS | ~20s | ~90s |
| CUDA (GPU) | ~8s | ~30s |
| CPU | ~40s | ~200s |

### PaddleOCR / EasyOCR (Hindi/Telugu)

| Engine | Platform | Per Line |
|--------|----------|----------|
| PaddleOCR | CPU (no MPS) | 5-10s |
| EasyOCR | CPU | 1-3s |

### Model Loading (cold start)

| Model | Size | Load Time (MPS) |
|-------|------|----------------|
| TrOCR | 330M | ~20s |
| YOLO11n | 2.7M | ~2s |
| SmolDocling | 256M | ~15s |
| MiniLM | 22M | ~3s |
| PaddleOCR (HI) | ~300M | ~30s |
| EasyOCR (HI) | ~100M | ~10s |

---

## 8. Testing

### Running Tests

```bash
cd backend
pytest tests/
```

### Test Coverage (Current)

- Auth service: JWT generation, password hashing
- OCR pipeline: import validation, preprocessing output shapes, segmentation region counts
- API endpoints: CRUD operations on all collections
- Frontend: component rendering via React Testing Library

### Manual QA Checklist

- [ ] Login with test credentials
- [ ] Upload assessment with sample answer sheets
- [ ] Verify OCR pipeline runs (`pipeline.py answersheet --all-students`)
- [ ] Review & Override: focused mode, list mode, batch approve
- [ ] Classroom Insights: heatmap, chapter performance
- [ ] Interventions: create, mark as planned
- [ ] Student Profile: concept mastery visualization
- [ ] Language toggle: EN/HI/TE (strings fall back to EN if untranslated)

---

## 9. Known Issues

### 9.1 Critical

| Issue | Impact | Workaround |
|-------|--------|-----------|
| TrOCR + children's handwriting = poor accuracy | OCR output heavily garbled for most students | Use Ollama post-processing; run beam search for higher quality |
| `mock_concepts.py` module missing | `pipeline.py match` without `--curriculum` fails | Always pass `--curriculum seed/curriculum/ap-class8-bio.json` |
| SmolDocling `_max_new_tokens` never initialized | Falls back to default 8192 (works but unclean) | Set in `__init__` or remove getattr fallback |

### 9.2 Medium

| Issue | Impact | Workaround |
|-------|--------|-----------|
| Heuristic even-split creates fixed-height regions | Text may be cut mid-word if line spacing varies | Use Ollama to recombine adjacent fragments |
| No confidence threshold for discarding unreadable regions | Garbage text passed through to evaluation | `compute_review_flags` catches `<unk>` and too-short text |
| PaddleOCR CPU-only on macOS | Hindi/Telugu processing is slow | Use EasyOCR fallback; run on Linux CUDA for PaddleOCR performance |
| Ollama not available = rule-based fallback only | MCQ mapping relies on fragile regex | Install Ollama and pull `llama3.2:3b` |

### 9.3 Low

| Issue | Impact | Workaround |
|-------|--------|-----------|
| Singleton pattern prevents multi-language simultaneous use | Only one TrOCR model can be loaded at a time | Restart process to switch languages |
| Duplicate student name for Aryan processed via CLI | `studentName: "?"` in output | Use `--student-id` + pass name separately or use batch mode |
| `Suvarsha Chennareddy.jpeg` not in students.json | Image exists but not linked to any student | Add student record or remove orphan image |
| No handling of answer sheets with > 2 pages | Students with 3+ pages may have incomplete mapping | Adjust `_is_sentence_complete` threshold; test with 3+ sheets |

---

## 10. Open Questions

1. **Real LLM Evaluation (P1)**: Currently evaluations use seeded mock data + fuzzy keyword matching. When should we integrate an actual LLM (e.g., Llama via Ollama) to evaluate subjective answers against rubrics? This would replace the `_fuzzy_match_score` method.

2. **Hindi/Telugu OCR Accuracy**: Neither PaddleOCR nor EasyOCR has been tested on children's Devanagari/Telugu handwriting. What is the minimum acceptable accuracy before we can claim language support?

3. **TrOCR Fine-tuning**: Should we fine-tune TrOCR-base-handwritten on a dataset of Indian school children's handwriting? This could dramatically improve English OCR accuracy but requires labeled data.

4. **Answer Sheet Template Support**: The current pipeline auto-detects page layout. Should we add support for pre-configured answer sheet templates (e.g., CBSE format) to improve segmentation accuracy?

5. **Confidence Score Semantics**: The `confidence` field in evaluation output mixes OCR confidence (from beam search) with grading confidence (from fuzzy matching). Should these be separate fields?

6. **SmolDocling for Answer Sheets**: SmolDocling is currently used only for printed PDFs. Could it be adapted for handwritten answer sheets as a page-level alternative to line-by-line TrOCR?

7. **Cross-Assessment Trends**: The backend has endpoints for student term trends but the data is mocked. When should this be wired to real assessment history?

8. **Offline Fallback**: The frontend falls back to `mockData.js` when the API is unavailable. Should the OCR pipeline also have an offline mode that skips TrOCR and uses only rule-based extraction?

---

## 11. Development Setup

### First-Time Setup

```bash
# 1. Clone
git clone https://github.com/Yasaswinib04/eval-assist-emerg.git
cd eval-assist-emerg

# 2. Backend
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt

# 3. Install OCR dependencies (transformers + torch are separate)
pip install torch torchvision
pip install transformers sentencepiece
pip install opencv-python-headless
pip install paddlepaddle paddleocr easyocr

# 4. Database
# Start MongoDB locally or use connection string
export MONGODB_URI="mongodb://localhost:27017"

# 5. Seed data
cd backend
python3 seed/seed.py

# 6. Start backend
python3 server.py

# 7. Frontend (new terminal)
cd frontend
npm install
npm start
```

### Optional: Ollama Setup

```bash
# Install Ollama (macOS)
brew install ollama

# Pull Llama 3.2 3B model
ollama pull llama3.2:3b

# Start Ollama service
ollama serve
```

---

## 12. Contributing

### Code Style
- Python: Black (line length 88), isort, flake8
- JavaScript: ESLint (via create-react-app)
- Follow existing patterns in each file

### Pre-Commit Checklist
```bash
cd backend && black . && isort . && flake8 . && mypy .
cd frontend && npm run lint
```

### Adding New OCR Features
1. Add model loading in appropriate module (prefer lazy loading)
2. Add CLI subcommand in `pipeline.py`
3. Update `__init__.py` exports
4. Add to `requirements.txt` if new dependency
5. Update this documentation

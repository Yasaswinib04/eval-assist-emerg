# EvalAssist — Assessment Intelligence Platform (v3)

> AI-powered answer sheet evaluation for Indian government school teachers.  
> Concept mastery focus. Sahayak AI-inspired UX. Fully open-source, fully local.

---

## What It Does

EvalAssist helps **Class 8 Biology teachers** evaluate handwritten student answer sheets using local, open-source AI models. No cloud APIs, no paid services — everything runs on-device.

**Input**: Scanned student answer sheets (JPEG/PDF)  
**Output**: Per-question marks, confidence scores, classroom insights, and AI intervention recommendations

### Screens (9)

| # | Screen | Purpose |
|---|--------|---------|
| 1 | **Login** | JWT auth, split-pane teacher login |
| 2 | **Dashboard** | Time-aware greeting, 3 KPIs, upload CTA, recent assessments |
| 3 | **Create Assessment** | 4 upload zones: QP, Answer Sheets, Rubric, Model Answer |
| 4 | **Assessment Analysis** | Chapter mapping, concept chips, question breakdown, prerequisite map |
| 5 | **Processing** | 6-step animated tracker (OCR → Analysis → Concepts → Eval → Gap → Insights) |
| 6 | **Review & Override** | Focused mode (one question at a time), list mode, batch approve, keyboard shortcuts |
| 7 | **Classroom Insights** | KPIs, heatmap, chapter performance, score distribution, root-cause AI |
| 8 | **Interventions** | AI-recommended actions by priority, mark-as-planned toggle |
| 9 | **Student Profile** | Strong/Developing/Needs Support concepts, misconceptions, mastery |

---

## Architecture

```
┌─────────────────────┐     ┌─────────────────────┐
│   React 19 Frontend │────▶│   FastAPI Backend    │
│   (Tailwind/shadcn) │     │   (Python 3.13)     │
│   @tanstack/query   │     │                     │
└─────────────────────┘     └──────────┬──────────┘
                                       │
                          ┌────────────┼────────────┐
                          ▼            ▼            ▼
                   ┌──────────┐ ┌──────────┐ ┌──────────┐
                   │ MongoDB  │ │  OCR     │ │  Ollama  │
                   │ (motor)  │ │ Pipeline │ │ (Llama)  │
                   └──────────┘ └──────────┘ └──────────┘
```

### OCR Pipeline (6 Models, All Local)

| Stage | Model | Size | License |
|-------|-------|------|---------|
| Layout Detection | YOLO11n-document-layout | 2.7M | MIT |
| Printed OCR | SmolDocling-256M-preview | 256M | Apache 2.0 |
| Handwriting OCR (EN) | TrOCR-base-handwritten | 330M | MIT |
| Handwriting OCR (HI/TE) | PaddleOCR / EasyOCR | — | Apache 2.0 |
| Concept Matching | all-MiniLM-L6-v2 | 22M | Apache 2.0 |
| Text Structuring | Llama 3.2 3B (via Ollama) | 3B | Llama 3.2 |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Tailwind CSS, shadcn/ui, recharts, lucide-react, @tanstack/react-query |
| Backend | FastAPI (Python), motor (async MongoDB), Pydantic v2 |
| Auth | JWT (python-jose), bcrypt password hashing |
| Database | MongoDB (6 collections: curricula, assessments, questions, students, evaluations, interventions, users) |
| OCR | TrOCR, PaddleOCR, EasyOCR, SmolDocling, YOLO, MiniLM |
| AI/LLM | Ollama (Llama 3.2 3B) for answer structuring |
| i18n | English, Hindi, Telugu language toggle |

---

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- MongoDB (local or Atlas)
- Ollama (optional, for intelligent post-processing)

### Backend

```bash
cd backend
pip install -r requirements.txt

# Start MongoDB (if not running)
mongod --dbpath ./data &

# Seed the database
python3 seed/seed.py

# Start FastAPI
python3 server.py
```

### Frontend

```bash
cd frontend
npm install
npm start
```

### OCR Pipeline (Standalone)

```bash
# Process a single answer sheet
python3 backend/tools/ocr/pipeline.py answersheet \
  --images media/samples/answer_sheets/Karan.jpeg \
  --student-id stu-01

# Batch process all students
python3 backend/tools/ocr/pipeline.py answersheet --all-students

# Hindi answer sheets
python3 backend/tools/ocr/pipeline.py answersheet \
  --images sheet.jpg --lang hi

# Telugu answer sheets
python3 backend/tools/ocr/pipeline.py answersheet \
  --images sheet.jpg --lang te

# Handwriting recognition (single line)
python3 backend/tools/ocr/pipeline.py handwriting \
  --images line1.png line2.png

# Concept matching
python3 backend/tools/ocr/pipeline.py match \
  --question "What is mitosis?" \
  --curriculum seed/curriculum/ap-class8-bio.json
```

---

## Features

- Sidebar navigation (collapsible, mobile-responsive)
- 3-language toggle (EN/HI/TE)
- Personal time-aware greeting on dashboard
- Status badges: Needs Review / Complete / Draft / Processing
- Focused one-question-at-a-time review with keyboard shortcuts (A/E/←/→)
- Batch approval for high-confidence evaluations
- Concept Mastery Heatmap
- AI-generated Interventions (High/Medium/Low priority)
- Breadcrumb navigation
- PDF curriculum extraction (DOCX → structured JSON)
- Textbook diagram extraction (PDF → 191 images via PyMuPDF)

---

## ⚠️ Known Limitations & Warnings

### TrOCR Accuracy on Children's Handwriting
TrOCR-base-handwritten was trained on the **IAM Handwriting Database** (adult English handwriting). On Indian school children's handwriting, accuracy drops significantly. Expect garbled output for heavily cursive or irregular writing.

**Mitigations**:
- Use **Ollama** post-processing (Llama 3.2 3B) to contextually correct OCR errors
- Focused Review mode flags low-confidence items for teacher override
- Beam search (`use_beam=True`) improves accuracy but is 4-10x slower

### TrOCR on Apple Silicon (MPS)
Beam search on MPS is slow (~4s per line). Greedy decode is ~0.3s per line but produces lower-quality text. The default is greedy for batch speed.

### Hindi/Telugu OCR
- **PaddleOCR** is the primary engine for Indic scripts but runs **CPU-only on macOS** (5-10s per line)
- **EasyOCR** is the fallback (lighter, faster, supports hi/te)
- Neither has been tested on children's handwriting in these languages — accuracy is unknown

### Diagram Questions (Q15)
Diagram detection works via white-space ratio + contour analysis. Detected diagrams are flagged `[DIAGRAM]` with `needsReview: true`. The model does NOT evaluate diagram correctness.

### Ollama Dependency
- Post-processing quality depends on Ollama running locally
- Without Ollama, falls back to rule-based heuristic mapping (less accurate)
- Requires `llama3.2:3b` model (`ollama pull llama3.2:3b`)

### Answer Sheet Format
The segmentation pipeline auto-detects ruled vs free-form pages but struggles with:
- Very dense handwriting (no line gaps)
- Mixed printed + handwritten content
- Non-standard answer sheet layouts

### Missing Features (P1 Backlog)
- Real LLM-based answer evaluation (currently uses seeded mock evaluations + fuzzy matching)
- Hindi/Telugu translations for v3 UI strings
- Audit log of all teacher overrides
- Cross-assessment per-student term trends

---

## File Structure

```
├── backend/
│   ├── server.py              # FastAPI entry point
│   ├── core/                  # Config, DB connection
│   ├── models/                # Pydantic schemas
│   ├── routers/               # REST endpoints (auth, assessments, questions, etc.)
│   ├── services/              # Auth service, business logic
│   ├── seed/                  # MongoDB seed data + curriculum
│   └── tools/ocr/             # OCR Pipeline
│       ├── pipeline.py        # CLI entry point (6 subcommands)
│       ├── answer_sheet_ocr.py # Answer sheet processing (Preprocessor, LineSegmenter, AnswerMapper, AnswerSheetProcessor)
│       ├── handwriting_ocr.py # TrOCR wrapper with confidence scoring
│       ├── layout_detector.py # YOLO11n document layout
│       ├── printed_ocr.py     # SmolDocling full-page OCR
│       ├── concept_matcher.py # MiniLM question-concept matching
│       ├── curriculum_builder.py # Textbook → structured JSON
│       └── output/            # Generated per-student evaluation JSONs
├── frontend/
│   └── src/
│       ├── components/        # Sidebar, Layout, Breadcrumbs, LanguageToggle
│       ├── pages/             # Login, Dashboard, Upload, Analysis, Processing, Review, Insights, Interventions, StudentProfile
│       ├── contexts/          # AppContext (auth + i18n)
│       ├── data/              # mockData.js (fallback), apiClient.js, translations.js
│       └── hooks/             # useCountUp, etc.
├── media/samples/answer_sheets/  # 13 student answer sheet JPEGs
├── Biology/                      # Textbook PDF, question papers, sample answers
├── memory/PRD.md                 # Full product requirements document
└── tests/
```

---

## API Endpoints (20+)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/login` | Teacher login (JWT) |
| GET | `/assessments` | List assessments |
| GET | `/assessments/{id}` | Assessment detail |
| POST | `/assessments` | Create assessment |
| GET | `/questions?assessment={id}` | List questions |
| GET | `/students?assessment={id}` | List students |
| GET | `/evaluations/{student_id}` | Get evaluations |
| PUT | `/evaluations/{student_id}/{q_id}` | Override evaluation |
| GET | `/insights/{assessment_id}` | Classroom insights |
| GET | `/interventions/{assessment_id}` | AI interventions |
| PUT | `/interventions/{id}/plan` | Mark intervention as planned |
| GET | `/students/{id}/profile` | Student learning profile |
| GET | `/students/{id}/trends` | Cross-assessment trends |

---

## License

All OCR models are under MIT or Apache 2.0 licenses. See individual model repos for details.

### Models Used
- YOLO11n-document-layout: MIT (Armaggheddon)
- SmolDocling-256M: Apache 2.0 (IBM DS4SD)
- TrOCR-base-handwritten: MIT (Microsoft)
- all-MiniLM-L6-v2: Apache 2.0 (Sentence Transformers)
- PaddleOCR: Apache 2.0 (PaddlePaddle)
- EasyOCR: Apache 2.0 (JaidedAI)
- Llama 3.2: Llama 3.2 Community License (Meta)

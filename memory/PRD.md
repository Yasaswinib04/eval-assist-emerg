# EvalAssist — Assessment Intelligence Platform (v3)

## Original Problem Statement
Modern web app for Indian government school teachers — AI-powered answer sheet evaluation with focus on concept mastery and learning outcomes, plus Sahayak AI-inspired layout & UX.

## User Choices
- Full-stack application with real backend and database
- EN/HI/TE language toggle
- Simple teacher login (JWT-based auth with bcrypt)
- Class 8 Biology SA1 sample paper provided by user

## Architecture
### Frontend
React 19 + Tailwind + shadcn/ui + recharts + lucide-react + sonner + @tanstack/react-query.
- **Sidebar layout** (left rail, collapsible) replacing the old top-header — Workspace (Dashboard, Assessments, Review & Override, Insights, Interventions) + Account (Settings) + Language toggle + user profile
- Mobile: top bar + horizontal nav row
- Breadcrumbs component on Analysis / Review / Insights / Interventions / StudentProfile
- AppContext for auth + i18n; localStorage persistence
- Dual-mode data layer: `apiClient.js` — tries backend API first, falls back to mock data

### Backend
**Stack**: FastAPI (Python) + MongoDB (motor) + JWT auth (python-jose, bcrypt)
- 6 MongoDB collections: curricula, assessments, questions, students, evaluations, interventions, users
- REST API with routers for auth, assessments, questions, students, evaluations, insights, interventions
- Seed script loads curriculum + mock data into MongoDB
- Seed data extracted programmatically from frontend mockData.js

### OCR Pipeline (open-source, all local)
- **Layout Detection**: YOLO11n-document-layout (MIT, 2.7M params) — detects text, tables, figures, headers per page
- **Printed OCR**: SmolDocling-256M-preview (Apache 2.0, 256M params) — full-page document conversion to Markdown with layout preservation
- **Handwriting OCR**: TrOCR-base-handwritten (MIT, 330M params) — line-level handwriting extraction
- **Concept Matching**: all-MiniLM-L6-v2 (Apache 2.0, 22M params) — question-to-curriculum concept mapping via cosine similarity
- **Device support**: CUDA → MPS (Apple Silicon) → CPU auto-detection
- Unified CLI: `python3 backend/tools/ocr/pipeline.py`

## Screens (8 + redesigned Review)
1. **Login** — split-pane with value props
2. **Dashboard** — time-based greeting ("Good morning/afternoon/evening, Lakshmi"), 3 KPIs, Upload CTA card, recent assessments table with status badges (**needs review / complete / draft / processing**)
3. **Create Assessment** — 4 upload zones (QP required, Answer Sheets required, Rubric optional, Model Answer optional) + AI extraction promise
4. **Assessment Analysis** — chapter mapping, editable concept chips, question-wise breakdown with chapter/concept/skill/difficulty, prerequisite concept map
5. **Processing** — 6 step animated tracker (OCR → QP analysis → concepts → eval → gap → insights)
6. **Review & Override (REDESIGNED)**:
   - **Focused mode**: one question at a time, big progress bar, AI confidence %, AI reasoning panel, override input, Approve/Skip/Prev/Next buttons, **keyboard shortcuts** (A=approve, →=next, ←=prev, E=edit)
   - **List mode**: classic vertical stack
   - **Three tabs**: Needs Review (default), High Confidence, All
   - **Batch approve** on High Confidence tab — one-click "Approve all high-confidence" with confidence-avg banner
   - Sticky footer with review progress %, save & next
7. **Classroom Insights** — KPIs, Root-cause AI insights, Concept Mastery Heatmap, Chapter-wise Performance, Score Distribution, Most Missed, Students Requiring Intervention, "Interventions" CTA button
8. **Interventions (NEW)** — AI-recommended teaching actions grouped by High/Medium/Low priority. Each card: concept, chapter, action text, students affected count, "Mark as planned" toggle. Planned counter in header.
9. **Student Learning Profile** — Strong/Developing/Needs Support concepts, AI misconceptions, topic-wise chapter mastery

## Sahayak AI Features Imported ✓
- ✅ Sidebar navigation (vs top header)
- ✅ Interventions page with action plans
- ✅ Richer Insights (heatmap, root cause, chapter perf, intervention list)
- ✅ Status badges: review / complete / draft
- ✅ Breadcrumb navigation across all main pages
- ✅ Personal greeting on dashboard (time-aware)
- ✅ Student profile linking from insights

## Review Page Fixes ✓
- ✅ One-question-at-a-time focused mode
- ✅ Quick approve flow + keyboard shortcuts (A/E/←/→)
- ✅ Progress indicator (top bar in card + footer bar)
- ✅ Batch approval for high-confidence items
- ✅ Split view: High Confidence (quick approve) vs Needs Review (detailed)

## Files
### Frontend
- Pages: Login, Dashboard, Upload, Analysis, Processing, Review, Insights, Interventions, StudentProfile
- Components: Sidebar (+ MobileTopBar), Layout, Breadcrumbs, LanguageToggle
- Data: mockData.js (fallback), apiClient.js (primary data layer), translations.js
- Context: AppContext.jsx
- Packages: @tanstack/react-query for data fetching, react-router-dom v7 for routing

### Backend
- `server.py` — FastAPI app entry point, CORS, router mounting
- `models/` — Pydantic models for curriculum, assessment, question, student, evaluation, intervention, user
- `routers/` — REST endpoints for auth, assessments, questions, students, evaluations, insights, interventions
- `services/` — Auth service (JWT, bcrypt), business logic
- `seed/seed.py` — Database seeder loading curriculum + mock data
- `tools/ocr/` — OCR pipeline (layout detection, printed OCR, handwriting OCR, concept matching)
- `core/` — Config, database connection (motor)

## Completed Milestones
- ✅ Real backend pipeline with FastAPI + MongoDB
- ✅ JWT-based authentication with bcrypt password hashing
- ✅ Full REST API: 20+ endpoints covering all 9 frontend pages
- ✅ Dual-mode frontend data layer (API-first, mock fallback)
- ✅ All 6 pages rewired to use @tanstack/react-query + apiClient
- ✅ Curriculum extraction from DOCX (rule-based, chapter/concept/keywords)
- ✅ Diagram extraction from textbook PDF (191 images from PyMuPDF)
- ✅ OCR pipeline with 4 open-source Hugging Face models (YOLO, SmolDocling, TrOCR, MiniLM)
- ✅ Device auto-detection: CUDA → MPS → CPU
- ✅ Interventions save/load from database
- ✅ Student term trends and concept trends APIs

## Backlog
- P1: Real GPT/LLM evaluation (currently using seeded evaluations from mock data)
- P2: Hindi/Telugu translations for new v3 strings (currently fall back to English)
- P2: Audit log of all overrides
- P2: Cross-assessment trends improved (per-student term view)

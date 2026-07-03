# EvalAssist — Assessment Intelligence Platform v3

AI-powered answer sheet evaluation for Indian government school teachers (Class 8 Biology). Ingests scanned handwritten answer sheets, runs local OCR + LLM pipeline, outputs per-question marks, confidence scores, classroom insights, and intervention recommendations. Runs entirely on-device with no cloud dependencies.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, CRA + CRACO, shadcn/ui (New York style), Tailwind CSS, React Router v7, @tanstack/react-query, recharts, lucide-react |
| Backend | FastAPI, motor (async MongoDB), Pydantic v2, python-jose JWT, bcrypt |
| Database | MongoDB (collections: users, assessments, questions, students, evaluations, interventions, curricula) |
| OCR | YOLO11n (layout), SmolDocling-256M (printed text), TrOCR-base-handwritten (handwriting), PaddleOCR/EasyOCR (Hindi/Telugu), MiniLM (concept matching) |
| LLM | Ollama (Llama 3.2 3B), optional OpenRouter (Qwen3-VL) |
| i18n | English, Hindi, Telugu |
| Deployment | Render.com (single Python web service serving API + static frontend) |

## Directory Map

```
Shipyard/
├── backend/               FastAPI API server
│   ├── server.py          Entry point, CORS, static serving, SPA fallback
│   ├── core/              config.py (pydantic-settings), database.py (Motor)
│   ├── routers/           REST routers — one file per resource
│   ├── models/            Pydantic models — one file per entity
│   ├── services/          Auth service, answer key parser (heuristic + Ollama)
│   ├── tools/ocr/         OCR pipeline CLI (pipeline.py + modular stages)
│   └── seed/              MongoDB seed data + curriculum JSONs + seed.py
├── frontend/              React SPA
│   └── src/
│       ├── pages/         Route-level pages (Dashboard, Upload, Review, Insights, etc.)
│       ├── components/    App layout, Sidebar, LanguageToggle, ui/ (46 shadcn primitives)
│       ├── contexts/      AppContext (auth state + i18n + subject/class)
│       ├── data/          apiClient.js, translations.js, mockData.js, gradeUtils.js
│       ├── hooks/         use-toast (shadcn), useCountUp
│       └── constants/     testIds/ — centralized data-testid registry
├── Biology/               Domain assets (textbook PDFs, question papers, sample answers)
├── memory/                Product docs (PRD.md)
├── tests/                 Test suite (pytest)
├── design_guidelines.json UI design system source of truth
└── render.yaml            Render.com deployment config
```

## Backend Conventions

### Routers (FastAPI)
- Each resource has its own file in `backend/routers/` (auth.py, assessments.py, questions.py, students.py, evaluations.py, insights.py, interventions.py)
- All routes mounted under `APIRouter(prefix="/api")` in `server.py`
- DB access: `Depends(get_db)` returns Motor database instance
- Auth protection: `Depends(get_current_user)` — JWT decoded from `Authorization: Bearer <token>`
- Background tasks: `BackgroundTasks` imported from FastAPI
- No async/await required for Motor operations — they work with Motor's async cursor out of the box

### Pydantic Models
- One file per entity in `backend/models/` (user.py, assessment.py, question.py, evaluation.py, student.py, intervention.py, curriculum.py)
- Naming pattern: `XBase(BaseModel)` → `X(XBase)` → `XCreate(XBase)`
- MongoDB ID field: `id: Optional[PyObjectId] = Field(alias="_id", default=None)`
- Model config: `model_config = ConfigDict(populate_by_name=True, extra="allow")`
- Fields use camelCase matching MongoDB documents

### Database (MongoDB + Motor)
- No ORM — raw Motor async dict methods: `.find()`, `.find_one()`, `.insert_one()`, `.update_one()`, `.delete_many()`
- Collection names: `users`, `assessments`, `questions`, `students`, `evaluations`, `interventions`, `curricula`
- Upsert pattern: `collection.update_one({"_id": doc["_id"]}, {"$set": doc}, upsert=True)`

### Auth
- JWT: python-jose, HS256, 1-week expiry, read from `OAuth2PasswordBearer(tokenUrl="api/auth/login")`
- Password hashing: bcrypt via `backend/services/auth_service.py`
- Google OAuth: google-auth, stores user as `google-{email}` format
- Default seed user: `teacher@school.gov.in` / `demo1234`

### Config
- `backend/core/config.py` — pydantic-settings BaseSettings with os.getenv() fallbacks
- Env vars: `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `GOOGLE_CLIENT_ID`, `CORS_ORIGINS`, `OPENROUTER_API_KEY`, `QWEN_MODEL`

### Python conventions
- Snake_case file names and variables
- No TypeScript — pure JavaScript on frontend, Python on backend
- Dev deps listed in `requirements.txt` (includes black, isort, flake8, mypy, pytest) but **no config files exist** — lint/formatters are available but not enforced by any config

## Frontend Conventions

### Component Architecture
- Functional components only, `.jsx` extension
- `@/` path alias maps to `src/` (configured via CRACO)
- Pages in `src/pages/`, shared components in `src/components/`, UI primitives in `src/components/ui/`
- shadcn components: New York style, JSX (not TSX), neutral base, lucide icons. Add new ones with `npx shadcn@latest add <component>`
- Bind new components with `npx @shadcn/ui@latest add <name>`

### State Management
- **AppContext** (`contexts/AppContext.jsx`): `lang`, `t()` (translate), `user`, `activeSubject`, `activeClass`, `login()`, `logout()`. Persisted to localStorage with `evalassist-*` key prefix
- **TanStack React Query**: `useQuery` for fetches, `useMutation` for writes. QueryClient: `staleTime: 60000`, `refetchOnWindowFocus: false`
- Import pattern: `import { useApp } from "@/contexts/AppContext"`

### API Client
- `src/data/apiClient.js` — plain `fetch()` with AbortController timeout
- Auth: reads `localStorage.getItem('evalassist-token')`, sends `Authorization: Bearer <token>`
- `fetchWithFallback()`: tries API, falls back to dynamic `await import('./mockData.mjs')`
- Uploads: `FormData`, no Content-Type header (let browser set multipart)
- Login: `application/x-www-form-urlencoded` for OAuth2 password flow

### Routing
- React Router v7, `<BrowserRouter>` in App.js
- Protected routes: wrapped in `<Protected>` (redirects to /login)
- Public routes: wrapped in `<Public>` (redirects to /dashboard if authenticated)
- Layout uses `<Outlet />` for nested pages
- Route params: `useParams()` for IDs, `useNavigate()`, `useLocation()`

### i18n
- Translations in `src/data/translations.js` — flat key-value per language (en, hi, te)
- Usage: `t('keyName')` from AppContext — falls back to English, then raw key
- Persisted to localStorage as `evalassist-lang`
- New user-facing strings must have entries in all 3 languages

### UI Design System
- Source of truth: `design_guidelines.json` (typography, colors, spacing, component strategies)
- Typography: Outfit (headings, font-display), IBM Plex Sans (body)
- Colors: stone-50 backgrounds, blue-800 primary, emerald/amber/rose for semantic states
- Cards: `bg-white border border-stone-200 rounded-xl shadow-sm`
- Buttons: primary = `bg-blue-800 text-white hover:bg-blue-900 rounded-lg`
- Touch targets: minimum 44-48px height
- CSS variables in `index.css`: --background, --foreground, --card, --primary, --secondary, --muted, --accent, --destructive, --border, --input, --ring, --radius

### Test IDs
- Registry in `src/constants/testIds/` — one file per feature, re-exported from `index.js`
- Keys: camelCase (e.g., `submitButton`), values: kebab-case (e.g., `login-submit-button`)
- Pattern: `<feature>-<element>` or `<feature>-<element>-<qualifier>`
- Used in JSX: `data-testid={AUTH.submitButton}`

## How to Add a Feature

1. **Backend model**: Create file in `backend/models/` following `XBase → X → XCreate` pattern with PyObjectId
2. **Backend router**: Create file in `backend/routers/`, define APIRouter, add to `server.py` via `api_router.include_router()`
3. **Seed data**: Add relevant JSON to `backend/seed/data/` and update `seed.py`
4. **Frontend page**: Create page component in `src/pages/` 
5. **Frontend route**: Add route in `App.js` (inside Protected wrapper if auth-required)
6. **API method**: Add endpoint wrapper to `apiClient.js` with corresponding mock fallback
7. **Translations**: Add strings to `translations.js` in all 3 languages (en, hi, te)
8. **Test IDs**: Add new entries to `src/constants/testIds/` if the feature has testable interactions

## Constraints

- Must run offline-first — Ollama + local OCR models are the primary path, cloud is optional fallback
- Backend serves the frontend pre-built static build — single deployment unit
- i18n is mandatory for all user-facing strings (English, Hindi, Telugu)
- UI decisions must defer to `design_guidelines.json`
- shadcn components are installed via CLI, not hand-written
- Push to `prod` branch triggers deploy to Render.com
- No TypeScript anywhere — keep JS and Python

## Key File Reference

| Area | Path |
|------|------|
| Backend entry | `backend/server.py` |
| Config | `backend/core/config.py` |
| DB | `backend/core/database.py` |
| Models | `backend/models/*.py` |
| Routers | `backend/routers/*.py` |
| Auth service | `backend/services/auth_service.py` |
| Seed | `backend/seed/seed.py` |
| Seed data | `backend/seed/data/` |
| OCR pipeline | `backend/tools/ocr/pipeline.py` |
| Frontend entry | `frontend/src/index.js` |
| App component | `frontend/src/App.js` |
| App context | `frontend/src/contexts/AppContext.jsx` |
| API client | `frontend/src/data/apiClient.js` |
| Translations | `frontend/src/data/translations.js` |
| Mock data | `frontend/src/data/mockData.mjs` |
| shadcn config | `frontend/components.json` |
| Tailwind config | `frontend/tailwind.config.js` |
| Design guidelines | `design_guidelines.json` |
| Deploy config | `render.yaml` |
| CI | `.github/workflows/deploy.yml` |
| Test IDs | `frontend/src/constants/testIds/` |

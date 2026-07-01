# EvalAssist - Issue Log
**Date:** 2026-07-01 | **Build:** `prod` branch | **Version:** v3.0

---

## Legend
| Code | Meaning |
|------|---------|
| BUG | Runtime error — crashes or incorrect behavior |
| SEC | Security vulnerability |
| ARCH | Architectural gap / design issue |
| PERF | Performance issue |
| UX | User experience concern |
| DATA | Data integrity / mock data issue |

| Priority | Meaning |
|----------|---------|
| P0 | Blocker — must fix before release |
| P1 | Critical — must fix before ship |
| P2 | Important — should fix in next sprint |
| P3 | Nice-to-have — backlog |

---

## BUG-001: `os` not imported in auth.py — Feedback endpoint crashes
**File:** `backend/routers/auth.py:180`
**Priority:** P0 | **Status:** Open
**Test IDs:** AUTH-FEEDBACK, SEC-XSS

### Description
The `/api/auth/feedback` endpoint crashes with `NameError: name 'os' is not defined` because `os` is never imported in the auth router, yet the endpoint calls `os.path.join()`, `os.makedirs()`, and `os.path.join()`.

### Steps to Reproduce
```bash
curl -X POST http://localhost:8000/api/auth/feedback \
  -H "Content-Type: application/json" \
  -d '{"message": "test", "url": "/dashboard"}'
```
Response: HTTP 500 — `NameError: name 'os' is not defined`

### Impact
- User feedback collection is completely broken
- Affects user trust and bug reporting capability
- Silently fails on frontend (caught in empty catch block)

### Fix
Add `import os` at the top of `backend/routers/auth.py`.

---

## BUG-002: `json` not imported in auth.py — Feedback endpoint crashes
**File:** `backend/routers/auth.py:184`
**Priority:** P0 | **Status:** Open
**Test IDs:** AUTH-FEEDBACK

### Description
Same endpoint also uses `json.dumps()` but `json` is not imported in auth.py.

### Fix
Add `import json` at the top of `backend/routers/auth.py`.

---

## BUG-003: `settings.POSTHOG_API_KEY` and `settings.POSTHOG_HOST` don't exist
**File:** `backend/routers/auth.py:145-146`
**Priority:** P0 | **Status:** Open
**Test IDs:** AUTH-CONFIG

### Description
The `/api/auth/config` endpoint references `settings.POSTHOG_API_KEY` and `settings.POSTHOG_HOST`, but these fields are not defined in `Settings` (`backend/core/config.py`). This will cause an `AttributeError` at runtime when the endpoint is called.

### Impact
- `/api/auth/config` is completely broken
- Frontend may rely on this config for analytics initialization

### Fix
Add `POSTHOG_API_KEY: str = ""` and `POSTHOG_HOST: str = ""` to `backend/core/config.py:Settings`.

---

## BUG-004: Duplicate `/health` endpoint in auth.py
**File:** `backend/routers/auth.py:164-175`
**Priority:** P3 | **Status:** Open
**Test IDs:** AUTH-HEALTH-DUP

### Description
Two identical `/health` endpoint definitions exist at lines 164 and 173. FastAPI registers only the first one; the second is dead code.

### Fix
Remove the duplicate endpoint at line 173.

---

## SEC-001: No authentication on 90% of API endpoints
**File:** All routers except auth.py `/me`
**Priority:** P0 | **Status:** Open
**Test IDs:** SEC-NO-AUTH

### Description
Only `/api/auth/me` requires a JWT token. All other endpoints — including those that modify data (create assessments, override grades, approve evaluations, seed database) — are completely unauthenticated.

### Affected Endpoints (35+)
- POST `/api/assessments/` — Create assessment (no auth)
- POST `/api/assessments/{id}/process` — Trigger OCR pipeline (no auth)
- PUT `/api/assessments/{id}/students/{sid}/evaluations/{qid}/override` — Override marks (no auth)
- POST `/api/assessments/{id}/approve-high` — Bulk approve (no auth)
- GET `/api/assessments/seed` — Wipes entire database (no auth)
- POST `/api/assessments/{id}/analyze-qpaper` — Analyzes question paper (no auth)

### Impact
- Anyone can modify grades and evaluations
- Anyone can seed/wipe the database
- Anyone can trigger expensive OCR processing
- Anyone can access student data

### Fix
Apply `Depends(get_current_user)` to all state-changing endpoints (POST, PUT, PATCH, DELETE), and optionally to all data-reading endpoints.

---

## SEC-002: Seed endpoint wipes all collections without authorization
**File:** `backend/routers/assessments.py:46`
**Priority:** P0 | **Status:** Open
**Test IDs:** ASM-SEED

### Description
`GET /api/assessments/seed` deletes ALL documents from all 7 collections and re-inserts demo data. Any unauthenticated user can destroy all production data.

### Fix
1. Protect with authentication and admin role
2. Change from GET to POST (GET should never be destructive)
3. Add a confirmation parameter

---

## SEC-003: Hardcoded MongoDB credentials in source code
**File:** `backend/core/config.py:11`
**Priority:** P0 | **Status:** Open
**Test IDs:** SEC-CREDS

### Description
The default `MONGO_URL` contains a hardcoded username (`tauser`) and password (`ta098765`) for the MongoDB Atlas cluster.

### Impact
- Anyone with source code access has full MongoDB credentials
- Database accessible from any IP (Atlas default)

### Fix
Remove the hardcoded URL. Require `MONGO_URL` to be set via environment variable at startup.

---

## SEC-004: Hardcoded JWT secret in source code
**File:** `backend/core/config.py:13`
**Priority:** P1 | **Status:** Open
**Test IDs:** SEC-JWT

### Description
`JWT_SECRET` defaults to `"supersecretkey_change_in_prod"` — this is a trivial secret that could be used to forge tokens.

### Fix
Require `JWT_SECRET` from environment variable at startup. Generate via `openssl rand -hex 32`.

---

## ARCH-001: Login endpoint is a mock — does not verify passwords
**File:** `backend/routers/auth.py:34-48`
**Priority:** P0 | **Status:** Open
**Test IDs:** AUTH-LOGIN

### Description
`POST /api/auth/login` accepts any username/password and returns a valid JWT. It never checks the password hash, never looks up the user in the database. It always returns the hardcoded "Teacher" identity.

### Impact
- Anyone can authenticate with any credentials
- No password validation whatsoever
- Cannot support multiple real users

### Fix
Implement proper password verification using `verify_password()` and database lookup.

---

## ARCH-002: Student profile, term trends, and concept trends return hardcoded mock data
**File:** `backend/routers/students.py`
**Priority:** P1 | **Status:** Open
**Test IDs:** ST-PROFILE, ST-TERM, ST-CONCEPT-TRENDS

### Description
`/api/assessments/{id}/students/{sid}/profile`, `term-trends`, and `concept-trends` all return hardcoded mock data, completely ignoring the `studentId` path parameter. Every student gets the same profile data.

### Fix
Implement real computation from the evaluations collection and assessment history.

---

## ARCH-003: Score entry PUT endpoint is destructive — deletes all data before rebuild
**File:** `backend/routers/score_entry.py`
**Priority:** P1 | **Status:** Open
**Test IDs:** SCORE-UPDATE

### Description
`PUT /api/assessments/{id}/score-entry` deletes ALL existing students and evaluations for an assessment before rebuilding. If the rebuild fails mid-way, all data is lost with no recovery possible.

### Fix
Use a transaction pattern: build new data in memory, validate, then atomically replace. Or use upserts instead of delete+insert.

---

## PERF-001: Feedback endpoint uses synchronous file I/O in async handler
**File:** `backend/routers/auth.py:183-184`
**Priority:** P2 | **Status:** Open
**Test IDs:** AUTH-FEEDBACK

### Description
`open(..., "a")` and `json.dumps()` are synchronous blocking calls inside an async FastAPI endpoint handler. This blocks the event loop while writing to disk.

### Fix
Use `aiofiles` for async file I/O, or run in a thread pool with `asyncio.to_thread()`.

---

## PERF-002: Feedback endpoint creates directories on every call
**File:** `backend/routers/auth.py:181`
**Priority:** P3 | **Status:** Open
**Test IDs:** AUTH-FEEDBACK

### Description
`os.makedirs(feedback_dir, exist_ok=True)` is called on every feedback submission, which is unnecessary after the first call.

### Fix
Create the directory once at app startup or module load time.

---

## DATA-001: Module-level variable mutation in Review.jsx
**File:** `frontend/src/pages/Review.jsx`
**Priority:** P2 | **Status:** Open
**Test IDs:** REV-DATA

### Description
`QUESTIONS` is set as a module-level variable and mutated from the `allQuestions` query data. This is an anti-pattern that causes stale data across renders and breaks in React Strict Mode.

### Fix
Use React state or React Query cache for questions instead of module-level mutation.

---

## DATA-002: Empty assessment array with no empty state UI
**File:** `frontend/src/pages/Dashboard.jsx`
**Priority:** P2 | **Status:** Open
**Test IDs:** DASH-EMPTY

### Description
When assessments are empty (e.g., filtered by a class with no assessments), the table body renders nothing with no empty state message.

### Fix
Add an empty state component: "No assessments found for this subject and class."

---

## UX-001: Silent error handling on most API calls
**File:** `frontend/src/data/apiClient.js`
**Priority:** P1 | **Status:** Open
**Test IDs:** CROSS-ERROR

### Description
`fetchWithFallback` returns `null` on any error, with no user-facing indication that the API failed. Users silently see mock data without knowing they're offline or that the server errored.

### Fix
Add a non-blocking toast notification when falling back to mock data, or a subtle indicator in the UI.

---

## UX-002: No loading states with error boundaries
**File:** All frontend pages
**Priority:** P2 | **Status:** Open
**Test IDs:** CROSS-ERROR-BOUNDARY

### Description
No React Error Boundary is implemented. Any unhandled rendering error will show a blank white page.

### Fix
Add an `<ErrorBoundary>` component wrapping the route tree in `App.js`.

---

## UX-003: Google Sign-In button allows repeat clicks
**File:** `frontend/src/pages/Landing.jsx`, `frontend/src/pages/Login.jsx`
**Priority:** P2 | **Status:** Open
**Test IDs:** AUTH-GOOGLE

### Description
The Google Sign-In button does not disable itself after the first click, allowing users to trigger multiple OAuth flows simultaneously.

### Fix
Ensure `googleLoading` disables the button element.

---

## UX-004: Landing page Google OAuth silently fails with no user feedback
**File:** `frontend/src/pages/Landing.jsx`
**Priority:** P2 | **Status:** Open
**Test IDs:** AUTH-GOOGLE-SILENT

### Description
The Google callback `catch` silently sets `googleLoading` to `false` with no error message to the user.

### Fix
Show an error toast or message when Google sign-in fails.

---

## DEP-001: Pydantic V2 deprecation: class-based `Config` used instead of `ConfigDict`
**Files:** `backend/models/user.py:20`, `backend/models/question.py:19`, `backend/models/student.py:10`, `backend/models/evaluation.py:17`
**Priority:** P3 | **Status:** Open
**Test IDs:** WARN-PYDANTIC

### Description
All 4 models use `class Config` (Pydantic V1 style) instead of `model_config = ConfigDict(...)` (Pydantic V2 style). This generates deprecation warnings and will break in Pydantic V3.

### Fix
Replace `class Config: arbitrary_types_allowed = True` with `model_config = ConfigDict(arbitrary_types_allowed=True)`.

---

## DEP-002: `import multipart` deprecated — use `python_multipart`
**File:** `starlette/formparsers.py` (dependency)
**Priority:** P3 | **Status:** Open
**Test IDs:** WARN-MULTIPART

### Description
Starlette still imports `multipart` (which is deprecated). The `python_multipart` package is already in `requirements.txt`.

---

## TEST-001: No JSON schema for API error responses
**Priority:** P2 | **Status:** Open
**Test IDs:** API-ERROR-SCHEMA

### Description
API error responses are inconsistent: some return `{"detail": "message"}`, others return raw tracebacks. No consistent error schema.

### Fix
Use FastAPI exception handlers to normalize all error responses to a consistent `{"error": str, "code": int, "detail": str}` format.

---

## Summary

| Priority | Count | Category |
|----------|-------|----------|
| **P0 (Blocker)** | 7 | BUG-001, BUG-002, BUG-003, SEC-001, SEC-002, SEC-003, ARCH-001 |
| **P1 (Critical)** | 4 | SEC-004, ARCH-002, ARCH-003, UX-001 |
| **P2 (Important)** | 6 | PERF-001, DATA-001, DATA-002, UX-002, UX-003, UX-004, TEST-001 |
| **P3 (Nice-to-have)** | 4 | BUG-004, PERF-002, DEP-001, DEP-002 |
| **Total** | **21** | — |

---

**Generated by:** Head QA / UAT Owner | **Tool:** pytest 9.1.0, manual code review

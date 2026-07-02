# EvalAssist - Issue Log
**Date:** 2026-07-01 | **Build:** `prod` | **Version:** v3.0

## Legend
| Code | Meaning |
|------|---------|
| BUG  | Runtime error / crash |
| SEC  | Security vulnerability |
| ARCH | Architecture gap |
| QUIRK| Minor code quality issue |

---

## Priority 0 - Fix Now (Deployment Blockers)

### BUG-01: `os` & `json` not imported in auth.py
**File:** `backend/routers/auth.py:180,184` | **Status:** Open

`/api/auth/feedback` crashes with `NameError`. `os.path.join` and `json.dumps` used but never imported. Fix: add `import os, json`.

### BUG-02: `settings.POSTHOG_API_KEY` doesn't exist
**File:** `backend/routers/auth.py:145` | **Status:** Open

`/api/auth/config` references `settings.POSTHOG_API_KEY` and `POSTHOG_HOST` which aren't defined in `Settings`. Fix: add `POSTHOG_API_KEY: str = ""` and `POSTHOG_HOST: str = ""` to config.

### SEC-01: No authentication on 90% of API endpoints
**Files:** All routers except `/me` | **Status:** Open

35+ endpoints (create assessments, override grades, approve evaluations, seed database, trigger OCR) have zero auth. Fix: add `Depends(get_current_user)` to all POST/PUT/PATCH/DELETE handlers.

### SEC-02: Seed endpoint wipes all collections with no auth
**File:** `backend/routers/assessments.py:46` | **Status:** Open

`GET /api/assessments/seed` deletes all 7 collections. Fix: change to POST, require auth+admin, add confirmation param.

### SEC-03: Hardcoded MongoDB credentials in source
**File:** `backend/core/config.py:11` | **Status:** Open

`MONGO_URL` default contains username `tauser` and password `ta098765`. Fix: remove default, require env var at startup.

---

## Priority 1 - Fix Before Pilot

### SEC-04: Hardcoded JWT secret
**File:** `backend/core/config.py:13` | **Status:** Open

`JWT_SECRET` defaults to `"supersecretkey_change_in_prod"`. Fix: require from env var.

### ARCH-02: Student profiles/trends return hardcoded mock data
**File:** `backend/routers/students.py` | **Status:** Open

`/profile`, `/term-trends`, `/concept-trends` ignore `studentId` — every student gets same data. Fix: compute from real evaluations.

### ARCH-03: Score entry PUT is destructive
**File:** `backend/routers/score_entry.py` | **Status:** Open

Deletes all students/evaluations before rebuild — data loss if mid-way failure. Fix: use upserts or transaction pattern.

### UX-01: Silent API failures
**File:** `frontend/src/data/apiClient.js` | **Status:** Open

`fetchWithFallback` returns `null` silently. Users see mock data without knowing API failed. Fix: toast notification on fallback.

---

## Priority 2 - Fix Before Release

| ID | Issue | File |
|----|-------|------|
| PERF-01 | Sync file I/O in async feedback handler | `auth.py:183` |
| DATA-01 | Module-level state mutation in Review.jsx | `Review.jsx` |
| DATA-02 | No empty state when assessments array empty | `Dashboard.jsx` |
| UX-02 | No React Error Boundary | `App.js` |
| UX-03 | Google Sign-In allows double-click | `Landing.jsx` |
| UX-04 | Google OAuth silently fails | `Landing.jsx` |
| ARCH-04 | Score entry router referenced but not implemented | `server.py` (no score_entry router exists) |

---

## Priority 3 - Backlog

| ID | Issue | File |
|----|-------|------|
| BUG-04 | Duplicate `/health` endpoint | `auth.py:173` |
| PERF-02 | `os.makedirs` on every feedback call | `auth.py:181` |
| DEP-01 | Pydantic V2 class Config → ConfigDict | 4 model files |
| DEP-02 | `multipart` deprecation warning | starlette dep |
| ARCH-01 | Login is a mock stub — no password check | `auth.py:34` (deferred: Google OAuth is primary auth path) |

---

**Total: 21 issues logged** (6 P0, 4 P1, 7 P2, 4 P3)

# EvalAssist — Full Test Case Specification
**Date:** 2026-07-01 | **Coverage:** All 15 workflows

---

## Module 1: Authentication (AUTH) — 10 Test Cases

### AUTH-01: Google Sign-In (Landing Page) `| P0 | Automated ✓ |`
1. Navigate to `/` → Landing page loads with "Sign in with Google"
2. Google SDK initializes → `googleReady` true, button shows Google SVG
3. Click → "Connecting..." spinner
4. Successful Google login → redirect to `/loading`
5. Loading animation plays (4 steps), → redirect to `/dashboard`
6. Dashboard shows greeting with Google account name
7. Toast: "Welcome, {name}"
8. Refresh (F5) → user stays logged in (localStorage token)

### AUTH-02: Google Sign-In Fallback `| P1 | Manual |`
1. GOOGLE_CLIENT_ID="" → Landing shows amber warning
2. "Sign in with email" navigates to `/login`

### AUTH-03: Email/Password Login `| P1 | Automated ✓ |`
1. Navigate to `/login` → Google button primary, email secondary
2. Click "Sign in with email instead"
3. Enter demo credentials → Click "Sign in"
4. Verify redirect to `/dashboard` with JWT in localStorage

### AUTH-04: Logout `| P1 | Manual |`
1. Desktop: Click logout in sidebar → redirect to `/`, user cleared
2. Mobile: Hamburger → logout → redirect to `/`
3. Try `/dashboard` → redirect to `/login` (Protected guard)

### AUTH-05: Session Persistence `| P1 | Manual |`
1. Login → close tab → reopen `/dashboard` → still logged in

### AUTH-06: POST /api/auth/login `| P0 | Automated ✓ |`
1. POST valid form data → 200 with access_token + user
2. POST empty data → 422
3. POST with SQL injection → 200 or 422 (no crash)

### AUTH-07: GET /api/auth/health `| P2 | Automated ✓ |`
1. Returns 200 with `{"status": "ok", "mode": "demo"}`

### AUTH-08: POST /api/auth/feedback `| P0 | Automated |`
1. **BUG:** Crashes with NameError (os not imported)
2. Fixed: Should return 200 with `{"status": "ok"}`

### AUTH-09: GET /api/auth/me `| P1 | Automated ✓ |`
1. Without token → 401
2. With valid token → 200 + User data

### AUTH-10: POST /api/auth/google `| P1 | Automated ✓ |`
1. Missing credential → 400
2. Invalid credential → 401

---

## Module 2: Assessments (ASM) — 11 Test Cases

### ASM-01: GET /api/assessments/ `| P0 | Automated ✓ |`
1. Empty DB → 200 + []
2. With data → 200 + List[Assessment]

### ASM-02: GET /api/assessments/{id} `| P0 | Automated ✓ |`
1. Valid ID → 200 + Assessment
2. Invalid ID → 404

### ASM-03: POST /api/assessments/ `| P0 | Automated ✓ |`
1. Required fields only → 200 + created Assessment
2. Missing fields → 422
3. Empty name → 422

### ASM-04: PATCH /api/assessments/{id} `| P1 | Automated ✓ |`
1. Valid update → 200
2. No changes → 404

### ASM-05: GET /api/assessments/{id}/status `| P1 | Automated ✓ |`
1. Returns processingStatus + status fields

### ASM-06: POST /api/assessments/{id}/process `| P1 | Automated ✓ |`
1. With sheetImages → triggers background task
2. Without sheetImages → 400

### ASM-07: POST /api/assessments/{id}/append-sheets `| P1 | Automated ✓ |`
1. With new files → appends and triggers OCR
2. Without new files → 400

### ASM-08: GET /api/assessments/seed `| P0 | Automated ✓ |`
1. **SECURITY:** Wipes all data, no auth required

### ASM-09: Large file upload `| P2 | Automated |`
1. 10MB question paper → handled within timeout
2. 50+ answer sheets → handled without crash

### ASM-10: Assessment creation with custom subject `| P2 | Manual |`
1. Select "__custom__" → input field appears

### ASM-11: Assessment without totalMarks `| P3 | Automated ✓ |`
1. Missing → 422 or default applied

---

## Module 3: Questions (Q) — 7 Test Cases

### Q-01: GET /api/assessments/{id}/questions `| P0 | Automated ✓ |`
1. Parsed questions exist → return parsed
2. Questions in DB → return DB questions
3. OCR pending → return placeholder
4. No questions → seed fallback from asm-001

### Q-02: GET with OCR_ANALYSIS_PENDING `| P1 | Automated ✓ |`
1. Questions images exist, processingStatus=pending
2. Returns single question: `{"text": "OCR_ANALYSIS_PENDING"}`

### Q-03: PUT /api/assessments/{id}/questions/{qid} `| P1 | Automated ✓ |`
1. Update difficulty → 200
2. Non-existent qid → 404

### Q-04: GET /api/assessments/{id}/chapters `| P1 | Automated ✓ |`
1. Curriculum exists → 200 + chapters

### Q-05: GET /api/assessments/{id}/concepts `| P1 | Automated ✓ |`
1. Curriculum exists → 200 + concepts

### Q-06: Edit question in analysis page `| P1 | Manual |`
1. Click pencil → inline edit form
2. Change concept/skill/difficulty → save
3. Refresh → resets (not persisted to API)

### Q-07: Add/remove concept chips `| P2 | Manual |`
1. Type concept + Enter → chip added
2. Click X → chip removed
3. Refresh → resets

---

## Module 4: Students (ST) — 4 Test Cases

### ST-01: GET /api/assessments/{id}/students `| P1 | Automated ✓ |`
1. Returns list of students for assessment

### ST-02: GET /api/assessments/{id}/students/{sid}/profile `| P1 | Automated ✓ |`
1. **BUG:** Returns hardcoded mock data, ignores studentId

### ST-03: GET .../students/{sid}/term-trends `| P1 | Automated ✓ |`
1. **BUG:** Returns hardcoded mock data, ignores studentId

### ST-04: GET .../students/{sid}/concept-trends `| P2 | Automated ✓ |`
1. **BUG:** Returns hardcoded mock data, ignores studentId

---

## Module 5: Evaluations (EV) — 5 Test Cases

### EV-01: GET /api/assessments/{id}/students/{sid}/evaluations `| P0 | Automated ✓ |`
1. Returns List[Evaluation] for a student

### EV-02: PUT .../evaluations/{qid}/override `| P0 | Automated ✓ |`
1. Valid override → 200, teacherMark set
2. Non-existent eval → 404

### EV-03: POST .../students/{sid}/approve `| P1 | Automated ✓ |`
1. Approves all evaluations for one student

### EV-04: POST .../approve-high `| P1 | Automated ✓ |`
1. Approves all high-confidence evals across all students

### EV-05: Review drawer keyboard shortcuts `| P2 | Manual |`
1. E → focus mark input
2. A → approve current
3. ArrowRight → next question
4. ArrowLeft → previous
5. Escape → close drawer

---

## Module 6: Insights (INS) — 7 Test Cases

### INS-01: GET .../insights/kpi `| P0 | Automated ✓ |`
1. Returns classAverage, highest, lowest, passRate

### INS-02: GET .../insights/concept-mastery `| P0 | Automated ✓ |`
1. Returns concept-level mastery percentages

### INS-03: GET .../insights/chapter-performance `| P1 | Automated ✓ |`
1. Returns chapter-level mastery aggregates

### INS-04: GET .../insights/score-distribution `| P1 | Automated ✓ |`
1. Returns 6-bin score distribution histogram
2. Bins: 0-10, 11-20, 21-25, 26-30, 31-35, 36-40

### INS-05: GET .../insights/learning-gaps `| P1 | Automated ✓ |`
1. Returns bottom-5 concepts with struggling student counts

### INS-06: GET .../insights/root-cause `| P1 | Automated ✓ |`
1. Returns root cause analysis with prerequisite gaps
2. Sorted by severity (high > medium > low)

### INS-07: KPI Cards UI `| P0 | Manual |`
1. Class Average, Highest Score, Lowest Score, Pass Rate visible
2. Values are non-zero and computed from real evaluations

---

## Module 7: Interventions (INT) — 2 Test Cases

### INT-01: GET .../interventions `| P1 | Automated ✓ |`
1. Returns intervention suggestions grouped by priority
2. Generated from concept mastery <60%
3. Priority: high (<35%), medium (<50%), low (>=50%)

### INT-02: PUT .../interventions/{actId}/plan `| P1 | Automated ✓ |`
1. Toggles planned/unplanned, returns updated status

---

## Module 8: Score Entry (SCORE) — 3 Test Cases

### SCORE-01: POST /api/assessments/score-entry `| P1 | Automated ✓ |`
1. Creates assessment + questions + students + evaluations in one call
2. Returns 200 with created assessment

### SCORE-02: GET /api/assessments/{id}/score-entry `| P1 | Automated ✓ |`
1. Returns complete score entry data
2. Missing assessment → 404

### SCORE-03: DELETE /api/assessments/{id}/score-entry `| P1 | Automated ✓ |`
1. Deletes assessment + all related documents
2. Returns `{"status": "deleted"}`

---

## Module 9: Security & Edge Cases (SEC) — 8 Test Cases

### SEC-01: SQL Injection `| P0 | Automated ✓ |`
1. `' OR '1'='1` in login → no crash, no data leak

### SEC-02: XSS in feedback `| P1 | Automated |`
1. `<script>alert('xss')</script>` → stored but not rendered unsafely
2. **BLOCKED by BUG-001 (os import)**

### SEC-03: Large payloads `| P1 | Automated ✓ |`
1. 10KB assessment name → handled
2. Negative totalMarks → rejected or handled

### SEC-04: No auth on protected resources `| P0 | Automated ✓ |`
1. **VERIFIED:** All endpoints accessible without token

### SEC-05: Race condition on concurrent approval `| P2 | Automated ✓ |`
1. Two concurrent approve-high calls → both succeed without corruption

### SEC-06: Missing assessment ID `| P2 | Automated ✓ |`
1. `/api/assessments//questions` → 404 or 405

### SEC-07: Empty request body `| P2 | Automated |`
1. `POST /api/auth/feedback` with `{}` → handled
2. **BLOCKED by BUG-001**

### SEC-08: Special characters in assessment names `| P3 | Manual |`
1. Unicode, emoji, newlines → handled gracefully

---

## Module 10: Review & Override Workflow (REV) — 9 Test Cases

### REV-01: Heatmap rendering `| P0 | Manual |`
1. 8 student rows, 17 question columns
2. Color-coded cells: green, blue, amber, rose
3. Totals column with grade badge

### REV-02: Filter buttons `| P0 | Manual |`
1. All → shows all students
2. Needs Review → only pending reviews
3. Below Pass → only failing students
4. Top Performers → top scorers

### REV-03: Search by name/roll `| P1 | Manual |`
1. Type "Karan" → only Karan's row
2. Type "08-05" → only Tara's row
3. Type "xyz" → "No students match your filter"

### REV-04: Column highlighting `| P2 | Manual |`
1. Click Q5 header → Q5 column highlights, others dim
2. Click again → all columns normal

### REV-05: Student row expand `| P1 | Manual |`
1. Click expand arrow → expanded paper view
2. Question pills with scores
3. Click pill → review drawer
4. Click arrow again → collapse

### REV-06: Review drawer `| P0 | Manual |`
1. Click cell → drawer slides in from right
2. Student name, question text, answer, AI evaluation, reasoning
3. Override mark → input value changes
4. Reset → marks revert
5. Approve → advance to next in queue
6. Close via X, backdrop, or Escape

### REV-07: Keyboard shortcuts `| P2 | Manual |`
1. E → focus mark input
2. A → approve
3. ArrowRight/Left → next/previous
4. Esc → close

### REV-08: Approve all confident `| P1 | Manual |`
1. Click "Approve all confident" → bulk approval
2. Approved cells show green check

### REV-09: Density toggle `| P2 | Manual |`
1. Compact → 28px cells
2. Detail → 40px cells

---

## Module 11: Student Profile (PROF) — 3 Test Cases

### PROF-01: Overview tab `| P1 | Manual |`
1. Strong/developing/weak concepts sections
2. Misconceptions list
3. Topic mastery bars by chapter

### PROF-02: Term trends tab `| P1 | Manual |`
1. Term average, vs class, growth, best assessment KPIs
2. Line chart: student vs class average
3. Concept trend sparkline bars

### PROF-03: Download CSV `| P2 | Manual |`
1. Click download → CSV file with profile data

---

## Module 12: Cross-Cutting (CROSS) — 4 Test Cases

### CROSS-01: Demo banner `| P2 | Manual |`
1. Amber banner on all protected pages
2. "Demo Prototype · Pre-loaded with sample Class 8 Biology data"

### CROSS-02: Mobile responsive `| P1 | Manual |`
1. 375px → hamburger menu, stacked KPIs, scrollable heatmap
2. Touch targets >= 36px

### CROSS-03: Browser compatibility `| P2 | Manual |`
1. Chrome 120+, Firefox 120+, Safari 17+, Edge 120+

### CROSS-04: Network error handling `| P1 | Manual |`
1. Offline → mock data fallback, console warning logged
2. Reconnect → live API data

---

## Module 13: Workflow Integration (WF) — 2 Test Cases

### WF-01: Upload → Processing → Review → Insights flow `| P0 | Automated ✓ |`
1. Create assessment → process → review → insights
2. All steps complete without error

### WF-02: Score Entry end-to-end `| P1 | Automated ✓ |`
1. Create → Read → Update → Delete
2. All operations succeed

---

## Module 14: OCR Pipeline (OCR) — 5 Test Cases

### OCR-01: Layout detection `| P1 | Manual |`
1. YOLO11n detects text regions, tables, figures in answer sheets

### OCR-02: Handwriting OCR `| P1 | Manual |`
1. TrOCR recognizes English handwriting with confidence scores

### OCR-03: Answer mapping `| P1 | Manual |`
1. Ollama (Llama 3.2) structures OCR output into Q&A pairs

### OCR-04: Concept matching `| P2 | Manual |`
1. MiniLM maps questions to curriculum concepts via cosine similarity

### OCR-05: Qwen fallback `| P2 | Manual |`
1. When OPENROUTER_API_KEY is set, uses Qwen3 VL 235B for OCR

---

## Module 15: Language & i18n (LANG) — 3 Test Cases

### LANG-01: Language toggle `| P2 | Manual |`
1. EN → HI → TE → EN cycle works
2. UI labels change appropriately
3. Language persists on refresh

### LANG-02: All 3 languages render without layout break `| P2 | Manual |`
1. Hindi: Devanagari script renders correctly
2. Telugu: Telugu script renders correctly

### LANG-03: OCR handles multilingual input `| P2 | Manual |`
1. Hindi handwritten answer sheets recognized
2. Telugu handwritten answer sheets recognized

---

## Test Case Summary

| Module | Total | P0 | P1 | P2 | P3 | Automated |
|--------|-------|----|----|----|----|-----------|
| AUTH | 10 | 3 | 5 | 1 | 1 | 8 |
| ASM | 11 | 4 | 4 | 2 | 1 | 10 |
| Q | 7 | 1 | 4 | 2 | 0 | 7 |
| ST | 4 | 0 | 3 | 1 | 0 | 4 |
| EV | 5 | 2 | 2 | 1 | 0 | 4 |
| INS | 7 | 3 | 4 | 0 | 0 | 6 |
| INT | 2 | 0 | 2 | 0 | 0 | 2 |
| SCORE | 3 | 0 | 3 | 0 | 0 | 3 |
| SEC | 8 | 2 | 3 | 3 | 0 | 5 |
| REV | 9 | 3 | 4 | 2 | 0 | 0 |
| PROF | 3 | 0 | 2 | 1 | 0 | 0 |
| CROSS | 4 | 0 | 2 | 2 | 0 | 0 |
| WF | 2 | 1 | 1 | 0 | 0 | 2 |
| OCR | 5 | 0 | 3 | 2 | 0 | 0 |
| LANG | 3 | 0 | 0 | 3 | 0 | 0 |
| **Total** | **83** | **19** | **42** | **20** | **2** | **51** |

**Automated:** 51/83 (61%) | **Manual required:** 32/83 (39%)

# EvalAssist — UAT Test Cases
**15 modules · 83 scenarios · 51 automated · 32 manual**

---

## Module 1: Auth (10 cases)

| ID | Scenario | Priority | Auto |
|----|----------|----------|------|
| AUTH-01 | Google sign-in completes, lands on dashboard | P0 | No |
| AUTH-02 | Google fallback when CLIENT_ID missing | P1 | No |
| AUTH-03 | Email/password login with demo creds | P1 | Yes |
| AUTH-04 | Logout clears session | P1 | No |
| AUTH-05 | Token persists across tab close/reopen | P1 | No |
| AUTH-06 | POST /login returns JWT + user | P0 | Yes |
| AUTH-07 | GET /health returns ok | P2 | Yes |
| AUTH-08 | POST /feedback saves to JSONL | P0 | Yes |
| AUTH-09 | GET /me with/without token | P1 | Yes |
| AUTH-10 | POST /google validates credential | P1 | Yes |

## Module 2: Assessments (11 cases)

| ID | Scenario | Priority | Auto |
|----|----------|----------|------|
| ASM-01 | GET / — list all | P0 | Yes |
| ASM-02 | GET /{id} — single assessment | P0 | Yes |
| ASM-03 | POST / — create with fields | P0 | Yes |
| ASM-04 | PATCH /{id} — update fields | P1 | Yes |
| ASM-05 | GET /{id}/status — processing status | P1 | Yes |
| ASM-06 | POST /{id}/process — trigger OCR | P1 | Yes |
| ASM-07 | POST /{id}/append-sheets | P1 | Yes |
| ASM-08 | GET /seed — wipe+re-seed | P0 | Yes |
| ASM-09 | Large file upload handling | P2 | No |
| ASM-10 | Custom subject creation | P2 | No |
| ASM-11 | Missing totalMarks handling | P3 | Yes |

## Module 3: Questions (7 cases)

| ID | Scenario | Priority | Auto |
|----|----------|----------|------|
| Q-01 | GET /questions with multi-tier fallback | P0 | Yes |
| Q-02 | OCR_ANALYSIS_PENDING placeholder | P1 | Yes |
| Q-03 | PUT /questions/{qid} update | P1 | Yes |
| Q-04 | GET /chapters | P1 | Yes |
| Q-05 | GET /concepts | P1 | Yes |
| Q-06 | Inline edit in analysis page | P1 | No |
| Q-07 | Add/remove concept chips | P2 | No |

## Module 4: Students (4 cases)

| ID | Scenario | Priority | Auto |
|----|----------|----------|------|
| ST-01 | GET /students list | P1 | Yes |
| ST-02 | GET /profile — BUG: returns mock | P1 | Yes |
| ST-03 | GET /term-trends — BUG: returns mock | P1 | Yes |
| ST-04 | GET /concept-trends — BUG: returns mock | P2 | Yes |

## Module 5: Evaluations (5 cases)

| ID | Scenario | Priority | Auto |
|----|----------|----------|------|
| EV-01 | GET /evaluations for student | P0 | Yes |
| EV-02 | PUT /override — teacher mark override | P0 | Yes |
| EV-03 | POST /approve — approve all for student | P1 | Yes |
| EV-04 | POST /approve-high — bulk approve | P1 | Yes |
| EV-05 | Review drawer keyboard shortcuts | P2 | No |

## Module 6: Insights (7 cases)

| ID | Scenario | Priority | Auto |
|----|----------|----------|------|
| INS-01 | GET /kpi — class average, pass rate | P0 | Yes |
| INS-02 | GET /concept-mastery — mastery % | P0 | Yes |
| INS-03 | GET /chapter-performance | P1 | Yes |
| INS-04 | GET /score-distribution — 6 bins | P1 | Yes |
| INS-05 | GET /learning-gaps — bottom 5 concepts | P1 | Yes |
| INS-06 | GET /root-cause — prerequisite gaps | P1 | Yes |
| INS-07 | KPI cards UI render | P0 | No |

## Module 7: Interventions (2 cases)

| ID | Scenario | Priority | Auto |
|----|----------|----------|------|
| INT-01 | GET /interventions — priority-grouped | P1 | Yes |
| INT-02 | PUT /plan — toggle planned/unplanned | P1 | Yes |

## Module 8: Score Entry (3 cases)

| ID | Scenario | Priority | Auto |
|----|----------|----------|------|
| SCORE-01 | POST /score-entry — create full | P1 | Yes |
| SCORE-02 | GET /{id}/score-entry | P1 | Yes |
| SCORE-03 | DELETE /{id}/score-entry | P1 | Yes |

## Module 9: Security (8 cases)

| ID | Scenario | Priority | Auto |
|----|----------|----------|------|
| SEC-01 | SQL injection in login | P0 | Yes |
| SEC-02 | XSS in feedback | P1 | Yes |
| SEC-03 | Oversized/large payloads | P1 | Yes |
| SEC-04 | No auth on protected resources | P0 | Yes |
| SEC-05 | Concurrent approval race condition | P2 | Yes |
| SEC-06 | Missing assessment ID in path | P2 | Yes |
| SEC-07 | Empty request body handling | P2 | Yes |
| SEC-08 | Unicode/special chars in names | P3 | No |

## Module 10-15: UI/Workflow (24 manual cases)

| Module | Cases | Key Scenarios |
|--------|-------|---------------|
| Review (REV) | 9 | Heatmap, filters, search, column highlight, drawer, keyboard shortcuts, density toggle |
| Student Profile (PROF) | 3 | Overview tab, term trends tab, CSV download |
| Cross-Cutting (CROSS) | 4 | Demo banner, mobile responsive, browser compat, offline fallback |
| Workflow (WF) | 2 | Upload→Process→Review flow, Score entry E2E |
| OCR Pipeline (OCR) | 5 | Layout detect, handwriting OCR, answer mapping, concept matching, Qwen fallback |
| i18n (LANG) | 3 | Language toggle EN/HI/TE, script rendering, multilingual OCR |

---

**Total: 83 scenarios | P0: 19 | P1: 42 | P2: 20 | P3: 2**
**Automated: 51 (61%) | Manual: 32 (39%)**

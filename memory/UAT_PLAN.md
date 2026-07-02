# EvalAssist — User Acceptance Test Plan v1.0

**Build:** `prod` branch | **URL:** `https://eval-assist-emerg.onrender.com`  
**Test Data:** `asm-001` (SA1 — Biological Science, Class 8, 8 students, 17 questions)  
**Demo Credentials:** `teacher@school.gov.in` / `demo1234`

---

## 1. Prerequisites

| Item | Check |
|------|-------|
| MongoDB Atlas seeded (seed endpoint called once) | ☐ |
| `GOOGLE_CLIENT_ID` set in Render env vars | ☐ |
| `https://eval-assist-emerg.onrender.com` added to Google Cloud Console authorized origins | ☐ |
| Deploy completed without errors | ☐ |
| Browser: Chrome 120+, Firefox 120+, Safari 17+, or Edge 120+ | ☐ |
| Mobile: iOS Safari 16+, Chrome Android 120+ (375px and 414px widths) | ☐ |

---

## 2. Test Execution Guide

Each test has:

| Field | Meaning |
|-------|---------|
| **ID** | Unique identifier (MODULE-NN) |
| **Priority** | P0=blocker, P1=critical path, P2=important, P3=nice-to-have |
| **Steps** | Sequential actions |
| **Expected** | What should happen |
| **Test ID** | `data-testid` to target (for automation) |

---

## 3. Module: Authentication (AUTH)

### AUTH-01 — Google Sign-In on Landing Page `P0`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Navigate to `/` | Landing page loads, "Sign in with Google" button visible |
| 2 | Click "Sign in with Google" | Google account selector popup appears |
| 3 | Select a Google account | Button shows "Connecting..." |
| 4 | Grant consent | Redirect to `/loading`, 4-step animation plays |
| 5 | Wait ~4 seconds | Auto-redirect to `/dashboard` |
| 6 | Verify greeting | Dashboard shows "Good morning/afternoon, {name}" where name = Google account name |
| 7 | Verify toast | Sonner toast appears: "You're {name} (demo). Click any assessment to explore." |
| 8 | Refresh page (F5) | User stays logged in, returns to dashboard |

**Acceptance Criteria:** Google sign-in completes without error, user lands on dashboard, session persists across refresh.

**Test IDs:** `landing-page` → `loading-page` → `dashboard-page`

---

### AUTH-02 — Google Sign-In Fallback (No Client ID) `P1`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Set `GOOGLE_CLIENT_ID=""` in backend env | Landing page shows amber warning box |
| 2 | Verify amber box text | "Google sign-in not configured on this server" |
| 3 | Click "Sign in with email" button | Navigates to `/login` |

**Acceptance Criteria:** Graceful degradation when Google OAuth is misconfigured.

**Test IDs:** `landing-page`

---

### AUTH-03 — Email/Password Sign-In `P1`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Navigate to `/login` | Login page loads |
| 2 | Verify Google button is primary | "Continue with Google" visible, "Sign in with email instead" below |
| 3 | Click "Sign in with email instead" | Email/password form + demo credentials revealed |
| 4 | Enter `teacher@school.gov.in` / `demo1234` | — |
| 5 | Click "Sign in" | Redirect to `/dashboard` |
| 6 | Verify demo credentials amber box | Shows email + password |

**Acceptance Criteria:** Email login works, demo credentials visible.

**Test IDs:** `login-page`, `login-id-input`, `login-password-input`, `login-submit-button`

---

### AUTH-04 — Logout `P1`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Login as demo user | On dashboard |
| 2 | Desktop: Click logout button in sidebar | Redirect to `/`, user state cleared |
| 3 | Mobile: Open hamburger menu, click logout | Redirect to `/`, user state cleared |
| 4 | Try navigating to `/dashboard` directly | Redirected to `/login` (Protected guard) |

**Acceptance Criteria:** Logout clears session, protected routes inaccessible.

**Test IDs:** `logout-button`, `mobile-logout`

---

### AUTH-05 — Session Persistence `P1`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Login via Google | On dashboard |
| 2 | Close browser tab entirely | — |
| 3 | Open new tab, navigate to `/dashboard` | Land on dashboard (still logged in) |
| 4 | Open `/` (landing) | "Dashboard" button shown instead of "Sign in" |

**Acceptance Criteria:** Token persists in localStorage across sessions.

---

## 4. Module: Navigation (NAV)

### NAV-01 — Desktop Sidebar `P1`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Login, view sidebar | 5 nav links: Dashboard, Assessments, Review, Insights, Interventions |
| 2 | Click "Dashboard" | Active state: blue background, navigates to `/dashboard` |
| 3 | Click "Assessments" | Navigates to `/analysis/asm-001` |
| 4 | Click "Review" | Navigates to `/review/asm-001` |
| 5 | Click "Insights" | Navigates to `/insights/asm-001` |
| 6 | Click "Interventions" | Navigates to `/interventions/asm-001` |
| 7 | Click collapse toggle (ChevronLeft) | Sidebar shrinks to 72px, icons only |
| 8 | Click toggle again | Sidebar expands to 260px, labels visible |

**Acceptance Criteria:** All nav links work, active state correct, collapse toggle works.

**Test IDs:** `sidebar`, `sidebar-collapse-toggle`, `nav-dashboard`, `nav-assessments`, `nav-review`, `nav-insights`, `nav-interventions`

---

### NAV-02 — Mobile Hamburger Drawer `P1`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Resize browser to 375px width | Sidebar hidden, hamburger icon visible top-left |
| 2 | Click hamburger icon | Drawer slides in from left, dark backdrop appears |
| 3 | Verify all 5 nav links visible | Same links as desktop sidebar |
| 4 | Click "Insights" | Navigates to `/insights/asm-001`, drawer closes |
| 5 | Open drawer again, click backdrop | Drawer closes without navigation |
| 6 | Open drawer, click X button | Drawer closes |

**Acceptance Criteria:** Hamburger works, drawer opens/closes correctly, links navigate, backdrop closes.

**Test IDs:** `mobile-logout`

---

### NAV-03 — ContextBar `P2`
| Step | Action | Expected |
|------|--------|----------|
| 1 | On dashboard, verify ContextBar | Subject tabs visible (Biology, Physics if user has both) |
| 2 | Click "Biology" tab | Active state: blue background |
| 3 | Click "Physics" tab | Assessment list filters by Physics |
| 4 | Change class selector to "Class 9" | Assessment list filters by Class 9 |
| 5 | Click "+" to add subject | Input field appears |
| 6 | Type "Chemistry", press Enter | New "Chemistry" tab added |

**Acceptance Criteria:** Subject/class filtering works, add subject flow works.

**Test IDs:** `context-bar`, `subject-tab-Biology`, `context-class-select`

---

### NAV-04 — Language Toggle `P2`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Click "हि" (Hindi) | UI labels change to Hindi |
| 2 | Click "తె" (Telugu) | UI labels change to Telugu |
| 3 | Click "EN" | UI labels return to English |
| 4 | Refresh page | Language persists |

**Acceptance Criteria:** All 3 languages toggle, persistence works.

**Test IDs:** `language-toggle`, `lang-en`, `lang-hi`, `lang-te`

---

## 5. Module: Dashboard (DASH)

### DASH-01 — KPI Cards `P0`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Login, view dashboard | 3 KPI cards visible |
| 2 | Verify "Papers Evaluated" | Shows `8` (or actual count) |
| 3 | Verify "Pending Review" | Shows a number |
| 4 | Verify "Avg Score" | Shows a percentage (e.g., "68.0%") |

**Acceptance Criteria:** KPIs reflect seeded data.

**Test IDs:** `kpi-total-papers`, `kpi-pending-review`, `kpi-avg-score`

---

### DASH-02 — Assessment Table `P0`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Verify assessment rows visible | At least `asm-001` shown |
| 2 | Verify columns: Name, Papers, Avg, Status, Action | — |
| 3 | Verify StatusPill for `asm-001` | Shows "Review" in amber |
| 4 | Click "Review" action button | Navigates to `/review/asm-001` |
| 5 | Go back, click "+ Add Response" | Navigates to `/upload?assessmentId=asm-001` |

**Acceptance Criteria:** All columns render, status pill correct, action buttons navigate.

**Test IDs:** `assessment-row-asm-001`, `btn-review-asm-001`

---

### DASH-03 — Empty State `P2`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Filter by Class 9 (no assessments) | Table shows 0 rows |
| 2 | Verify no error or crash | Page renders normally |

**Acceptance Criteria:** Empty table handles gracefully.

---

## 6. Module: Upload (UPL)

### UPL-01 — Demo Mode Banner `P1`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Navigate to `/upload` | Amber demo banner visible at top |
| 2 | Verify banner text | "Demo Mode" + explanation |

**Acceptance Criteria:** Demo banner present on Upload page.

---

### UPL-02 — Try with Sample Papers `P1`
| Step | Action | Expected |
|------|--------|----------|
| 1 | On `/upload`, click "Try with sample papers" | Navigates to `/review/asm-001` |
| 2 | Verify review page loads | Heatmap with student data visible |

**Acceptance Criteria:** Quick nav to pre-seeded assessment works.

**Test IDs:** `btn-seed-sample`

---

## 7. Module: Analysis (ANAL)

### ANAL-01 — Chapter Mapping `P0`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Navigate to `/analysis/asm-001` | Page loads |
| 2 | Verify chapter bars render | 4 chapters: Cell, Microorganisms, Crop Production, Reproduction |
| 3 | Verify mark distribution | "Reproduction in Animals" has most marks (~65%) |
| 4 | Verify each bar shows: Q count + marks + % | e.g., "8 Q · 26 marks (65%)" |

**Acceptance Criteria:** All 4 chapters render with correct data.

**Test IDs:** `analysis-page`, `chapter-bar-ch1`, `chapter-bar-ch2`, `chapter-bar-ch3`, `chapter-bar-ch4`

---

### ANAL-02 — Concept Coverage `P1`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Scroll to Concept Coverage section | Editable concept chips visible |
| 2 | Verify concept count matches | Concepts count shown |
| 3 | Click X on a concept chip | Chip removed |
| 4 | Type "New Concept" in add input, press Enter | New chip added |
| 5 | Refresh page | Concepts reset to default |

**Acceptance Criteria:** Concepts editable, add/remove works.

**Test IDs:** `concept-chip-*`, `input-add-concept`

---

### ANAL-03 — Question Breakdown `P1`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Scroll to Question Breakdown table | 17 question rows visible |
| 2 | Verify columns: #, Question, Chapter, Concept, Skill, Difficulty, Marks | — |
| 3 | Click pencil edit button on Q1 | Row expands to edit mode |
| 4 | Change concept, skill, difficulty | Fields update |
| 5 | Click check button | Edit saved, row collapses |

**Acceptance Criteria:** All 17 questions render, edit mode works.

**Test IDs:** `analysis-row-q1`, `btn-edit-q1`, `edit-concept-q1`, `edit-skill-q1`, `edit-diff-q1`

---

## 8. Module: Review (REV) — Most Critical

### REV-01 — Heatmap Rendering `P0`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Navigate to `/review/asm-001` | Heatmap loads |
| 2 | Verify column headers | Q1 through Q17 visible |
| 3 | Verify student rows | 8 students: Karan, Rahul, Aryan, Janu, Tara, Dev, Sanya, Priya |
| 4 | Verify cell colors | Green=correct, blue=partial, amber=needs review, rose=wrong |
| 5 | Verify totals column | Each row shows total score + grade badge |

**Acceptance Criteria:** All students, questions, and cell colors render.

**Test IDs:** `review-page`, `heatmap-table`, `col-header-q1`, `row-stu-01`

---

### REV-02 — Filters `P0`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Click "Needs review" filter | Shows only students with pending reviews |
| 2 | Verify filtered count changes | Filter buttons show updated counts |
| 3 | Click "All" | All students shown again |
| 4 | Click "Below pass" filter | Shows students below pass mark |
| 5 | Click "Top performers" | Shows top-scoring students |

**Acceptance Criteria:** All 5 filter buttons work, counts update.

**Test IDs:** `filter-all`, `filter-review`, `filter-borderline`, `filter-failed`, `filter-strong`

---

### REV-03 — Search `P1`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Type "Karan" in search input | Only Karan's row shown |
| 2 | Type "08-05" (roll number) | Only Tara's row shown |
| 3 | Clear search | All rows shown |
| 4 | Type "xyz" (no match) | "No students match your filter" message shown |

**Acceptance Criteria:** Search by name and roll number works, empty state handled.

**Test IDs:** `search-input`

---

### REV-04 — Column Highlighting `P2`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Click "Q5" column header | Q5 header highlighted blue, cells in Q5 column highlighted, other columns dimmed |
| 2 | Click "Q5" again | Filter clears, all columns normal |

**Acceptance Criteria:** Column click toggles highlight, dimming works.

**Test IDs:** `col-header-q5`, `cell-q5`

---

### REV-05 — Student Row Expand `P1`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Click expand arrow on "Karan" row | Expanded paper view appears below |
| 2 | Verify question pills render | Q1-Q17 shown as tappable pills with scores |
| 3 | Click a question pill | Review Drawer opens for that question |
| 4 | Click expand arrow again | Row collapses |

**Acceptance Criteria:** Expand/collapse works, pills render, pills link to drawer.

**Test IDs:** `expand-stu-01`, `expanded-stu-01`, `pill-stu-01-q1`

---

### REV-06 — Review Drawer `P0`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Click a heatmap cell (Karan, Q1) | Review Drawer slides in from right |
| 2 | Verify drawer content | Student name, question text, student answer, AI evaluation, reasoning |
| 3 | Type new mark in override input | Input value changes, amber border |
| 4 | Click "Reset" | Mark reverts to original |
| 5 | Click "Approve" | Drawer shows approved state, advances to next question in queue |
| 6 | Click backdrop or close X | Drawer closes |
| 7 | Press Esc key | Drawer closes |

**Acceptance Criteria:** Drawer opens/closes, mark override works, approve advances queue.

**Test IDs:** `review-drawer`, `drawer-mark-input`, `drawer-reset`, `drawer-approve`, `drawer-prev`, `drawer-next`, `drawer-close`, `drawer-backdrop`

---

### REV-07 — Keyboard Shortcuts `P2`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Open Review Drawer | — |
| 2 | Press `E` | Focus moves to mark input |
| 3 | Press `A` | Approves current evaluation |
| 4 | Press ArrowRight | Navigates to next question in queue |
| 5 | Press ArrowLeft | Navigates to previous question |
| 6 | Press `Esc` | Drawer closes |

**Acceptance Criteria:** All keyboard shortcuts work.

---

### REV-08 — Approve All Confident `P1`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Click "Approve all confident" | Bulk approval confirmation (toast/count) |
| 2 | Verify high-confidence evaluations now show approved badge | Green check on approved cells |

**Acceptance Criteria:** Bulk approve works, approved cells get green check.

**Test IDs:** `btn-approve-all-high`

---

### REV-09 — Density Toggle `P2`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Click "Compact" density | Cell sizes reduce to 28px |
| 2 | Click "Detail" density | Cell sizes increase to 40px |

**Acceptance Criteria:** Density toggle changes heatmap cell sizes.

**Test IDs:** `density-compact`, `density-detail`, `density-toggle`

---

## 9. Module: Insights (INS)

### INS-01 — KPI Cards `P0`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Navigate to `/insights/asm-001` | Page loads |
| 2 | Verify 4 KPI cards | Class Average, Highest Score, Lowest Score, Pass Rate |
| 3 | Verify values are non-zero | Class average ~68%, pass rate ~85% |

**Acceptance Criteria:** KPI cards with real computed values.

**Test IDs:** `insights-page`, `kpi-class-avg`, `kpi-highest`, `kpi-lowest`, `kpi-pass-rate`

---

### INS-02 — Concept Mastery Heatmap `P0`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Scroll to Concept Mastery section | Color-coded mastery blocks |
| 2 | Verify concepts mapped to chapters | Each concept shows chapter name below |
| 3 | Verify color coding | Red=low mastery, Amber=medium, Green/Blue=high |

**Acceptance Criteria:** Concept mastery heatmap renders with real data.

**Test IDs:** `concept-heatmap-section`, `heatmap-*`

---

### INS-03 — Chapter Performance `P1`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Scroll to Chapter Performance | Bar chart per chapter |
| 2 | Verify 4 chapters with mastery % | Cell, Microorganisms, Crop Production, Reproduction |

**Acceptance Criteria:** Real chapter performance computed from evaluations.

**Test IDs:** `chapter-perf-section`, `chapter-perf-ch1`, `chapter-perf-ch2`, `chapter-perf-ch3`, `chapter-perf-ch4`

---

### INS-04 — Score Distribution `P1`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Scroll to Score Distribution | Bar chart visible |
| 2 | Hover over bars | Tooltip shows exact count per range |

**Acceptance Criteria:** Chart renders, interactive tooltips work.

---

### INS-05 — Learning Gaps `P1`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Scroll to Learning Gaps | Topics listed with % struggling |
| 2 | Verify gaps correlate with low-mastery concepts | Weaker concepts appear here |

**Acceptance Criteria:** Learning gaps derived from concept mastery.

**Test IDs:** `learning-gaps-section`, `gap-row-*`

---

### INS-06 — Root Cause Analysis `P1`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Scroll to Root Cause | Cards with severity icons (high/medium/low) |
| 2 | Verify linked concepts | Concepts mentioned in insight text |
| 3 | Verify prerequisite gaps identified | e.g., "weak in IVF also weak in Fertilization" |

**Acceptance Criteria:** Root cause insights with prerequisite analysis.

**Test IDs:** `root-cause-section`, `root-cause-*`

---

### INS-07 — Student List `P1`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Scroll to student list | 8 students sorted by score (highest first) |
| 2 | Click a student row | Navigates to `/student/asm-001/{studentId}` |

**Acceptance Criteria:** Students sorted, clickable to profile.

**Test IDs:** `student-row-stu-05` (Tara, highest), `student-row-stu-04` (Janu, lowest)

---

## 10. Module: Interventions (INT)

### INT-01 — Priority Sections `P1`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Navigate to `/interventions/asm-001` | 3 sections: High, Medium, Low priority |
| 2 | Verify High priority actions | Red dot, actions from Reproduction chapter |
| 3 | Verify Medium priority actions | Amber dot, Agricultural Implements, Asexual Reproduction |
| 4 | Verify Low priority actions | Grey dot, Weed Control |

**Acceptance Criteria:** 7 intervention actions across 3 priority levels.

**Test IDs:** `interventions-page`, `section-high`, `section-medium`, `section-low`, `action-*`

---

### INT-02 — Plan/Unplan Toggle `P1`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Click "Mark as planned" on an action | Button changes to green "Planned" with check icon |
| 2 | Click "Planned" again | Button reverts to "Mark as planned" |
| 3 | Verify planned counter updates | Counter increments/decrements |

**Acceptance Criteria:** Toggle works, counter updates, toast notification appears.

**Test IDs:** `btn-plan-act-1`

---

## 11. Module: Student Profile (PROF)

### PROF-01 — Overview Tab `P1`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Navigate to `/student/asm-001/stu-01` (Karan) | Overview tab shown |
| 2 | Verify strong concepts | Green section with mastered concepts |
| 3 | Verify developing concepts | Amber section with partial concepts |
| 4 | Verify weak concepts | Rose section with struggling concepts |
| 5 | Verify topic mastery bars | Chapter-level progress bars |

**Acceptance Criteria:** Concept mastery sections, misconceptions, topic bars render.

**Test IDs:** `student-profile-page`, `profile-tab-overview`, `section-strong`, `section-developing`, `section-weak`

---

### PROF-02 — Term Trends Tab `P1`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Click "Term View" tab | Term tab loads |
| 2 | Verify KPI cards | Term Average, vs Class, Growth, Best Assessment |
| 3 | Verify line chart renders | Student score line vs class average |
| 4 | Verify concept trends cards | Sparkline bars with trend indicators |

**Acceptance Criteria:** Term view with charts and trends.

**Test IDs:** `profile-tab-term`, `term-view`, `term-chart-section`, `concept-trends-section`

---

## 12. Module: Cross-Cutting (CROSS)

### CROSS-01 — Demo Banner `P2`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Navigate to any protected page | Amber banner visible below ContextBar |
| 2 | Verify text | "Demo Prototype · Pre-loaded with sample Class 8 Biology data · Not for production use" |

**Acceptance Criteria:** Demo banner on all protected pages.

---

### CROSS-02 — Mobile Responsive `P1`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Resize to 375px (iPhone SE) | Hamburger menu visible |
| 2 | Verify Dashboard | KPIs stack vertically (1 col) |
| 3 | Verify Review heatmap scrolls horizontally | Fixed columns at responsive widths |
| 4 | Verify Login page | Single column, no decorative panel |
| 5 | Verify Landing | CTA button full-width on mobile |

**Acceptance Criteria:** No horizontal overflow, hamburger works, touch targets >= 36px.

---

### CROSS-03 — Browser Compatibility `P2`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Test full flow on Chrome 120+ | All tests pass |
| 2 | Test full flow on Firefox 120+ | All tests pass |
| 3 | Test full flow on Safari 17+ | All tests pass |
| 4 | Test full flow on Edge 120+ | All tests pass |

---

### CROSS-04 — Network Error Handling `P2`
| Step | Action | Expected |
|------|--------|----------|
| 1 | Disconnect internet, navigate to `/dashboard` | Mock fallback data loads |
| 2 | Check browser console | Warning logged: "API call to /assessments failed, falling back to mock data..." |
| 3 | Reconnect internet | Live API data returns |

**Acceptance Criteria:** Graceful degradation to mock data when API unavailable.

---

## 13. Severity Summary

| Priority | Count | Tests |
|----------|-------|-------|
| **P0 (Blocker)** | 10 | AUTH-01, DASH-01, DASH-02, ANAL-01, REV-01, REV-02, REV-06, INS-01, INS-02 |
| **P1 (Critical)** | 18 | AUTH-02–05, NAV-01–02, UPL-01–02, ANAL-02–03, REV-03–05, REV-08, INS-03–07, INT-01–02, PROF-01–02, CROSS-02 |
| **P2 (Important)** | 8 | NAV-03–04, DASH-03, REV-04, REV-07, REV-09, CROSS-01, CROSS-03–04 |
| **Total** | **34** | — |

---

## 14. Pass/Fail Criteria

- **Ship after:** All P0 + P1 tests pass (26 tests)
- **Full UAT complete:** All 34 tests pass
- **Any P0 failure:** Block release until fixed
- **P1 failures:** Must be documented with severity assessment

---

## 15. Test Data Reference

| Collection | Count | Key IDs |
|------------|-------|---------|
| Users | 1 | `teacher-1` |
| Assessments | 4 | `asm-001` through `asm-004` |
| Questions | 17 | `q1`–`q17`, linked to `asm-001` |
| Students | 8 | `stu-01` (Karan) through `stu-08` (Priya) |
| Evaluations | 136 | 8 students × 17 questions |
| Interventions | 7 | `act-1` through `act-7` |
| Curriculum | 1 | `ap-class8-bio-v1`, 4 chapters, 35 concepts |

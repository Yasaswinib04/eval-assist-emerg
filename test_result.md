#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and Testing sub agent both should log testing data below this section
#====================================================================================================

## user_problem_statement: "Write test cases for all workflows, create and validate them and maintain a log of issues. Prioritize what to fix for UAT."

## backend:
##   - task: "Auth Router - Login endpoint"
##     implemented: true
##     working: false
##     file: "backend/routers/auth.py:34-48"
##     stuck_count: 1
##     priority: "high"
##     needs_retesting: true
##     status_history:
##         -working: false
##         -agent: "main"
##         -comment: "ARCH-001: Login is a mock — accepts any credentials, no password verification, no DB lookup. Always returns hardcoded Teacher identity. BLOCKER for production use."

##   - task: "Auth Router - Feedback endpoint"
##     implemented: true
##     working: false
##     file: "backend/routers/auth.py:177-185"
##     stuck_count: 1
##     priority: "high"
##     needs_retesting: true
##     status_history:
##         -working: false
##         -agent: "main"
##         -comment: "BUG-001/BUG-002: os and json modules not imported. Endpoint crashes with NameError at runtime. Blocking Io error. Also uses synchronous file I/O in async handler (PERF-001)."

##   - task: "Auth Router - Config endpoint"
##     implemented: true
##     working: false
##     file: "backend/routers/auth.py:141-147"
##     stuck_count: 1
##     priority: "high"
##     needs_retesting: true
##     status_history:
##         -working: false
##         -agent: "main"
##         -comment: "BUG-003: References settings.POSTHOG_API_KEY and settings.POSTHOG_HOST which don't exist in Settings class. Will crash with AttributeError at runtime."

##   - task: "Auth Router - Duplicate health endpoint"
##     implemented: true
##     working: true
##     file: "backend/routers/auth.py:164-175"
##     stuck_count: 0
##     priority: "low"
##     needs_retesting: false
##     status_history:
##         -working: true
##         -agent: "main"
##         -comment: "BUG-004: Two identical /health endpoints defined. FastAPI uses only the first one. Second is dead code. P3 — cleanup only."

##   - task: "Authentication - Missing auth on endpoints"
##     implemented: false
##     working: false
##     file: "backend/routers/assessments.py, questions.py, students.py, evaluations.py, insights.py, interventions.py, score_entry.py"
##     stuck_count: 1
##     priority: "high"
##     needs_retesting: true
##     status_history:
##         -working: false
##         -agent: "main"
##         -comment: "SEC-001: Only /api/auth/me requires JWT. All other 35+ endpoints are unauthenticated. Anyone can modify grades, wipe DB, trigger expensive OCR. P0 BLOCKER."

##   - task: "Security - Seed endpoint unprotected"
##     implemented: true
##     working: false
##     file: "backend/routers/assessments.py:46-47"
##     stuck_count: 1
##     priority: "high"
##     needs_retesting: true
##     status_history:
##         -working: false
##         -agent: "main"
##         -comment: "SEC-002: GET /api/assessments/seed wipes all 7 collections and re-seeds. No auth guard. Should be POST with admin auth + confirmation param."

##   - task: "Security - Hardcoded MongoDB credentials"
##     implemented: true
##     working: false
##     file: "backend/core/config.py:11"
##     stuck_count: 1
##     priority: "high"
##     needs_retesting: true
##     status_history:
##         -working: false
##         -agent: "main"
##         -comment: "SEC-003: MONGO_URL default contains hardcoded username (tauser) and password (ta098765) for MongoDB Atlas cluster. Exposed in public repo."

##   - task: "Security - Hardcoded JWT secret"
##     implemented: true
##     working: false
##     file: "backend/core/config.py:13"
##     stuck_count: 1
##     priority: "medium"
##     needs_retesting: true
##     status_history:
##         -working: false
##         -agent: "main"
##         -comment: "SEC-004: JWT_SECRET defaults to 'supersecretkey_change_in_prod' — trivial to forge tokens. Should require env var."

##   - task: "Students Router - Profile endpoint"
##     implemented: false
##     working: false
##     file: "backend/routers/students.py"
##     stuck_count: 1
##     priority: "medium"
##     needs_retesting: true
##     status_history:
##         -working: false
##         -agent: "main"
##         -comment: "ARCH-002: /profile, /term-trends, /concept-trends all return hardcoded mock data, ignoring studentId parameter. Every student gets same profile."

##   - task: "Score Entry Router - Destructive PUT"
##     implemented: true
##     working: true
##     file: "backend/routers/score_entry.py"
##     stuck_count: 0
##     priority: "medium"
##     needs_retesting: false
##     status_history:
##         -working: true
##         -agent: "main"
##         -comment: "ARCH-003: PUT endpoint deletes all existing students/evaluations before rebuild. If rebuild fails, data is lost. Should use transactions or upserts."

##   - task: "Pydantic V2 Deprecation"
##     implemented: true
##     working: true
##     file: "backend/models/user.py:20, question.py:19, student.py:10, evaluation.py:17"
##     stuck_count: 0
##     priority: "low"
##     needs_retesting: false
##     status_history:
##         -working: true
##         -agent: "main"
##         -comment: "DEP-001: 4 models use class-based Config (V1 style). Should use ConfigDict for Pydantic V2. Will break in V3. Currently only generates warnings."

## frontend:
##   - task: "Review.jsx - Module-level state mutation"
##     implemented: true
##     working: true
##     file: "frontend/src/pages/Review.jsx"
##     stuck_count: 0
##     priority: "medium"
##     needs_retesting: false
##     status_history:
##         -working: true
##         -agent: "main"
##         -comment: "DATA-001: QUESTIONS is set as module-level variable and mutated from query data. Anti-pattern causing stale data across renders."

##   - task: "Dashboard - Missing empty state"
##     implemented: true
##     working: true
##     file: "frontend/src/pages/Dashboard.jsx"
##     stuck_count: 0
##     priority: "medium"
##     needs_retesting: false
##     status_history:
##         -working: true
##         -agent: "main"
##         -comment: "DATA-002: When assessments array is empty, no empty state UI shown. Just renders nothing."

##   - task: "Error handling - Silent API failures"
##     implemented: true
##     working: true
##     file: "frontend/src/data/apiClient.js"
##     stuck_count: 0
##     priority: "medium"
##     needs_retesting: false
##     status_history:
##         -working: true
##         -agent: "main"
##         -comment: "UX-001: fetchWithFallback returns null on errors, no user-facing indication. Users silently see mock data without knowing API failed."

##   - task: "Error boundaries missing"
##     implemented: false
##     working: false
##     file: "frontend/src/App.js"
##     stuck_count: 0
##     priority: "medium"
##     needs_retesting: false
##     status_history:
##         -working: false
##         -agent: "main"
##         -comment: "UX-002: No React Error Boundary implemented. Any unhandled render error shows blank white page."

##   - task: "Google Sign-In - Double click"
##     implemented: true
##     working: true
##     file: "frontend/src/pages/Landing.jsx, Login.jsx"
##     stuck_count: 0
##     priority: "medium"
##     needs_retesting: false
##     status_history:
##         -working: true
##         -agent: "main"
##         -comment: "UX-003: Google Sign-In button not disabled after click. Allows multiple OAuth flows simultaneously."

##   - task: "data-testid coverage incomplete"
##     implemented: false
##     working: false
##     file: "frontend/src/constants/testIds/"
##     stuck_count: 0
##     priority: "medium"
##     needs_retesting: false
##     status_history:
##         -working: false
##         -agent: "main"
##         -comment: "TEST-INFRA: Only auth.js and home.js have test IDs. Dashboard, Review, Insights, Interventions, StudentProfile need testid coverage for automated UI testing."

## metadata:
##   created_by: "main_agent"
##   version: "2.0"
##   test_sequence: 2
##   run_ui: false

## test_plan:
##   current_focus:
##     - "Fix BUG-001/BUG-002: Add os, json imports to auth.py"
##     - "Fix BUG-003: Add POSTHOG vars to Settings"
##     - "Fix SEC-001: Add get_current_user dependency to all mutating endpoints"
##     - "Fix SEC-002: Protect /seed endpoint"
##     - "Fix SEC-003: Remove hardcoded MongoDB credentials"
##     - "Fix ARCH-001: Implement real password verification in login"
##   stuck_tasks:
##     - "ARCH-001: Login is mock — no password verification (basic auth gap)"
##     - "SEC-001: No auth on mutating endpoints (basic security gap)"
##   test_all: false
##   test_priority: "high_first"

## agent_communication:
##     -agent: "main"
##     -message: "UAT test suite created. 62 backend API tests written (41 pass, 21 fail — mostly mock setup). 21 issues logged across 4 priority levels. 7 P0 blockers identified. Full reports at test_reports/ISSUE_LOG.md, test_reports/UAT_REPORT.md, test_reports/TEST_CASES.md, and tests/test_backend_api.py."
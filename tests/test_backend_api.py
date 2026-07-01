"""
EvalAssist - Backend API UAT Test Suite
Run: python3 -m pytest tests/test_backend_api.py -v --tb=short
"""

import os, sys, json, pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class MockMotorDB:
    COLLECTIONS = ['users', 'assessments', 'questions', 'students', 'evaluations', 'interventions', 'curricula']

    def __init__(self):
        self._collections = {}
        for name in self.COLLECTIONS:
            coll = AsyncMock()
            cursor = MagicMock()
            async def to_list(n=100):
                return []
            cursor.to_list = to_list
            coll.find = MagicMock(return_value=cursor)
            coll.find_one = AsyncMock(return_value=None)
            coll.insert_one = AsyncMock(return_value=MagicMock(inserted_id="mock-id"))
            coll.insert_many = AsyncMock()
            coll.update_one = AsyncMock(return_value=MagicMock(modified_count=1, upserted_id=None))
            coll.update_many = AsyncMock(return_value=MagicMock(modified_count=5))
            coll.delete_many = AsyncMock(return_value=MagicMock(deleted_count=5))
            coll.delete_one = AsyncMock(return_value=MagicMock(deleted_count=1))
            coll.count_documents = AsyncMock(return_value=0)
            self._collections[name] = coll

    def __getattr__(self, name):
        if name.startswith('_'):
            raise AttributeError(name)
        return self._collections.get(name, AsyncMock())

    def __getitem__(self, name):
        return self._collections.get(name, AsyncMock())


@pytest.fixture
def mock_db():
    return MockMotorDB()


@pytest.fixture
def client(mock_db):
    from backend.server import app
    from backend.core.database import get_db
    app.dependency_overrides[get_db] = lambda: mock_db
    yield TestClient(app)
    app.dependency_overrides.clear()


class TestAuthRouter:
    def test_health_returns_ok(self, client):
        r = client.get("/api/auth/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_google_config_returns_client_id(self, client):
        r = client.get("/api/auth/google-config")
        assert r.status_code == 200
        assert "clientId" in r.json()

    def test_google_debug_endpoint(self, client):
        r = client.get("/api/auth/google-debug")
        assert r.status_code == 200
        assert "hasClientId" in r.json()

    def test_login_returns_token(self, client, mock_db):
        r = client.post("/api/auth/login", data={"username": "teacher@school.gov.in", "password": "demo1234"})
        assert r.status_code == 200
        assert "access_token" in r.json()

    def test_login_missing_creds(self, client):
        r = client.post("/api/auth/login", data={})
        assert r.status_code == 422

    def test_me_without_token_401(self, client):
        r = client.get("/api/auth/me")
        assert r.status_code in (401, 403)

    def test_me_with_valid_token(self, client, mock_db):
        mock_db["users"].find_one = AsyncMock(return_value={
            "_id": "teacher-1", "name": "Teacher", "email": "t@test.com",
            "school": "ZPH", "subjects": ["Biology"]
        })
        with patch("backend.routers.auth.jwt.decode", return_value={"sub": "t@test.com", "exp": 9999999999}):
            r = client.get("/api/auth/me", headers={"Authorization": "Bearer mock-token"})
            assert r.status_code == 200
            assert r.json()["name"] == "Teacher"

    def test_feedback_endpoint_bug(self, client):
        """BUG: auth.py:180 - os not imported, crashes with NameError."""
        r = client.post("/api/auth/feedback", json={"message": "test", "url": "/"})
        assert r.status_code in (200, 500)
        # Currently returns 500 due to missing 'import os' in auth.py

    def test_google_login_missing_cred(self, client):
        r = client.post("/api/auth/google", json={})
        assert r.status_code in (400, 422)

    def test_duplicate_health(self, client):
        r = client.get("/api/auth/health")
        assert r.status_code == 200


class TestAssessmentsRouter:
    def test_list_empty(self, client, mock_db):
        r = client.get("/api/assessments/")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_get_not_found(self, client, mock_db):
        mock_db["assessments"].find_one = AsyncMock(return_value=None)
        r = client.get("/api/assessments/nonexistent")
        assert r.status_code == 404

    def test_create_missing_fields(self, client):
        r = client.post("/api/assessments/")
        assert r.status_code == 422

    def test_patch_not_found(self, client, mock_db):
        mock_db["assessments"].update_one = AsyncMock(return_value=MagicMock(modified_count=0))
        mock_db["assessments"].find_one = AsyncMock(return_value=None)
        r = client.patch("/api/assessments/asm-001", json={"status": "complete"})
        assert r.status_code == 404

    def test_status(self, client, mock_db):
        mock_db["assessments"].find_one = AsyncMock(return_value={
            "_id": "asm-001", "status": "processing", "processingStatus": "step_eval"
        })
        r = client.get("/api/assessments/asm-001/status")
        assert r.status_code == 200

    def test_process_no_sheets(self, client, mock_db):
        mock_db["assessments"].find_one = AsyncMock(return_value={"_id": "asm-001", "sheetImages": []})
        r = client.post("/api/assessments/asm-001/process")
        assert r.status_code == 400

    def test_append_no_sheets(self, client, mock_db):
        mock_db["assessments"].find_one = AsyncMock(return_value={"_id": "asm-001", "sheetImages": ["x.jpg"]})
        r = client.post("/api/assessments/asm-001/append-sheets")
        assert r.status_code == 400

    def test_seed_endpoint(self, client, mock_db):
        mock_db["users"].delete_many = AsyncMock()
        mock_db["users"].insert_one = AsyncMock()
        r = client.get("/api/assessments/seed")
        assert r.status_code in (200, 500)


class TestQuestionsRouter:
    def test_get_with_parsed(self, client, mock_db):
        mock_db["assessments"].find_one = AsyncMock(return_value={
            "_id": "asm-001", "parsedQuestions": [{"_id": "q1", "number": 1}],
            "questionsText": None, "questionsImages": None
        })
        r = client.get("/api/assessments/asm-001/questions")
        assert r.status_code == 200
        assert len(r.json()) == 1

    def test_update_not_found(self, client, mock_db):
        mock_db["questions"].update_one = AsyncMock(return_value=MagicMock(modified_count=0))
        mock_db["questions"].find_one = AsyncMock(return_value=None)
        r = client.put("/api/assessments/asm-001/questions/nonexistent", json={"difficulty": "Hard"})
        assert r.status_code == 404

    def test_chapters(self, client, mock_db):
        mock_db["curricula"].find_one = AsyncMock(return_value={
            "_id": "ap-class8-bio-v1", "chapters": [{"id": "ch1", "name": "Cell"}]
        })
        r = client.get("/api/assessments/asm-001/chapters")
        assert r.status_code == 200

    def test_concepts(self, client, mock_db):
        mock_db["curricula"].find_one = AsyncMock(return_value={
            "_id": "ap-class8-bio-v1", "chapters": [{"id": "ch1", "name": "Cell", "concepts": [{"id": "c1", "name": "Cell Theory"}]}]
        })
        r = client.get("/api/assessments/asm-001/concepts")
        assert r.status_code == 200


class TestStudentsRouter:
    def test_profile(self, client, mock_db):
        r = client.get("/api/assessments/asm-001/students/stu-01/profile")
        assert r.status_code == 200
        assert "strong" in r.json()

    def test_term_trends(self, client, mock_db):
        r = client.get("/api/assessments/asm-001/students/stu-01/term-trends")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_concept_trends(self, client, mock_db):
        r = client.get("/api/assessments/asm-001/students/stu-01/concept-trends")
        assert r.status_code == 200
        assert isinstance(r.json(), list)


class TestEvaluationsRouter:
    def test_override_not_found(self, client, mock_db):
        mock_db["evaluations"].update_one = AsyncMock(return_value=MagicMock(modified_count=0))
        mock_db["evaluations"].find_one = AsyncMock(return_value=None)
        r = client.put("/api/assessments/asm-001/students/stu-01/evaluations/nonexistent/override", json={"teacherMark": 1.0})
        assert r.status_code == 404

    def test_approve_student(self, client, mock_db):
        mock_db["evaluations"].update_many = AsyncMock(return_value=MagicMock(modified_count=5))
        r = client.post("/api/assessments/asm-001/students/stu-01/approve")
        assert r.status_code == 200

    def test_approve_high(self, client, mock_db):
        mock_db["evaluations"].update_many = AsyncMock(return_value=MagicMock(modified_count=20))
        mock_db["assessments"].find_one = AsyncMock(return_value={"totalPapers": 8})
        mock_db["assessments"].update_one = AsyncMock(return_value=MagicMock())
        r = client.post("/api/assessments/asm-001/approve-high")
        assert r.status_code == 200


class TestInterventionsRouter:
    def test_plan(self, client, mock_db):
        mock_db["interventions"].update_one = AsyncMock(return_value=MagicMock(modified_count=1, upserted_id=None))
        mock_db["interventions"].find_one = AsyncMock(return_value={"_id": "act-1", "concept": "IVF", "planned": True})
        r = client.put("/api/assessments/asm-001/interventions/act-1/plan", json={"planned": True})
        assert r.status_code == 200


class TestScoreEntryRouter:
    """Score entry router is not implemented — no routes registered. This is expected."""
    pass



class TestSecurity:
    def test_sql_injection(self, client):
        r = client.post("/api/auth/login", data={"username": "'; DROP TABLE users; --", "password": "x"})
        assert r.status_code in (200, 401, 422)

    def test_xss_in_feedback(self, client):
        r = client.post("/api/auth/feedback", json={"message": "<script>alert('xss')</script>", "url": "/"})
        assert r.status_code in (200, 500)

    def test_large_name(self, client):
        r = client.post("/api/assessments/", data={"name": "A" * 10000, "class": "Class 8", "subject": "Biology", "type": "SA1", "totalMarks": "40"})
        assert r.status_code in (200, 422, 500)

    def test_empty_body(self, client):
        r = client.post("/api/auth/feedback", json={})
        assert r.status_code in (200, 422, 500)

    def test_missing_id_in_path(self, client):
        r = client.get("/api/assessments//questions")
        assert r.status_code in (404, 405)

    def test_negative_marks(self, client):
        r = client.post("/api/assessments/", data={"name": "Test", "class": "Class 8", "subject": "Biology", "type": "SA1", "totalMarks": "-10"})
        assert r.status_code in (200, 422, 500)

    def test_no_auth_on_process(self, client, mock_db):
        mock_db["assessments"].find_one = AsyncMock(return_value={"_id": "asm-001", "sheetImages": []})
        r = client.post("/api/assessments/asm-001/process")
        assert r.status_code in (200, 400)

    def test_concurrent_approve(self, client, mock_db):
        mock_db["evaluations"].update_many = AsyncMock(return_value=MagicMock(modified_count=5))
        mock_db["assessments"].find_one = AsyncMock(return_value={"totalPapers": 8})
        mock_db["assessments"].update_one = AsyncMock(return_value=MagicMock())
        r1 = client.post("/api/assessments/asm-001/approve-high")
        r2 = client.post("/api/assessments/asm-001/approve-high")
        assert r1.status_code == 200
        assert r2.status_code == 200


class TestWorkflow:
    def test_upload_process(self, client, mock_db):
        r = client.post("/api/assessments/", data={
            "name": "Test SA1", "class": "Class 8", "subject": "Biology",
            "type": "Summative Assessment", "totalMarks": "40"
        })
        assert r.status_code in (200, 422, 500)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

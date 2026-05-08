import os
import uuid

from fastapi.testclient import TestClient

os.environ.setdefault("PLACIFY_SECRET_KEY", "test-secret-key")
os.environ.setdefault("SKIP_MODEL_LOAD", "true")

from main import app


def _register_and_get_client() -> TestClient:
    client = TestClient(app)
    email = f"analysis.user.{uuid.uuid4().hex[:8]}@example.com"
    res = client.post(
        "/api/auth/register",
        json={"name": "Analysis User", "email": email, "password": "securepass123"},
    )
    assert res.status_code == 200
    return client


def test_analysis_rejects_non_pdf_upload():
    client = _register_and_get_client()
    files = {"resume": ("resume.txt", b"not a pdf", "text/plain")}
    data = {
        "aptitude_score": "75",
        "communication_score": "4",
        "coding_problems_solved": "200",
    }
    res = client.post("/api/analysis", files=files, data=data)
    assert res.status_code == 400
    assert "Only PDF files are accepted" in res.json()["detail"]

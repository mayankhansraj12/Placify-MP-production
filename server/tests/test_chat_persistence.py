import os
import uuid
import json

from fastapi.testclient import TestClient

os.environ.setdefault("PLACIFY_SECRET_KEY", "test-secret-key")
os.environ.setdefault("SKIP_MODEL_LOAD", "true")

from main import app
from unittest.mock import patch

def _register_and_get_client() -> TestClient:
    client = TestClient(app)
    email = f"chat.user.{uuid.uuid4().hex[:8]}@example.com"
    res = client.post(
        "/api/auth/register",
        json={"name": "Chat User", "email": email, "password": "securepass123"},
    )
    assert res.status_code == 200
    return client

def test_chat_persistence_flow():
    client = _register_and_get_client()
    
    with patch("services.llm_service.is_available", return_value=False):
        # 1. Start session
        start_res = client.post(
            "/api/interview/start",
            json={"role": "Software Developer", "difficulty": "medium", "focus_skills": []}
        )
        assert start_res.status_code == 200
        start_data = start_res.json()
        session_id = start_data["session_id"]
        assert "current_question" in start_data
        
        # 2. Answer question
        answer_res = client.post(
            "/api/interview/answer",
            json={"session_id": session_id, "answer": "This is a test answer using STAR method."}
        )
        assert answer_res.status_code == 200
        answer_data = answer_res.json()
        assert "evaluation" in answer_data
        
        # 3. Next question
        next_res = client.post(
            "/api/interview/next",
            json={"session_id": session_id}
        )
        assert next_res.status_code == 200
        
        # 4. Get summary
        summary_res = client.get(f"/api/interview/summary/{session_id}")
        assert summary_res.status_code == 200
        summary_data = summary_res.json()
        assert summary_data["answered"] == 1
        assert len(summary_data["evaluations"]) == 1
        assert summary_data["role"] == "Software Developer"

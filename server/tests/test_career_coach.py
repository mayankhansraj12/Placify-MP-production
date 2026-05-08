import os
import uuid

from fastapi.testclient import TestClient

os.environ.setdefault("PLACIFY_SECRET_KEY", "test-secret-key")
os.environ.setdefault("SKIP_MODEL_LOAD", "true")

from main import app
from unittest.mock import patch, AsyncMock

def _register_and_get_client() -> TestClient:
    client = TestClient(app)
    email = f"coach.user.{uuid.uuid4().hex[:8]}@example.com"
    res = client.post(
        "/api/auth/register",
        json={"name": "Coach User", "email": email, "password": "securepass123"},
    )
    assert res.status_code == 200
    return client

def test_career_coach_flow():
    client = _register_and_get_client()
    
    with patch("services.llm_service.is_available", return_value=True), \
         patch("services.llm_service.generate", new_callable=AsyncMock) as mock_generate, \
         patch("services.llm_service.generate_json", new_callable=AsyncMock) as mock_generate_json:
        mock_generate.return_value = "Mock coach reply"
        mock_generate_json.return_value = {"action": "reply", "action_input": "Mock coach reply"}
        
        # 1. Send message to coach
        payload = {
            "message": "Hi, I want to become a machine learning engineer."
        }
        chat_res = client.post(
            "/api/coach/chat",
            json=payload
        )
        assert chat_res.status_code == 200
        chat_data = chat_res.json()
        assert "reply" in chat_data
        
        # 2. Get history
        history_res = client.get("/api/coach/history")
        assert history_res.status_code == 200
        history_data = history_res.json()
        assert "messages" in history_data
        assert len(history_data["messages"]) >= 2  # user msg + coach reply

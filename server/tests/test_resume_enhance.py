import os
import uuid

from fastapi.testclient import TestClient

os.environ.setdefault("PLACIFY_SECRET_KEY", "test-secret-key")
os.environ.setdefault("SKIP_MODEL_LOAD", "true")

from main import app
from unittest.mock import patch, AsyncMock

def _register_and_get_client() -> TestClient:
    client = TestClient(app)
    email = f"enhance.user.{uuid.uuid4().hex[:8]}@example.com"
    res = client.post(
        "/api/auth/register",
        json={"name": "Enhance User", "email": email, "password": "securepass123"},
    )
    assert res.status_code == 200
    return client

def test_resume_enhance_flow():
    client = _register_and_get_client()
    
    with patch("services.llm_service.is_available", return_value=True), \
         patch("services.llm_service.generate_json", new_callable=AsyncMock) as mock_generate_json:
        mock_generate_json.return_value = {"suggestions": ["Improved mock bullet point"]}
        
        # 1. Provide bullet point for enhancement
        payload = {
            "resume_text": "Fixed bugs in the python code and made it faster. Optimized database queries resulting in a 40% reduction in load times. Built robust APIs using FastAPI and deployed to AWS.",
            "target_role": "Software Engineer"
        }
        enhance_res = client.post(
            "/api/resume/enhance",
            data=payload
        )
        assert enhance_res.status_code == 200
        enhance_data = enhance_res.json()
        assert "suggestions" in enhance_data
        assert isinstance(enhance_data["suggestions"], list)

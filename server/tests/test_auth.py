import os
import uuid

from fastapi.testclient import TestClient

os.environ.setdefault("PLACIFY_SECRET_KEY", "test-secret-key")
os.environ.setdefault("SKIP_MODEL_LOAD", "true")

from main import app


def test_register_login_me_and_logout_flow():
    client = TestClient(app)

    email = f"test.user.{uuid.uuid4().hex[:8]}@example.com"
    password = "securepass123"
    name = "Test User"

    register = client.post(
        "/api/auth/register",
        json={"name": name, "email": email, "password": password},
    )
    assert register.status_code == 200
    body = register.json()
    assert body["user"]["email"] == email
    assert "placify_token" in register.cookies

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == email

    logout = client.post("/api/auth/logout")
    assert logout.status_code == 200

    me_after_logout = client.get("/api/auth/me")
    assert me_after_logout.status_code == 401


def test_refresh_clears_invalid_cookie():
    client = TestClient(app)
    client.cookies.set("placify_token", "invalid-token", domain="testserver.local", path="/")

    res = client.post("/api/auth/refresh")

    assert res.status_code == 401
    assert "placify_token" not in client.cookies

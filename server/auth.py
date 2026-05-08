"""
Placify AI - Authentication Module
JWT-based authentication with register, login, and user retrieval.
"""

import os
import re
import uuid
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlencode

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel, Field, field_validator
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
from starlette.responses import RedirectResponse

try:
    from .database import get_db
except ImportError:
    from database import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])
logger = logging.getLogger("placify.auth")

SECRET_KEY = os.getenv("PLACIFY_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("PLACIFY_SECRET_KEY environment variable is required.")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24
EMAIL_PATTERN = re.compile(r"^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$", re.IGNORECASE)
COOKIE_NAME = "placify_token"
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").strip().lower() in {"1", "true", "yes", "on"}
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax").lower()
if COOKIE_SAMESITE not in {"lax", "strict", "none"}:
    COOKIE_SAMESITE = "lax"
ALLOW_COOKIE_AUTH = os.getenv("ALLOW_COOKIE_AUTH", "false").strip().lower() in {"1", "true", "yes", "on"}

# ── Google OAuth Setup ────────────────────────────────────────────────────────
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
config_data = {
    "GOOGLE_CLIENT_ID": os.getenv("GOOGLE_CLIENT_ID", ""),
    "GOOGLE_CLIENT_SECRET": os.getenv("GOOGLE_CLIENT_SECRET", ""),
    "GITHUB_CLIENT_ID": os.getenv("GITHUB_CLIENT_ID", ""),
    "GITHUB_CLIENT_SECRET": os.getenv("GITHUB_CLIENT_SECRET", ""),
}
starlette_config = Config(environ=config_data)
oauth = OAuth(starlette_config)
oauth.register(
    name='google',
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile'
    }
)
oauth.register(
    name="github",
    access_token_url="https://github.com/login/oauth/access_token",
    authorize_url="https://github.com/login/oauth/authorize",
    api_base_url="https://api.github.com/",
    client_kwargs={"scope": "read:user user:email"},
)


def oauth_error_redirect(message: str) -> RedirectResponse:
    return RedirectResponse(url=f"{FRONTEND_URL}/login?{urlencode({'authError': message})}")


def oauth_callback_url(request: Request, provider: str, route_name: str) -> str:
    configured = os.getenv(f"{provider.upper()}_REDIRECT_URI", "").strip()
    return configured or str(request.url_for(route_name))


def normalize_email(value: str) -> str:
    """Normalize and validate an email address."""
    email = value.strip().lower()
    if not EMAIL_PATTERN.fullmatch(email):
        raise ValueError("Enter a valid email address")
    return email


def hash_password(password: str) -> str:
    """Hash a password using bcrypt directly for Python 3.14 compatibility."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        name = value.strip()
        if len(name) < 2:
            raise ValueError("Name must be at least 2 characters")
        return name

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return normalize_email(value)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 12:
            raise ValueError("Password must be at least 12 characters")
        return value


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return normalize_email(value)


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    current_auth_method: str = "password"
    auth_methods: list[str] = Field(default_factory=lambda: ["password"])


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


def create_token(user_id: str, auth_method: str = "password") -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {"sub": user_id, "exp": expire, "auth_method": auth_method}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


VALID_AUTH_METHODS = {"password", "google", "github"}


def infer_auth_methods(password_hash: str | None) -> list[str]:
    methods: list[str] = []
    if password_hash and not password_hash.startswith("!oauth-"):
        methods.append("password")
    if password_hash and password_hash.startswith("!oauth-google-"):
        methods.append("google")
    if password_hash and password_hash.startswith("!oauth-github-"):
        methods.append("github")
    return methods


def link_auth_method(conn, user_id: str, method: str) -> None:
    if method not in VALID_AUTH_METHODS:
        return
    conn.execute(
        "INSERT OR IGNORE INTO user_auth_methods (user_id, method) VALUES (?, ?)",
        (user_id, method),
    )


def get_auth_methods(conn, user_id: str, password_hash: str | None, current_method: str = "password") -> list[str]:
    rows = conn.execute(
        "SELECT method FROM user_auth_methods WHERE user_id = ? ORDER BY created_at, method",
        (user_id,),
    ).fetchall()
    methods = [row["method"] for row in rows if row["method"] in VALID_AUTH_METHODS]

    for method in infer_auth_methods(password_hash):
        if method not in methods:
            methods.append(method)
            link_auth_method(conn, user_id, method)

    if current_method in VALID_AUTH_METHODS and current_method not in methods:
        methods.append(current_method)

    return methods or [current_method]


def set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=ACCESS_TOKEN_EXPIRE_HOURS * 3600,
        path="/",
    )


def clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(key=COOKIE_NAME, path="/")


def _extract_bearer_token(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials],
) -> str:
    if credentials and credentials.credentials:
        return credentials.credentials
    if ALLOW_COOKIE_AUTH:
        cookie_token = request.cookies.get(COOKIE_NAME)
        if cookie_token:
            return cookie_token
    raise HTTPException(status_code=401, detail="Missing authentication token")


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False)),
):
    """Extract and verify the current user from JWT."""
    token = _extract_bearer_token(request, credentials)
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc

    current_method = payload.get("auth_method") or "password"

    conn = get_db()
    user = conn.execute("SELECT id, name, email, password_hash FROM users WHERE id = ?", (user_id,)).fetchone()

    if user is None:
        conn.close()
        raise HTTPException(status_code=401, detail="User not found")

    result = dict(user)
    password_hash = result.pop("password_hash", None)
    result["current_auth_method"] = current_method
    result["auth_methods"] = get_auth_methods(conn, result["id"], password_hash, current_method)
    conn.close()
    return result


@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest, response: Response):
    conn = get_db()
    existing = conn.execute("SELECT id FROM users WHERE email = ?", (req.email,)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user_id = str(uuid.uuid4())
    password_hash = hash_password(req.password)

    conn.execute(
        "INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)",
        (user_id, req.name, req.email, password_hash),
    )
    link_auth_method(conn, user_id, "password")
    conn.commit()
    conn.close()

    token = create_token(user_id, "password")
    set_auth_cookie(response, token)
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user_id, name=req.name, email=req.email, current_auth_method="password", auth_methods=["password"]),
    )


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, response: Response):
    conn = get_db()
    user = conn.execute(
        "SELECT id, name, email, password_hash FROM users WHERE email = ?",
        (req.email,),
    ).fetchone()
    conn.close()

    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    conn = get_db()
    link_auth_method(conn, user["id"], "password")
    conn.commit()
    conn.close()

    token = create_token(user["id"], "password")
    set_auth_cookie(response, token)
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user["id"], name=user["name"], email=user["email"], current_auth_method="password", auth_methods=["password"]),
    )

@router.get("/google/login")
async def google_login(request: Request):
    """Redirect to Google OAuth consent screen."""
    if not os.getenv("GOOGLE_CLIENT_ID") or not os.getenv("GOOGLE_CLIENT_SECRET"):
        return oauth_error_redirect("Google sign-in is not configured.")
    redirect_uri = oauth_callback_url(request, "google", "google_auth_callback")
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/google/callback")
async def google_auth_callback(request: Request, response: Response):
    """Handle Google OAuth callback, create user if missing, and issue JWT."""
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get('userinfo')
        if not user_info:
            raise HTTPException(status_code=400, detail="Failed to fetch user info from Google")
        
        email = user_info.get("email")
        name = user_info.get("name")
        
        conn = get_db()
        user = conn.execute("SELECT id, name, email FROM users WHERE email = ?", (email,)).fetchone()
        
        if not user:
            # Create new user for OAuth (give impossible password hash to prevent normal login)
            user_id = str(uuid.uuid4())
            impossible_hash = f"!oauth-google-{uuid.uuid4()}"
            conn.execute(
                "INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)",
                (user_id, name, email, impossible_hash),
            )
            conn.commit()
            user = {"id": user_id, "name": name, "email": email}
        link_auth_method(conn, user["id"], "google")
        conn.commit()
        conn.close()

        # Issue our standard JWT
        jwt_token = create_token(user["id"], "google")
        
        # Redirect back to frontend dashboard with token cookie set
        frontend_redirect = RedirectResponse(url=f"{FRONTEND_URL}/dashboard")
        set_auth_cookie(frontend_redirect, jwt_token)
        return frontend_redirect
        
    except Exception:
        logger.exception("google_oauth_failed")
        # Redirect to login page with error
        return oauth_error_redirect("Google sign-in failed. Please try again.")


@router.get("/github/login")
async def github_login(request: Request):
    """Redirect to GitHub OAuth consent screen."""
    if not os.getenv("GITHUB_CLIENT_ID") or not os.getenv("GITHUB_CLIENT_SECRET"):
        return oauth_error_redirect("GitHub sign-in is not configured.")
    redirect_uri = oauth_callback_url(request, "github", "github_auth_callback")
    logger.info("github_oauth_redirect redirect_uri=%s", redirect_uri)
    return await oauth.github.authorize_redirect(request, redirect_uri)


@router.get("/github/callback")
async def github_auth_callback(request: Request):
    """Handle GitHub OAuth callback, create user if missing, and issue JWT."""
    try:
        token = await oauth.github.authorize_access_token(request)
        profile_response = await oauth.github.get("user", token=token)
        profile = profile_response.json()

        email = profile.get("email")
        if not email:
            emails_response = await oauth.github.get("user/emails", token=token)
            emails = emails_response.json()
            if not isinstance(emails, list):
                emails = []
            primary_email = next(
                (
                    item.get("email")
                    for item in emails
                    if item.get("primary") and item.get("verified") and item.get("email")
                ),
                None,
            )
            email = primary_email or next(
                (
                    item.get("email")
                    for item in emails
                    if item.get("verified") and item.get("email")
                ),
                None,
            )

        if not email:
            return oauth_error_redirect("GitHub account has no verified email address.")

        name = profile.get("name") or profile.get("login") or email.split("@")[0]

        conn = get_db()
        user = conn.execute("SELECT id, name, email FROM users WHERE email = ?", (email,)).fetchone()

        if not user:
            user_id = str(uuid.uuid4())
            impossible_hash = f"!oauth-github-{uuid.uuid4()}"
            conn.execute(
                "INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)",
                (user_id, name, email, impossible_hash),
            )
            conn.commit()
            user = {"id": user_id, "name": name, "email": email}

        link_auth_method(conn, user["id"], "github")
        conn.commit()
        conn.close()

        jwt_token = create_token(user["id"], "github")
        frontend_redirect = RedirectResponse(url=f"{FRONTEND_URL}/dashboard")
        set_auth_cookie(frontend_redirect, jwt_token)
        return frontend_redirect

    except Exception:
        logger.exception("github_oauth_failed")
        return oauth_error_redirect("GitHub sign-in failed. Please try again.")


@router.get("/oauth/github/callback")
async def github_auth_callback_legacy(request: Request):
    """Support the older GitHub callback path used by existing OAuth app settings."""
    return await github_auth_callback(request)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)


@router.post("/logout")
def logout(response: Response):
    clear_auth_cookie(response)
    return {"message": "Logged out"}


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(request: Request, response: Response):
    """Refresh an expired/valid JWT using the httpOnly cookie.
    The frontend calls this on every page load to silently renew the session."""
    cookie_token = request.cookies.get(COOKIE_NAME)
    if not cookie_token:
        raise HTTPException(status_code=401, detail="No refresh token")

    try:
        payload = jwt.decode(cookie_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        current_method = payload.get("auth_method") or "password"
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc

    conn = get_db()
    user = conn.execute("SELECT id, name, email, password_hash FROM users WHERE id = ?", (user_id,)).fetchone()

    if user is None:
        conn.close()
        raise HTTPException(status_code=401, detail="User not found")

    auth_methods = get_auth_methods(conn, user["id"], user["password_hash"], current_method)
    conn.close()

    new_token = create_token(user["id"], current_method)
    set_auth_cookie(response, new_token)
    return TokenResponse(
        access_token=new_token,
        user=UserResponse(
            id=user["id"],
            name=user["name"],
            email=user["email"],
            current_auth_method=current_method,
            auth_methods=auth_methods,
        ),
    )

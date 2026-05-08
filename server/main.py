"""
Placify AI - Main Server Entry Point
FastAPI application with CORS, route mounting, startup initialization, and telemetry.
"""

import logging
import os
import secrets
import sys
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager

# Add server directory to path for script-style imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from dotenv import load_dotenv
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
    load_dotenv(dotenv_path=env_path)
except ImportError:
    pass

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.sessions import SessionMiddleware

try:
    from .auth import router as auth_router
    from .database import init_db
    from .ml.predictor import get_model_metadata, load_models
    from .routes.analysis import router as analysis_router
    from .routes.resume_enhance import router as resume_enhance_router
    from .routes.chat import router as interview_router
    from .routes.career_coach import router as coach_router
except ImportError:
    from auth import router as auth_router
    from database import init_db
    from ml.predictor import get_model_metadata, load_models
    from routes.analysis import router as analysis_router
    from routes.resume_enhance import router as resume_enhance_router
    from routes.chat import router as interview_router
    from routes.career_coach import router as coach_router


logger = logging.getLogger("placify.server")

REQUEST_METRICS = {
    "total_requests": 0,
    "error_requests": 0,
    "routes": defaultdict(lambda: {"count": 0, "errors": 0, "total_ms": 0.0}),
}
RATE_BUCKETS = defaultdict(deque)


def configure_console_output() -> None:
    """Avoid Windows console crashes when log messages contain Unicode."""
    for stream_name in ("stdout", "stderr"):
        stream = getattr(sys, stream_name, None)
        if stream is not None and hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")


def configure_logging() -> None:
    """Set a consistent structured logging format."""
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO").upper(),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )


def env_flag(name: str, default: bool = False) -> bool:
    """Parse a boolean environment variable."""
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        logger.warning("Invalid integer for %s=%s. Using default=%s", name, value, default)
        return default


def parse_cors_origins() -> list[str]:
    configured = os.getenv("CORS_ALLOW_ORIGINS")
    if not configured:
        return ["http://localhost:5173", "http://127.0.0.1:5173"]
    return [origin.strip() for origin in configured.split(",") if origin.strip()]


def parse_cors_origin_regex() -> str | None:
    if env_flag("ENABLE_LOCAL_CORS_REGEX", default=False):
        return r"https?://(localhost|127\.0\.0\.1)(:\d+)?"
    return None


def _rate_limited(request: Request, now: float) -> bool:
    path = request.url.path
    if request.method == "POST" and path in {"/api/auth/login", "/api/auth/register"}:
        bucket = "auth"
        limit = env_int("AUTH_RATE_LIMIT_PER_MIN", 30)
    elif request.method == "POST" and path == "/api/analysis":
        bucket = "analysis"
        limit = env_int("ANALYSIS_RATE_LIMIT_PER_MIN", 20)
    elif request.method == "POST" and path == "/api/resume/enhance":
        bucket = "resume_enhance"
        limit = env_int("RESUME_ENHANCE_RATE_LIMIT_PER_MIN", 10)
    elif request.method == "POST" and path.startswith("/api/coach"):
        bucket = "coach"
        limit = env_int("COACH_RATE_LIMIT_PER_MIN", 20)
    elif request.method == "POST" and path.startswith("/api/interview"):
        bucket = "interview"
        limit = env_int("INTERVIEW_RATE_LIMIT_PER_MIN", 20)
    else:
        return False

    client_ip = request.client.host if request.client else "unknown"
    key = f"{bucket}:{client_ip}"
    timestamps = RATE_BUCKETS[key]

    while timestamps and now - timestamps[0] > 60:
        timestamps.popleft()
    if len(timestamps) >= limit:
        return True
    timestamps.append(now)
    return False


@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_console_output()
    configure_logging()
    logger.info("Placify AI Server starting")
    init_db()
    if env_flag("SKIP_MODEL_LOAD", default=False):
        logger.warning("SKIP_MODEL_LOAD enabled. Startup will not preload ML artifacts.")
    else:
        load_models()

    # ── Initialize RAG knowledge base ──────────────────────────────────
    if env_flag("ENABLE_RAG", default=True):
        try:
            from services.rag_service import is_available, build_all_indexes
            if not is_available():
                logger.info("Building RAG knowledge base indexes...")
                results = build_all_indexes()
                total = sum(results.values())
                if total > 0:
                    logger.info("RAG ready: %d documents indexed across %d collections",
                                total, len([v for v in results.values() if v > 0]))
                else:
                    logger.warning("RAG: no documents indexed (knowledge files may be missing)")
            else:
                logger.info("RAG knowledge base already built")
        except ImportError:
            logger.info("RAG dependencies not installed (chromadb/sentence-transformers) — skipping")
        except Exception as e:
            logger.warning("RAG init failed (non-fatal): %s", str(e)[:200])

    # ── Log LLM provider status ────────────────────────────────────────
    try:
        from services.llm_service import is_available as llm_available
        if llm_available():
            logger.info("LLM provider available (Gemini/Groq/Ollama)")
        else:
            logger.info("No LLM provider configured — rule-based fallbacks active")
    except ImportError:
        logger.info("LLM service not available — rule-based fallbacks active")

    logger.info("Server ready")
    yield


app = FastAPI(
    title="Placify AI",
    description="AI-driven placement prediction platform for students",
    version="1.1.0",
    lifespan=lifespan,
)

# Add SessionMiddleware for Google OAuth
app.add_middleware(SessionMiddleware, secret_key=os.environ["PLACIFY_SECRET_KEY"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=parse_cors_origins(),
    allow_origin_regex=parse_cors_origin_regex(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def telemetry_and_rate_limit(request: Request, call_next):
    start = time.perf_counter()
    now = time.time()
    if _rate_limited(request, now):
        return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded. Please try again later."})

    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000
    route_key = f"{request.method} {request.url.path}"

    REQUEST_METRICS["total_requests"] += 1
    route_stats = REQUEST_METRICS["routes"][route_key]
    route_stats["count"] += 1
    route_stats["total_ms"] += elapsed_ms
    if response.status_code >= 400:
        REQUEST_METRICS["error_requests"] += 1
        route_stats["errors"] += 1

    logger.info(
        "request_complete method=%s path=%s status=%s duration_ms=%.2f",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
    )
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError):
    errors = []
    for error in exc.errors():
        sanitized = dict(error)
        ctx = sanitized.get("ctx")
        if isinstance(ctx, dict):
            sanitized["ctx"] = {
                key: str(value) if isinstance(value, Exception) else value
                for key, value in ctx.items()
            }
        errors.append(sanitized)

    logger.warning("request_validation_error errors=%s", errors)
    return JSONResponse(status_code=422, content={"detail": errors})


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception):
    logger.exception("unhandled_server_exception")
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


app.include_router(auth_router)
app.include_router(analysis_router)
app.include_router(resume_enhance_router)
app.include_router(interview_router)
app.include_router(coach_router)


@app.get("/api/health")
def health():
    return {"status": "healthy", "service": "Placify AI", "model_metadata": get_model_metadata()}


@app.get("/api/metrics")
def metrics(request: Request):
    if not env_flag("METRICS_ENABLED", default=True):
        return JSONResponse(status_code=404, content={"detail": "Metrics endpoint disabled"})
    metrics_token = os.getenv("METRICS_TOKEN", "").strip()
    if not metrics_token:
        return JSONResponse(status_code=404, content={"detail": "Metrics endpoint disabled"})
    supplied = request.headers.get("authorization", "").removeprefix("Bearer ").strip()
    if not secrets.compare_digest(supplied, metrics_token):
        return JSONResponse(status_code=401, content={"detail": "Not authenticated"})

    routes = []
    for route_key, stats in REQUEST_METRICS["routes"].items():
        avg_ms = stats["total_ms"] / stats["count"] if stats["count"] else 0.0
        routes.append(
            {
                "route": route_key,
                "count": stats["count"],
                "errors": stats["errors"],
                "avg_latency_ms": round(avg_ms, 2),
            }
        )
    return {
        "total_requests": REQUEST_METRICS["total_requests"],
        "error_requests": REQUEST_METRICS["error_requests"],
        "routes": sorted(routes, key=lambda item: item["count"], reverse=True),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=env_int("PORT", 5000),
        reload=env_flag("UVICORN_RELOAD", default=False),
    )

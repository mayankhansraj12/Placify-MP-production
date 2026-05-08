"""
Placify AI - MongoDB database module.

The production backend is designed for MongoDB Atlas. SQLite has been
removed from the runtime path so free web hosts can restart without losing
application data.
"""

import logging
import os
from datetime import datetime, timezone

from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.errors import PyMongoError

try:
    from dotenv import load_dotenv

    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    load_dotenv(dotenv_path=env_path)
except ImportError:
    pass

logger = logging.getLogger("placify.database")

MONGODB_URI = os.getenv("MONGODB_URI", "").strip() or os.getenv("MONGO_URI", "").strip()
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "placify").strip() or "placify"
MONGODB_TIMEOUT_MS = int(os.getenv("MONGODB_TIMEOUT_MS", "8000"))

_client = None
_db = None
_initialized = False


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def to_iso(value):
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def _memory_db_allowed() -> bool:
    value = os.getenv("PLACIFY_ALLOW_MEMORY_DB", "").strip().lower()
    return value in {"1", "true", "yes", "on"}


def _create_client():
    if MONGODB_URI:
        return MongoClient(MONGODB_URI, serverSelectionTimeoutMS=MONGODB_TIMEOUT_MS)

    if _memory_db_allowed():
        try:
            import mongomock
        except ImportError as exc:
            raise RuntimeError(
                "MONGODB_URI is required. For tests only, install mongomock and set "
                "PLACIFY_ALLOW_MEMORY_DB=true."
            ) from exc
        logger.warning("MONGODB_URI not set. Using in-memory MongoDB mock for this process only.")
        return mongomock.MongoClient()

    raise RuntimeError(
        "MONGODB_URI is required. Create a MongoDB Atlas cluster and set "
        "MONGODB_URI in the backend environment."
    )


def get_db():
    global _client, _db
    if _client is None:
        _client = _create_client()
        _db = _client[MONGODB_DB_NAME]
    return _db


def get_collection(name: str):
    return get_db()[name]


def init_db() -> None:
    """Connect to MongoDB and create the indexes the app relies on."""
    global _initialized
    db = get_db()

    try:
        if MONGODB_URI:
            _client.admin.command("ping")

        db.users.create_index([("email", ASCENDING)], unique=True)
        db.users.create_index([("auth_methods", ASCENDING)])

        db.analyses.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
        db.analyses.create_index([("industry_readiness", ASCENDING)])
        db.analyses.create_index([("predicted_role", ASCENDING)])

        db.interview_sessions.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
        db.coach_messages.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
        db.coach_goals.create_index([("user_id", ASCENDING), ("status", ASCENDING), ("created_at", DESCENDING)])
    except PyMongoError as exc:
        logger.exception("MongoDB initialization failed")
        raise RuntimeError("Could not initialize MongoDB. Check MONGODB_URI and Atlas network access.") from exc

    _initialized = True
    logger.info("MongoDB initialized successfully db=%s", MONGODB_DB_NAME)


def close_db() -> None:
    global _client, _db, _initialized
    if _client is not None:
        _client.close()
    _client = None
    _db = None
    _initialized = False

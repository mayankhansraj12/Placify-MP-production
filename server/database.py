"""
Placify AI - Database Module
SQLite database initialization and helper functions.
"""

import logging
import os
import sqlite3

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DB_DIR = os.path.join(BASE_DIR, "data")
DEFAULT_DB_PATH = os.path.join(DEFAULT_DB_DIR, "placify.db")
DB_PATH = os.getenv("PLACIFY_DB_PATH", DEFAULT_DB_PATH)
logger = logging.getLogger("placify.database")
_SCHEMA_INITIALIZED = False


def _connect():
    db_dir = os.path.dirname(DB_PATH)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def _has_required_schema(conn: sqlite3.Connection) -> bool:
    rows = conn.execute(
        """
        SELECT name FROM sqlite_master
        WHERE type = 'table' AND name IN ('users', 'analyses')
        """
    ).fetchall()
    return {row["name"] for row in rows} == {"users", "analyses"}


def get_db():
    """Get a database connection, creating the schema on first use if needed."""
    global _SCHEMA_INITIALIZED
    conn = _connect()
    if not _SCHEMA_INITIALIZED:
        conn.close()
        init_db()
        conn = _connect()
    return conn


def _column_exists(conn: sqlite3.Connection, table: str, column: str) -> bool:
    rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
    return any(row["name"] == column for row in rows)


def _apply_migrations(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    applied = {
        row["version"] for row in conn.execute("SELECT version FROM schema_migrations").fetchall()
    }

    if 1 not in applied:
        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_analyses_user_id
            ON analyses(user_id)
            """
        )
        conn.execute(
            "INSERT INTO schema_migrations (version, name) VALUES (?, ?)",
            (1, "add_analyses_user_index"),
        )
        logger.info("Applied migration v1 add_analyses_user_index")

    if 2 not in applied and not _column_exists(conn, "users", "updated_at"):
        conn.execute("ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        conn.execute(
            "INSERT INTO schema_migrations (version, name) VALUES (?, ?)",
            (2, "add_users_updated_at"),
        )
        logger.info("Applied migration v2 add_users_updated_at")

    if 3 not in applied:
        columns = {
            "predicted_role": "TEXT",
            "predicted_tier": "TEXT",
            "industry_readiness": "INTEGER",
            "overall_confidence": "REAL",
            "salary_expected": "REAL",
        }
        for column, column_type in columns.items():
            if not _column_exists(conn, "analyses", column):
                conn.execute(f"ALTER TABLE analyses ADD COLUMN {column} {column_type}")
        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_analyses_user_created
            ON analyses(user_id, created_at DESC)
            """
        )
        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_analyses_user_readiness
            ON analyses(user_id, industry_readiness)
            """
        )
        conn.execute(
            "INSERT INTO schema_migrations (version, name) VALUES (?, ?)",
            (3, "add_analysis_summary_columns"),
        )
        logger.info("Applied migration v3 add_analysis_summary_columns")

    if 4 not in applied:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS interview_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                role TEXT NOT NULL,
                difficulty TEXT NOT NULL,
                questions TEXT NOT NULL,
                current_index INTEGER DEFAULT 0,
                answers TEXT DEFAULT '[]',
                evaluations TEXT DEFAULT '[]',
                status TEXT DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_id ON interview_sessions(user_id)")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS coach_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_coach_messages_user_id ON coach_messages(user_id)")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS coach_goals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                goal TEXT NOT NULL,
                status TEXT DEFAULT 'active',
                target_date TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_coach_goals_user_status ON coach_goals(user_id, status)")
        conn.execute(
            "INSERT INTO schema_migrations (version, name) VALUES (?, ?)",
            (4, "add_agent_tables"),
        )
        logger.info("Applied migration v4 add_agent_tables")

    if 5 not in applied:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS user_auth_methods (
                user_id TEXT NOT NULL,
                method TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, method),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )
        rows = conn.execute("SELECT id, password_hash FROM users").fetchall()
        for row in rows:
            password_hash = row["password_hash"]
            if password_hash and not password_hash.startswith("!oauth-"):
                conn.execute(
                    "INSERT OR IGNORE INTO user_auth_methods (user_id, method) VALUES (?, ?)",
                    (row["id"], "password"),
                )
            if password_hash and password_hash.startswith("!oauth-google-"):
                conn.execute(
                    "INSERT OR IGNORE INTO user_auth_methods (user_id, method) VALUES (?, ?)",
                    (row["id"], "google"),
                )
            if password_hash and password_hash.startswith("!oauth-github-"):
                conn.execute(
                    "INSERT OR IGNORE INTO user_auth_methods (user_id, method) VALUES (?, ?)",
                    (row["id"], "github"),
                )
        conn.execute(
            "INSERT INTO schema_migrations (version, name) VALUES (?, ?)",
            (5, "add_user_auth_methods"),
        )
        logger.info("Applied migration v5 add_user_auth_methods")


def init_db():
    """Initialize database tables."""
    global _SCHEMA_INITIALIZED
    conn = _connect()
    cursor = conn.cursor()

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS analyses (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            resume_filename TEXT,
            input_data TEXT NOT NULL,
            results TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )
    _apply_migrations(conn)

    conn.commit()
    conn.close()
    _SCHEMA_INITIALIZED = True
    logger.info("Database initialized successfully.")

"""
SQLite database initialization and connection helpers for ResearchMind.
Tables: users, research_sessions.
"""
import os
import sqlite3
import logging

logger = logging.getLogger("researchmind.db")

# Database file lives next to this module
DB_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(DB_DIR, "researchmind.db")

CREATE_USERS = """
CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

CREATE_SESSIONS = """
CREATE TABLE IF NOT EXISTS research_sessions (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    query       TEXT NOT NULL,
    filters     TEXT DEFAULT '{}',
    results     TEXT DEFAULT '{}',
    title       TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
"""

CREATE_SESSIONS_INDEX = """
CREATE INDEX IF NOT EXISTS idx_sessions_user
ON research_sessions(user_id, created_at DESC);
"""


def get_connection() -> sqlite3.Connection:
    """Return a new SQLite connection with row-factory enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


def init_db():
    """Create tables if they don't exist. Safe to call multiple times."""
    logger.info(f"Initializing database at {DB_PATH}")
    conn = get_connection()
    try:
        conn.execute(CREATE_USERS)
        conn.execute(CREATE_SESSIONS)
        conn.execute(CREATE_SESSIONS_INDEX)
        conn.commit()
        logger.info("Database tables ready.")
    finally:
        conn.close()

"""
Research history routes — list, view, and delete saved research sessions.
All routes require authentication.
"""
import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any

from backend.db.database import get_connection
from backend.api.deps import get_current_user

logger = logging.getLogger("researchmind.api.history")
router = APIRouter(prefix="/history", tags=["Research History"])


@router.get("")
def list_sessions(user=Depends(get_current_user)):
    """List all research sessions for the authenticated user (most recent first)."""
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT id, title, query, created_at
            FROM research_sessions
            WHERE user_id = ?
            ORDER BY created_at DESC
            """,
            (user["user_id"],),
        ).fetchall()

        return [
            {
                "id": row["id"],
                "title": row["title"],
                "query": row["query"],
                "created_at": row["created_at"],
            }
            for row in rows
        ]
    finally:
        conn.close()


@router.get("/{session_id}")
def get_session(session_id: str, user=Depends(get_current_user)):
    """Fetch the full saved results for a specific research session."""
    conn = get_connection()
    try:
        row = conn.execute(
            """
            SELECT id, title, query, filters, results, created_at
            FROM research_sessions
            WHERE id = ? AND user_id = ?
            """,
            (session_id, user["user_id"]),
        ).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Session not found.")

        # Parse JSON fields
        filters = {}
        results = {}
        try:
            filters = json.loads(row["filters"]) if row["filters"] else {}
        except (json.JSONDecodeError, TypeError):
            pass
        try:
            results = json.loads(row["results"]) if row["results"] else {}
        except (json.JSONDecodeError, TypeError):
            pass

        return {
            "id": row["id"],
            "title": row["title"],
            "query": row["query"],
            "filters": filters,
            "results": results,
            "created_at": row["created_at"],
        }
    finally:
        conn.close()


@router.delete("/{session_id}")
def delete_session(session_id: str, user=Depends(get_current_user)):
    """Delete a specific research session."""
    conn = get_connection()
    try:
        cursor = conn.execute(
            "DELETE FROM research_sessions WHERE id = ? AND user_id = ?",
            (session_id, user["user_id"]),
        )
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Session not found.")

        logger.info(f"Session {session_id} deleted by user {user['user_id']}")
        return {"detail": "Session deleted."}
    finally:
        conn.close()


def save_session(
    user_id: str,
    session_id: str,
    query: str,
    filters: Dict[str, Any],
    results: Dict[str, Any],
):
    """
    Save a completed research session to the database.
    Called internally from the pipeline execution, not exposed as a route.
    """
    # Generate a short title from the query
    title = query.strip()[:80]
    if len(query.strip()) > 80:
        title += "…"

    conn = get_connection()
    try:
        conn.execute(
            """
            INSERT OR REPLACE INTO research_sessions (id, user_id, query, filters, results, title)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                session_id,
                user_id,
                query,
                json.dumps(filters, default=str),
                json.dumps(results, default=str),
                title,
            ),
        )
        conn.commit()
        logger.info(f"Saved session {session_id} for user {user_id}")
    except Exception as e:
        logger.error(f"Failed to save session {session_id}: {e}")
    finally:
        conn.close()

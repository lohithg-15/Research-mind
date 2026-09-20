# In-memory store for tracking pipeline jobs
# job_id -> { "status": str, "state": dict, "error": str }
jobs = {}

# Set of job_ids that have been requested to cancel. Checked
# cooperatively by agents at safe points; does not interrupt
# in-flight network/LLM calls.
cancelled_jobs = set()

def request_cancellation(job_id: str):
    cancelled_jobs.add(job_id)

def is_cancelled(job_id: str) -> bool:
    return job_id in cancelled_jobs

def clear_cancellation(job_id: str):
    cancelled_jobs.discard(job_id)

def get_or_restore_job(job_id: str) -> dict | None:
    """Return the in-memory job dict, restoring it from SQLite on a cache miss."""
    if job_id in jobs:
        return jobs[job_id]
    try:
        import json
        from backend.db.database import get_connection
        conn = get_connection()
        row = conn.execute(
            "SELECT query, results FROM research_sessions WHERE id = ?", (job_id,)
        ).fetchone()
        conn.close()
        if row and row["results"]:
            saved_results = json.loads(row["results"])
            jobs[job_id] = {"status": "done", "state": saved_results, "error": None}
            return jobs[job_id]
    except Exception:
        pass
    return None

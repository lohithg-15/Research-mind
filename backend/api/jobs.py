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

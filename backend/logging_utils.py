import logging


def get_job_logger(base_logger: logging.Logger, job_id: str = None) -> logging.LoggerAdapter:
    """
    Wraps a module logger so every log line it emits is prefixed with
    the job_id, e.g. "[job=abc123] Running Planner Agent...".
    If job_id is None (e.g. called outside a pipeline run), falls back
    to "[job=-]" rather than crashing or omitting the tag.
    """
    return logging.LoggerAdapter(base_logger, {"job_id": job_id or "-"})

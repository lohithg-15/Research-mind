import os
import json
import time
import hashlib
from functools import wraps
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("researchmind.cache")

# Cache folder location relative to this file: backend/db/cache
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE_DIR = os.path.join(BASE_DIR, "db", "cache")

# TTL per cache-key prefix: S2 citation counts change faster than arXiv
# metadata, which is close to immutable once a paper is published.
DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60   # 7 days
TTL_BY_PREFIX = {
    "arxiv": 30 * 24 * 60 * 60,   # 30 days — arXiv metadata rarely changes
    "s2": 3 * 24 * 60 * 60,        # 3 days — citation counts change faster
}

def _get_ttl_for_key(key: str) -> int:
    prefix = key.split("_", 1)[0]
    return TTL_BY_PREFIX.get(prefix, DEFAULT_TTL_SECONDS)

def get_cache_key(prefix: str, *args, **kwargs) -> str:
    """
    Generates a unique MD5 hash filename based on function arguments.
    """
    # Normalize kwargs to prevent key ordering mismatch
    normalized_kwargs = {k: v for k, v in sorted(kwargs.items())}
    serialized = json.dumps({"args": args, "kwargs": normalized_kwargs}, sort_keys=True)
    hash_val = hashlib.md5(serialized.encode('utf-8')).hexdigest()
    return f"{prefix}_{hash_val}.json"

def read_from_cache(key: str):
    """
    Read cache file if it exists. Checks fallback_dataset/cache if local cache misses.
    Local cache entries expire per TTL_BY_PREFIX; fallback_dataset entries are a
    fixed demo snapshot and never expire.
    """
    os.makedirs(CACHE_DIR, exist_ok=True)
    path = os.path.join(CACHE_DIR, key)
    is_fallback = False
    if not os.path.exists(path):
        # Check committed fallback dataset cache
        fallback_path = os.path.join(os.path.dirname(BASE_DIR), "fallback_dataset", "cache", key)
        if os.path.exists(fallback_path):
            path = fallback_path
            is_fallback = True
            logger.info(f"Fallback cache hit for key: {key}")

    if os.path.exists(path):
        try:
            with open(path, 'r', encoding='utf-8') as f:
                raw = json.load(f)

            # Backward compatibility: old cache files (written before this
            # change) are a bare list/dict with no "cached_at"/"data"
            # wrapper. Treat those as immediately expired for local cache
            # (forces a fresh fetch) but still usable if they came from
            # the fallback dataset, since fallback data is intentionally
            # permanent and not subject to TTL.
            if not isinstance(raw, dict) or "cached_at" not in raw or "data" not in raw:
                if is_fallback:
                    logger.info(f"Cache hit (legacy fallback format): {key}")
                    return raw
                logger.info(f"Cache entry '{key}' is in legacy format — treating as expired.")
                return None

            if is_fallback:
                # fallback_dataset entries are a fixed demo snapshot —
                # never expire these regardless of TTL.
                logger.info(f"Cache hit: {key}")
                return raw["data"]

            age = time.time() - raw["cached_at"]
            ttl = _get_ttl_for_key(key)
            if age > ttl:
                logger.info(f"Cache entry '{key}' expired (age={age:.0f}s > ttl={ttl}s).")
                return None

            logger.info(f"Cache hit: {key}")
            return raw["data"]
        except Exception as e:
            logger.error(f"Error reading cache file {path}: {e}")
    return None

def write_to_cache(key: str, data):
    """
    Write data to a cache file, wrapped with a cached_at timestamp for TTL checks.
    """
    os.makedirs(CACHE_DIR, exist_ok=True)
    path = os.path.join(CACHE_DIR, key)
    payload = {
        "cached_at": time.time(),
        "data": data
    }
    try:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
            logger.info(f"Cached data saved to {key}")
    except Exception as e:
        logger.error(f"Error writing cache file {path}: {e}")

def exponential_backoff(max_retries: int = 5, base_delay: float = 2.0, backoff_factor: float = 2.0):
    """
    Decorator for retrying a function with exponential backoff on HTTP 429 or network errors.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            delay = base_delay
            last_err = None
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_err = e
                    err_msg = str(e).lower()
                    
                    # Identify if it is a rate limit or retryable network issue
                    is_rate_limit = "429" in err_msg or "too many requests" in err_msg or "rate limit" in err_msg
                    is_network_err = "connection" in err_msg or "timeout" in err_msg or "503" in err_msg or "502" in err_msg
                    
                    if is_rate_limit or is_network_err:
                        logger.warning(
                            f"Temporary error in '{func.__name__}': {e}. "
                            f"Retrying in {delay:.2f}s... (Attempt {attempt+1}/{max_retries})"
                        )
                        time.sleep(delay)
                        delay *= backoff_factor
                    else:
                        # Non-retryable error, raise immediately
                        raise e
            # Raise the last error if all attempts fail
            raise last_err
        return wrapper
    return decorator

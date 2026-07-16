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
    """
    os.makedirs(CACHE_DIR, exist_ok=True)
    path = os.path.join(CACHE_DIR, key)
    if not os.path.exists(path):
        # Check committed fallback dataset cache
        fallback_path = os.path.join(os.path.dirname(BASE_DIR), "fallback_dataset", "cache", key)
        if os.path.exists(fallback_path):
            path = fallback_path
            logger.info(f"Fallback cache hit for key: {key}")
            
    if os.path.exists(path):
        try:
            with open(path, 'r', encoding='utf-8') as f:
                logger.info(f"Cache hit: {key}")
                return json.load(f)
        except Exception as e:
            logger.error(f"Error reading cache file {path}: {e}")
    return None

def write_to_cache(key: str, data):
    """
    Write data to a cache file.
    """
    os.makedirs(CACHE_DIR, exist_ok=True)
    path = os.path.join(CACHE_DIR, key)
    try:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
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

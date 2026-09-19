import json
import os
import time

import pytest

from backend.data import cache


@pytest.fixture
def isolated_cache_dirs(tmp_path, monkeypatch):
    """
    Points BASE_DIR/CACHE_DIR at a throwaway tmp_path tree so tests never touch
    the real backend/db/cache/ or fallback_dataset/cache/ directories.
    Mirrors the real layout: <root>/backend/db/cache and <root>/fallback_dataset/cache.
    """
    base_dir = tmp_path / "backend"
    cache_dir = base_dir / "db" / "cache"
    fallback_dir = tmp_path / "fallback_dataset" / "cache"
    cache_dir.mkdir(parents=True)
    fallback_dir.mkdir(parents=True)

    monkeypatch.setattr(cache, "BASE_DIR", str(base_dir))
    monkeypatch.setattr(cache, "CACHE_DIR", str(cache_dir))

    return cache_dir, fallback_dir


def test_write_then_read_returns_same_data(isolated_cache_dirs):
    cache_dir, _ = isolated_cache_dirs
    key = "arxiv_freshkey.json"
    data = [{"id": "paper-1", "title": "Fresh Paper"}]

    cache.write_to_cache(key, data)
    result = cache.read_from_cache(key)

    assert result == data


def test_expired_local_entry_returns_none(isolated_cache_dirs):
    cache_dir, _ = isolated_cache_dirs
    key = "arxiv_stalekey.json"
    old_payload = {
        "cached_at": time.time() - 40 * 24 * 60 * 60,  # 40 days old, past the 30-day arXiv TTL
        "data": [{"id": "paper-old", "title": "Stale Paper"}],
    }
    with open(cache_dir / key, "w", encoding="utf-8") as f:
        json.dump(old_payload, f)

    result = cache.read_from_cache(key)

    assert result is None


def test_fresh_s2_entry_within_shorter_ttl(isolated_cache_dirs):
    cache_dir, _ = isolated_cache_dirs
    key = "s2_freshkey.json"
    payload = {
        "cached_at": time.time() - 1 * 24 * 60 * 60,  # 1 day old, within the 3-day s2 TTL
        "data": [{"id": "paper-s2", "title": "S2 Paper"}],
    }
    with open(cache_dir / key, "w", encoding="utf-8") as f:
        json.dump(payload, f)

    result = cache.read_from_cache(key)

    assert result == payload["data"]


def test_expired_s2_entry_past_shorter_ttl(isolated_cache_dirs):
    cache_dir, _ = isolated_cache_dirs
    key = "s2_stalekey.json"
    payload = {
        "cached_at": time.time() - 4 * 24 * 60 * 60,  # 4 days old, past the 3-day s2 TTL
        "data": [{"id": "paper-s2-old", "title": "Old S2 Paper"}],
    }
    with open(cache_dir / key, "w", encoding="utf-8") as f:
        json.dump(payload, f)

    result = cache.read_from_cache(key)

    assert result is None


def test_legacy_format_local_entry_treated_as_expired(isolated_cache_dirs):
    cache_dir, _ = isolated_cache_dirs
    key = "arxiv_legacykey.json"
    legacy_data = [{"id": "paper-legacy", "title": "Legacy Format Paper"}]
    with open(cache_dir / key, "w", encoding="utf-8") as f:
        json.dump(legacy_data, f)

    result = cache.read_from_cache(key)

    assert result is None


def test_fallback_dataset_entry_never_expires(isolated_cache_dirs):
    _, fallback_dir = isolated_cache_dirs
    key = "arxiv_fallbackkey.json"
    # Fallback entries are the committed demo snapshot, written before the
    # cached_at wrapper existed — a bare list, arbitrarily old.
    fallback_data = [{"id": "paper-fallback", "title": "Fallback Paper"}]
    with open(fallback_dir / key, "w", encoding="utf-8") as f:
        json.dump(fallback_data, f)

    result = cache.read_from_cache(key)

    assert result == fallback_data


def test_fallback_dataset_entry_with_wrapper_never_expires(isolated_cache_dirs):
    _, fallback_dir = isolated_cache_dirs
    key = "s2_fallbackkey.json"
    # A fallback entry generated post-change (copied via generate_fallback.py)
    # carries a cached_at wrapper, but must still be treated as permanent.
    payload = {
        "cached_at": time.time() - 365 * 24 * 60 * 60,  # 1 year old
        "data": [{"id": "paper-fallback-2", "title": "Old Fallback Paper"}],
    }
    with open(fallback_dir / key, "w", encoding="utf-8") as f:
        json.dump(payload, f)

    result = cache.read_from_cache(key)

    assert result == payload["data"]

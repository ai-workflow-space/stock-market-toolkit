"""In-process TTL cache with single-flight locking for market data."""

import logging
import time
import asyncio
from typing import Any, Callable, Awaitable

log = logging.getLogger(__name__)

# Simple in-process TTL store
_store: dict[str, tuple[float, Any]] = {}
_locks: dict[str, asyncio.Lock] = {}


async def cached(key: str, ttl: int, loader: Callable[[], Awaitable[Any]]) -> Any:
    """
    Get or compute a cached value with TTL and single-flight deduplication.
    Falls back to stale cached value if loader fails.
    """
    now = time.time()
    hit = _store.get(key)
    if hit and now - hit[0] < ttl:
        return hit[1]

    lock = _locks.setdefault(key, asyncio.Lock())
    async with lock:
        hit = _store.get(key)
        if hit and now - hit[0] < ttl:
            return hit[1]
        try:
            val = await loader()
            _store[key] = (time.time(), val)
            return val
        except Exception:
            if hit:
                log.warning("Loader failed for %s, returning stale cache", key)
                return hit[1]
            raise


def cache_key(
    kind: str, symbol: str, period: str | None = None, interval: str | None = None
) -> str:
    """Build a cache key."""
    parts = [kind, symbol.upper()]
    if period:
        parts.append(period)
    if interval:
        parts.append(interval)
    return ":".join(parts)

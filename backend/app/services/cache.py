"""In-process TTL cache with single-flight locking for market data."""

import time
import asyncio
from typing import Any, Callable, Awaitable


# Simple in-process TTL store
_store: dict[str, tuple[float, Any]] = {}
_locks: dict[str, asyncio.Lock] = {}


async def cached(key: str, ttl: int, loader: Callable[[], Awaitable[Any]]) -> Any:
    """
    Get or compute a cached value with TTL and single-flight deduplication.

    Single-flight means concurrent calls for the same key wait for one result
    rather than each firing their own loader.
    """
    now = time.time()
    hit = _store.get(key)
    if hit and now - hit[0] < ttl:
        return hit[1]

    lock = _locks.setdefault(key, asyncio.Lock())
    async with lock:
        # Double-check after acquiring lock (another coroutine may have populated it)
        hit = _store.get(key)
        if hit and now - hit[0] < ttl:
            return hit[1]
        val = await loader()
        _store[key] = (time.time(), val)
        return val


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

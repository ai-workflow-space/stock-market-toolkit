import pytest
import asyncio
import time
from app.services.cache import cached, _store


@pytest.fixture(autouse=True)
def cleanup_cache():
    _store.clear()
    yield
    _store.clear()


def test_cached_returns_stale_data_on_loader_failure():
    """When loader fails, should return stale cached value if available."""
    key = "test:stale:key"

    async def good_loader():
        return "fresh_value"

    async def bad_loader():
        raise RuntimeError("Provider down")

    async def run():
        result1 = await cached(key, ttl=1, loader=good_loader)
        assert result1 == "fresh_value"

        _store[key] = (time.time() - 10, "fresh_value")

        result2 = await cached(key, ttl=1, loader=bad_loader)
        assert result2 == "fresh_value"

    asyncio.run(run())

"""Provider package — process-wide singleton instances.

Caching lives inside the provider instances (shared TTL store), so providers
must be constructed once at import time and reused, never per-request.

The top-level ``market_provider`` is a :class:`FallbackChain` that wraps the
YFinance provider.  Additional providers can be added to the chain by
instantiating them and passing them to the ``FallbackChain`` constructor.
"""

from app.config import get_settings
from app.providers.chain import FallbackChain
from app.providers.yfinance import (
    YFinanceMarketDataProvider,
    YFinanceFundamentalsProvider,
)

_settings = get_settings()

# Concrete providers (the leaves).
_yfinance_market = YFinanceMarketDataProvider()
fundamentals_provider = YFinanceFundamentalsProvider()

# Wrap in the fallback chain with circuit breakers.
market_provider = FallbackChain(
    providers=[_yfinance_market],
    chain_name=_settings.PROVIDER_CHAIN,
    max_failures=_settings.PROVIDER_MAX_FAILURES,
    cooldown_seconds=_settings.PROVIDER_COOLDOWN_SECONDS,
)

__all__ = [
    "market_provider",
    "fundamentals_provider",
    "FallbackChain",
    "YFinanceMarketDataProvider",
    "YFinanceFundamentalsProvider",
]

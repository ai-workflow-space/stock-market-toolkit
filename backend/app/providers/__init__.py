"""Provider package — process-wide singleton instances.

Caching lives inside the provider instances (shared TTL store), so providers
must be constructed once at import time and reused, never per-request.
"""

from app.providers.yfinance import (
    YFinanceMarketDataProvider,
    YFinanceFundamentalsProvider,
)

# Process-wide singletons.
market_provider = YFinanceMarketDataProvider()
fundamentals_provider = YFinanceFundamentalsProvider()

__all__ = [
    "market_provider",
    "fundamentals_provider",
    "YFinanceMarketDataProvider",
    "YFinanceFundamentalsProvider",
]

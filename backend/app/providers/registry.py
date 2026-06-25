"""Provider registry and routing."""

from app.providers.base import MarketDataProvider, FundamentalsProvider
from app.providers.yfinance import (
    YFinanceMarketDataProvider,
    YFinanceFundamentalsProvider,
)


def is_taiwan(symbol: str) -> bool:
    """Return True for Taiwan-traded symbols."""
    upper = symbol.upper()
    return upper.endswith(".TW") or upper.endswith(".TWO")


def market_provider(symbol: str) -> MarketDataProvider:
    """Return the appropriate market data provider for a symbol."""
    # All symbols route through yfinance for now; this is extensible for TW-specific
    return YFinanceMarketDataProvider()


def fundamentals_provider(symbol: str) -> FundamentalsProvider:
    """Return the appropriate fundamentals provider for a symbol."""
    # Route TW symbols to FinMind once DATA-1 is implemented; yfinance for others
    return YFinanceFundamentalsProvider()

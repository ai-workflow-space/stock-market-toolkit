"""Provider registry — symbol-based routing to the right provider instance."""

from __future__ import annotations

import logging
from app.providers.yfinance import (
    YFinanceMarketDataProvider,
    YFinanceFundamentalsProvider,
)

log = logging.getLogger(__name__)

# TW symbol detection: 4-digit numeric OR ends with .TW/.TWO
def _is_taiwan(symbol: str) -> bool:
    s = symbol.upper()
    return s.endswith(".TW") or s.endswith(".TWO") or (s.isdigit() and len(s) == 4)


# Singleton fundamentals provider instances
_yf_fundamentals = YFinanceFundamentalsProvider()
_finmind_fundamentals: "FinMindProvider | None" = None  # type: ignore[name-defined]


def _get_finmind() -> "FinMindProvider | None":  # type: ignore[name-defined]
    """Lazily instantiate FinMindProvider, returning None if package not installed."""
    global _finmind_fundamentals
    if _finmind_fundamentals is None:
        try:
            from app.providers.finmind import FinMindProvider
            _finmind_fundamentals = FinMindProvider()
        except ImportError:
            log.debug("FinMind not installed; TW fundamentals will use yfinance fallback")
            return None
    return _finmind_fundamentals


def get_fundamentals_provider(symbol: str) -> "YFinanceFundamentalsProvider | FinMindProvider":  # type: ignore[name-defined]
    """
    Return the appropriate fundamentals provider for the given symbol.

    Taiwan symbols (.TW/.TWO or 4-digit numeric) are served by FinMind;
    all others use yfinance.
    """
    if _is_taiwan(symbol):
        fm = _get_finmind()
        if fm is not None:
            return fm
        log.debug("FinMind unavailable; using yfinance for TW symbol %s", symbol)
    return _yf_fundamentals


def get_market_provider(symbol: str) -> YFinanceMarketDataProvider:
    """Return the market data provider (yfinance for all symbols currently)."""
    # yfinance supports both US and TW symbols for price data
    return YFinanceMarketDataProvider()
"""Fallback chain that wraps multiple providers with circuit-breaker failover."""

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Sequence

import pandas as pd

from app.providers.circuit_breaker import CircuitBreaker
from app.providers.registry import get_chain

log = logging.getLogger(__name__)


@dataclass
class TaggedValue:
    """Wraps a provider return value with its origin and fetch timestamp."""

    value: Any
    source: str
    as_of: datetime


class FallbackChain:
    """Provider multiplexer that tries providers in order with circuit breakers.

    Usage::

        chain = FallbackChain([yfinance_provider, twelvedata_provider])
        result = await chain.get_history("AAPL", period="1mo", interval="1d")
        # result is a TaggedValue wrapping a pd.DataFrame
    """

    def __init__(
        self,
        providers: Sequence,
        chain_name: str = "default",
        max_failures: int = 3,
        cooldown_seconds: float = 60.0,
    ) -> None:
        self._providers: dict[str, Any] = {p.name: p for p in providers}
        chain_names: Sequence[str] = get_chain(chain_name)
        self._chain: list[str] = list(chain_names)
        self._circuit_breakers: dict[str, CircuitBreaker] = {
            name: CircuitBreaker(
                max_failures=max_failures, cooldown_seconds=cooldown_seconds
            )
            for name in self._chain
        }

    # ── Public async interface (used by routes) ───────────────────────

    async def get_history(self, symbol: str, period: str, interval: str) -> TaggedValue:
        """Fetch OHLCV history, falling back through the provider chain."""
        for name in self._chain:
            cb = self._circuit_breakers[name]
            if cb.is_open():
                log.info("Circuit open for %s, skipping", name)
                continue

            provider = self._providers.get(name)
            if provider is None:
                log.warning("Provider %s not registered, skipping", name)
                continue

            try:
                df: pd.DataFrame = await provider.get_history(symbol, period, interval)
                if df.empty:
                    cb.record_failure()
                    log.warning("%s returned empty DataFrame for %s", name, symbol)
                    continue
                cb.record_success()
                return TaggedValue(df, name, datetime.utcnow())
            except Exception as exc:
                cb.record_failure()
                log.error("Provider %s failed for %s: %s", name, symbol, exc)

        raise RuntimeError(
            f"All providers failed for symbol={symbol} "
            f"period={period} interval={interval}"
        )

    async def get_info(self, symbol: str) -> TaggedValue:
        """Fetch company info, falling back through the provider chain."""
        for name in self._chain:
            cb = self._circuit_breakers[name]
            if cb.is_open():
                continue

            provider = self._providers.get(name)
            if provider is None:
                continue

            try:
                info: dict = await provider.get_info(symbol)
                if not info:
                    cb.record_failure()
                    continue
                cb.record_success()
                return TaggedValue(info, name, datetime.utcnow())
            except Exception as exc:
                cb.record_failure()
                log.error("Provider %s get_info failed for %s: %s", name, symbol, exc)

        raise RuntimeError(f"All providers failed for info symbol={symbol}")

    # ── Sync interface (protocol conformance, rarely used directly) ───

    def history(self, symbol: str, period: str, interval: str) -> pd.DataFrame:
        """Synchronous history via first non-open provider."""
        provider = self._first_available()
        return provider.history(symbol, period, interval)

    def info(self, symbol: str) -> dict:
        """Synchronous info via first non-open provider."""
        provider = self._first_available()
        return provider.info(symbol)

    # ── Internal helpers ──────────────────────────────────────────────

    def _first_available(self) -> Any:
        for name in self._chain:
            cb = self._circuit_breakers[name]
            if cb.is_open():
                continue
            provider = self._providers.get(name)
            if provider is not None:
                return provider
        raise RuntimeError("No available provider in chain")

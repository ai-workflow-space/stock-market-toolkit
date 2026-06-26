"""FinMind provider for Taiwan fundamentals and dividends."""

from __future__ import annotations

import logging
import pandas as pd
from typing import Optional

from app.config import get_settings
from app.services.cache import cached, cache_key

log = logging.getLogger(__name__)

# 24-hour cache for fundamentals (FinMind rate-limits ~300-600 req/hr)
FUNDAMENTALS_TTL = 86400


class FinMindProvider:
    """Fundamentals provider backed by FinMind for Taiwan (.TW/.TWO) symbols."""

    name = "finmind"

    def __init__(self):
        settings = get_settings()
        self._token = settings.FINMIND_TOKEN
        self._api: Optional["DataLoader"] = None  # type: ignore[name-defined]
        if self._token:
            try:
                from FinMind.data import DataLoader

                self._api = DataLoader()
                self._api.login_by_token(api_token=self._token)
                log.info("FinMind provider initialized with API token")
            except ImportError:
                log.warning(
                    "FinMind package not installed; Taiwan fundamentals unavailable"
                )
                self._token = None
            except Exception as exc:
                log.warning("FinMind login failed: %s; operating without token", exc)
                self._token = None
        else:
            log.info("FINMIND_TOKEN not set; FinMind provider runs in dry-run mode")

    def _id(self, symbol: str) -> str:
        """Normalize Taiwan symbol to FinMind stock_id: '2330.TW' -> '2330'."""
        return symbol.upper().rstrip(".TW").rstrip(".TWO")

    def _fetch_and_pivot(
        self,
        dataset_fn,
        symbol: str,
        start: str,
        cols: Optional[list[str]] = None,
    ) -> pd.DataFrame:
        """Call a FinMind dataset function and pivot long->wide format."""
        stock_id = self._id(symbol)
        try:
            raw = dataset_fn(stock_id=stock_id, start_date=start)
        except Exception as exc:
            log.warning("FinMind API call failed for %s: %s", stock_id, exc)
            return pd.DataFrame()

        if raw.empty:
            return pd.DataFrame()

        # FinMind returns long-format: [date, stock_id, type, value, origin_name]
        if {"date", "type", "value"}.issubset(raw.columns):
            pivoted = raw.pivot_table(
                index="date",
                columns="type",
                values="value",
                aggfunc="last",
            ).sort_index(ascending=True)
            if cols:
                existing = [c for c in cols if c in pivoted.columns]
                pivoted = pivoted[existing] if existing else pivoted
            return pivoted

        # Already wide-format (e.g. dividends)
        return raw

    def income_statement(self, symbol: str, start: str = "2020-01-01") -> pd.DataFrame:
        """Return income statement as wide-format DataFrame."""
        if not self._token or not self._api:
            return pd.DataFrame()

        try:
            from FinMind.datasets import TaiwanStockFinancialStatements

            ds = TaiwanStockFinancialStatements()
            return self._fetch_and_pivot(
                lambda stock_id, start_date: ds.query(
                    stock_id=stock_id, start_date=start_date
                ),
                symbol,
                start,
            )
        except Exception as exc:
            log.warning("income_statement failed for %s: %s", symbol, exc)
            return pd.DataFrame()

    def balance_sheet(self, symbol: str, start: str = "2020-01-01") -> pd.DataFrame:
        """Return balance sheet as wide-format DataFrame."""
        if not self._token or not self._api:
            return pd.DataFrame()

        try:
            from FinMind.datasets import TaiwanStockBalanceSheet

            ds = TaiwanStockBalanceSheet()
            return self._fetch_and_pivot(
                lambda stock_id, start_date: ds.query(
                    stock_id=stock_id, start_date=start_date
                ),
                symbol,
                start,
            )
        except Exception as exc:
            log.warning("balance_sheet failed for %s: %s", symbol, exc)
            return pd.DataFrame()

    def cash_flow(self, symbol: str, start: str = "2020-01-01") -> pd.DataFrame:
        """Return cash flow statement as wide-format DataFrame."""
        if not self._token or not self._api:
            return pd.DataFrame()

        try:
            from FinMind.datasets import TaiwanStockCashFlowsStatement

            ds = TaiwanStockCashFlowsStatement()
            return self._fetch_and_pivot(
                lambda stock_id, start_date: ds.query(
                    stock_id=stock_id, start_date=start_date
                ),
                symbol,
                start,
            )
        except Exception as exc:
            log.warning("cash_flow failed for %s: %s", symbol, exc)
            return pd.DataFrame()

    def dividends(self, symbol: str, start: str = "2015-01-01") -> pd.DataFrame:
        """Return dividend history with cash/stock dividend columns."""
        if not self._token or not self._api:
            return pd.DataFrame()

        stock_id = self._id(symbol)
        try:
            from FinMind.datasets import TaiwanStockDividend

            ds = TaiwanStockDividend()
            raw = ds.query(stock_id=stock_id, start_date=start)
            if raw.empty:
                return pd.DataFrame()
            if "date" in raw.columns:
                raw = raw.set_index("date").sort_index(ascending=False)
            # Ensure required columns exist; fill missing with 0
            for col in ("cash_dividend", "stock_dividend"):
                if col not in raw.columns:
                    raw[col] = 0.0
            return raw
        except Exception as exc:
            log.warning("dividends failed for %s: %s", symbol, exc)
            return pd.DataFrame()

    # Public async wrappers with caching
    async def get_income_statement(self, symbol: str) -> pd.DataFrame:
        key = cache_key("finmind_income", symbol)

        async def loader() -> pd.DataFrame:
            return self.income_statement(symbol)

        return await cached(key, FUNDAMENTALS_TTL, loader)

    async def get_balance_sheet(self, symbol: str) -> pd.DataFrame:
        key = cache_key("finmind_balance", symbol)

        async def loader() -> pd.DataFrame:
            return self.balance_sheet(symbol)

        return await cached(key, FUNDAMENTALS_TTL, loader)

    async def get_cash_flow(self, symbol: str) -> pd.DataFrame:
        key = cache_key("finmind_cashflow", symbol)

        async def loader() -> pd.DataFrame:
            return self.cash_flow(symbol)

        return await cached(key, FUNDAMENTALS_TTL, loader)

    async def get_dividends(self, symbol: str) -> pd.DataFrame:
        key = cache_key("finmind_dividends", symbol)

        async def loader() -> pd.DataFrame:
            return self.dividends(symbol)

        return await cached(key, FUNDAMENTALS_TTL, loader)

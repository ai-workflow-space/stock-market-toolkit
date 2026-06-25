"""YFinance implementation of market data and fundamentals providers."""

import asyncio

import yfinance as yf
import pandas as pd
import logging

from app.services.cache import cached, cache_key

log = logging.getLogger(__name__)


# TTLs in seconds
OHLCV_TTL = 300  # 5 min for intraday/daily OHLCV
INFO_TTL = 3600  # 1 hr for stock info


class YFinanceMarketDataProvider:
    """Market data provider backed by yfinance, with caching."""

    name = "yfinance"

    def history(self, symbol: str, period: str, interval: str) -> pd.DataFrame:
        """Synchronous history fetch (used internally)."""
        ticker = yf.Ticker(symbol.upper())
        return ticker.history(period=period, interval=interval, auto_adjust=True)

    def info(self, symbol: str) -> dict:
        """Synchronous info fetch (used internally)."""
        ticker = yf.Ticker(symbol.upper())
        return ticker.info or {}

    async def get_history(
        self, symbol: str, period: str, interval: str
    ) -> pd.DataFrame:
        """Cached async history fetch."""
        key = cache_key("ohlcv", symbol, period, interval)

        async def loader() -> pd.DataFrame:
            return await asyncio.to_thread(self.history, symbol, period, interval)

        return await cached(key, OHLCV_TTL, loader)

    async def get_info(self, symbol: str) -> dict:
        """Cached async info fetch."""
        key = cache_key("info", symbol)

        async def loader() -> dict:
            return await asyncio.to_thread(self.info, symbol)

        return await cached(key, INFO_TTL, loader)


class YFinanceFundamentalsProvider:
    """Fundamentals provider backed by yfinance, with caching."""

    name = "yfinance"

    FUNDAMENTALS_TTL = 3600  # 1 hr

    def income_statement(self, symbol: str) -> pd.DataFrame:
        return yf.Ticker(symbol.upper()).income_stmt

    def balance_sheet(self, symbol: str) -> pd.DataFrame:
        return yf.Ticker(symbol.upper()).balance_sheet

    def cash_flow(self, symbol: str) -> pd.DataFrame:
        return yf.Ticker(symbol.upper()).cashflow

    def dividends(self, symbol: str) -> pd.Series:
        return yf.Ticker(symbol.upper()).dividends

    async def get_income_statement(self, symbol: str) -> pd.DataFrame:
        key = cache_key("income_stmt", symbol)

        async def loader() -> pd.DataFrame:
            return await asyncio.to_thread(self.income_statement, symbol)

        return await cached(key, self.FUNDAMENTALS_TTL, loader)

    async def get_balance_sheet(self, symbol: str) -> pd.DataFrame:
        key = cache_key("balance_sheet", symbol)

        async def loader() -> pd.DataFrame:
            return await asyncio.to_thread(self.balance_sheet, symbol)

        return await cached(key, self.FUNDAMENTALS_TTL, loader)

    async def get_cash_flow(self, symbol: str) -> pd.DataFrame:
        key = cache_key("cash_flow", symbol)

        async def loader() -> pd.DataFrame:
            return await asyncio.to_thread(self.cash_flow, symbol)

        return await cached(key, self.FUNDAMENTALS_TTL, loader)

    async def get_dividends(self, symbol: str) -> pd.Series:
        key = cache_key("dividends", symbol)

        async def loader() -> pd.Series:
            return await asyncio.to_thread(self.dividends, symbol)

        return await cached(key, self.FUNDAMENTALS_TTL, loader)

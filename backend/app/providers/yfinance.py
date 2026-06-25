"""YFinance implementation of market data and fundamentals providers."""

import yfinance as yf
import pandas as pd
import logging

log = logging.getLogger(__name__)


class YFinanceMarketDataProvider:
    """Market data provider backed by yfinance."""

    name = "yfinance"

    def history(self, symbol: str, period: str, interval: str) -> pd.DataFrame:
        """Fetch historical OHLCV for a symbol."""
        ticker = yf.Ticker(symbol.upper())
        return ticker.history(period=period, interval=interval, auto_adjust=True)

    def info(self, symbol: str) -> dict:
        """Fetch normalized info dict for a symbol."""
        ticker = yf.Ticker(symbol.upper())
        return ticker.info or {}


class YFinanceFundamentalsProvider:
    """Fundamentals provider backed by yfinance."""

    name = "yfinance"

    def income_statement(self, symbol: str) -> pd.DataFrame:
        return yf.Ticker(symbol.upper()).income_stmt

    def balance_sheet(self, symbol: str) -> pd.DataFrame:
        return yf.Ticker(symbol.upper()).balance_sheet

    def cash_flow(self, symbol: str) -> pd.DataFrame:
        return yf.Ticker(symbol.upper()).cashflow

    def dividends(self, symbol: str) -> pd.DataFrame:
        return yf.Ticker(symbol.upper()).dividends

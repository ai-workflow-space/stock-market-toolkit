"""
Compatibility shim providing a pandas_ta-like API backed by the `ta` package.
Used by app/routes/stocks.py when pandas-ta is not installed (Python < 3.12).
"""
import pandas as pd
from ta.volatility import BollingerBands, AverageTrueRange
from ta.momentum import RSIIndicator
from ta.trend import MACD as TA_MACD


def sma(close, length):
    """Simple moving average — returns pd.Series."""
    if len(close) < length:
        return pd.Series([None] * len(close), index=close.index)
    return close.rolling(window=length).mean()


def ema(close, length):
    """Exponential moving average — returns pd.Series."""
    return close.ewm(span=length, adjust=False).mean()


def rsi(close, length=14):
    """Relative Strength Index — returns pd.Series."""
    return RSIIndicator(close=close, window=length).rsi()


def macd(close, fast=12, slow=26, signal=9):
    """MACD — returns DataFrame with MACD, MACD_signal, MACD_hist columns."""
    macd_ind = TA_MACD(close=close, window_slow=slow, window_fast=fast, window_sign=signal)
    return pd.DataFrame({
        "MACD_12_26_9": macd_ind.macd(),
        "MACDs_12_26_9": macd_ind.macd_signal(),
        "MACDh_12_26_9": macd_ind.macd_diff(),
    }, index=close.index)


def bbands(close, length=20, std=2):
    """Bollinger Bands — returns DataFrame with BBU, BBM, BBL columns."""
    bb = BollingerBands(close=close, window=length, window_dev=std)
    return pd.DataFrame({
        "BBU_20_2.0_2.0": bb.bollinger_hband(),
        "BBM_20_2.0_2.0": bb.bollinger_mavg(),
        "BBL_20_2.0_2.0": bb.bollinger_lband(),
    }, index=close.index)


def atr(high, low, close, length=14):
    """Average True Range — returns pd.Series."""
    return AverageTrueRange(high=high, low=low, close=close, window=length).average_true_range()
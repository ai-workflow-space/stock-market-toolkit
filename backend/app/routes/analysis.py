from fastapi import APIRouter, Depends, HTTPException, Query
from app.models import User
from app.auth import get_current_user
import yfinance as yf
import pandas_ta as ta
import math

router = APIRouter(prefix="/api", tags=["analysis"])

CACHE_TTL = 300  # 5 minutes

def _clean(v):
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v

def _clean_list(lst):
    return [_clean(v) for v in lst]

@router.get("/analysis/{symbol}")
async def get_analysis(
    symbol: str,
    period: str = Query("3mo"),
    current_user: User = Depends(get_current_user),
):
    """Get comprehensive technical analysis for a symbol."""
    ticker = yf.Ticker(symbol.upper())
    interval_map = {"1d": "5m", "5d": "15m"}
    interval = interval_map.get(period, "1d")
    df = ticker.history(period=period, interval=interval, auto_adjust=True)

    if df.empty:
        raise HTTPException(status_code=404, detail=f"No data for {symbol}")

    close = df["Close"]

    def _safe_ta_series(fn, *args, **kwargs):
        """Call a ta function, return Series.tolist() or [None]*n on failure."""
        n = len(close)
        try:
            result = fn(*args, **kwargs)
            if result is None:
                return [None] * n
            if hasattr(result, "tolist"):
                return result.tolist()
            return list(result)
        except Exception:
            return [None] * n

    def _df_col(df, col):
        """Extract a column from DataFrame, or return [None]*n if unavailable."""
        n = len(close)
        if df is None or not hasattr(df, "columns") or col not in df.columns:
            return [None] * n
        return df[col].tolist()

    try:
        macd_df = ta.macd(close, fast=12, slow=26, signal=9)
        bbands_df = ta.bbands(close, length=20, std=2)
    except Exception:
        macd_df = None
        bbands_df = None

    rsi_vals = _safe_ta_series(ta.rsi, close, length=14)
    sma20 = _safe_ta_series(ta.sma, close, length=20)
    sma50 = _safe_ta_series(ta.sma, close, length=50) if len(close) >= 50 else [None] * len(close)

    return {
        "symbol": symbol.upper(),
        "period": period,
        "indicators": {
            "rsi": _clean_list(rsi_vals.tolist() if hasattr(rsi_vals, 'tolist') else list(rsi_vals)),
            "sma20": _clean_list(sma20),
            "sma50": _clean_list(sma50),
            "macd": _clean_list(_df_col(macd_df, "MACD_12_26_9")),
            "macd_signal": _clean_list(_df_col(macd_df, "MACDs_12_26_9")),
            "macd_hist": _clean_list(_df_col(macd_df, "MACDh_12_26_9")),
            "bb_upper": _clean_list(_df_col(bbands_df, "BBU_20_2.0_2.0")),
            "bb_middle": _clean_list(_df_col(bbands_df, "BBM_20_2.0_2.0")),
            "bb_lower": _clean_list(_df_col(bbands_df, "BBL_20_2.0_2.0")),
        }
    }
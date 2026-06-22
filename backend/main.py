"""
Stock Market Toolkit -- FastAPI Backend
Uses yfinance with direct Yahoo Finance API as fallback.
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
import pandas_ta as ta
from datetime import datetime
import time
import math

def _clean_nan(val):
    """Replace NaN/inf with None for JSON serialization."""
    if isinstance(val, float):
        if math.isnan(val) or math.isinf(val):
            return None
    return val

def _clean_list(lst):
    return [_clean_nan(v) for v in lst]

app = FastAPI(title="Stock Market Toolkit API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory cache: key -> (expires_at_timestamp, data)
_cache: dict = {}
CACHE_TTL = 60  # seconds


def _cache_get(key: str):
    entry = _cache.get(key)
    if entry is None:
        return None
    expires_at, data = entry
    if time.time() > expires_at:
        del _cache[key]
        return None
    return data


def _cache_set(key: str, data, ttl: int = CACHE_TTL):
    _cache[key] = (time.time() + ttl, data)


def _fetch_ticker(symbol: str, period: str = "1y"):
    """Fetch ticker data using yfinance with caching."""
    cache_key = f"ticker:{symbol}:{period}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    # Try as-is first, then try .NS (NSE India) for Indian stocks
    ticker = yf.Ticker(symbol)
    df = ticker.history(period=period, auto_adjust=True)
    if df.empty and not symbol.endswith(".NS"):
        ticker2 = yf.Ticker(symbol + ".NS")
        df = ticker2.history(period=period, auto_adjust=True)

    if df.empty:
        raise HTTPException(status_code=404, detail=f"No data found for {symbol}")

    _cache_set(cache_key, df)
    return df


@app.get("/api/stock/{symbol}")
def get_stock_data(
    symbol: str,
    period: str = Query("1y", description="1d,5d,1mo,3mo,6mo,1y,2y,5y,max"),
):
    """Return OHLCV data for a ticker."""
    df = _fetch_ticker(symbol.upper(), period)
    return {
        "symbol": symbol.upper(),
        "period": period,
        "timestamp": df.index.strftime("%Y-%m-%dT%H:%M:%S").tolist(),
        "open": df["Open"].tolist(),
        "high": df["High"].tolist(),
        "low": df["Low"].tolist(),
        "close": df["Close"].tolist(),
        "volume": df["Volume"].tolist(),
    }


@app.get("/api/stock/{symbol}/indicators")
def get_indicators(
    symbol: str,
    period: str = Query("1y"),
):
    """Return OHLCV + technical indicators."""
    df = _fetch_ticker(symbol.upper(), period).copy()
    close = df["Close"]
    high = df["High"]
    low = df["Low"]
    volume = df["Volume"]

    if len(close) < 5:
        raise HTTPException(status_code=404, detail=f"Insufficient data for {symbol}")

    try:
        macd_df = ta.macd(close)
    except Exception:
        macd_df = None
    try:
        bbands_df = ta.bbands(close, length=20)
    except Exception:
        bbands_df = None

    return {
        "symbol": symbol.upper(),
        "period": period,
        "timestamp": df.index.strftime("%Y-%m-%dT%H:%M:%S").tolist(),
        "open": df["Open"].tolist(),
        "high": df["High"].tolist(),
        "low": df["Low"].tolist(),
        "close": close.tolist(),
        "volume": volume.tolist() if not volume.isna().all() else [],
        "sma20": _clean_list(ta.sma(close, length=20).tolist()),
        "sma50": _clean_list(ta.sma(close, length=50).tolist()) if len(close) >= 50 else [],
        "sma200": _clean_list(ta.sma(close, length=200).tolist()) if len(close) >= 200 else [],
        "ema12": _clean_list(ta.ema(close, length=12).tolist()) if len(close) >= 12 else [],
        "ema26": _clean_list(ta.ema(close, length=26).tolist()) if len(close) >= 26 else [],
        "rsi": _clean_list(ta.rsi(close, length=14).tolist()),
        "macd": _clean_list(macd_df["MACD_12_26_9"].tolist()) if macd_df is not None else [],
        "macd_signal": _clean_list(macd_df["MACDs_12_26_9"].tolist()) if macd_df is not None else [],
        "macd_hist": _clean_list(macd_df["MACDh_12_26_9"].tolist()) if macd_df is not None else [],
        "bb_upper": _clean_list(bbands_df["BBU_20_2.0_2.0"].tolist()) if bbands_df is not None else [],
        "bb_middle": _clean_list(bbands_df["BBM_20_2.0_2.0"].tolist()) if bbands_df is not None else [],
        "bb_lower": _clean_list(bbands_df["BBL_20_2.0_2.0"].tolist()) if bbands_df is not None else [],
        "atr": _clean_list(ta.atr(high, low, close, length=14).tolist()) if len(close) >= 14 else [],
    }


@app.get("/api/stock/{symbol}/info")
def get_stock_info(symbol: str):
    """Return company/market info."""
    symbol = symbol.upper()
    cache_key = f"info:{symbol}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        if not info or "regularMarketPrice" not in info:
            ticker2 = yf.Ticker(symbol + ".NS")
            info = ticker2.info
    except Exception:
        raise HTTPException(status_code=404, detail=f"No info found for {symbol}")

    if not info:
        raise HTTPException(status_code=404, detail=f"No info found for {symbol}")

    info_data = {
        "symbol": info.get("symbol", symbol),
        "company_name": info.get("longName") or info.get("shortName", "N/A"),
        "exchange": info.get("exchange", "N/A"),
        "sector": info.get("sector", "N/A"),
        "industry": info.get("industry", "N/A"),
        "market_cap": info.get("marketCap"),
        "pe_ratio": info.get("trailingPE"),
        "dividend_yield": info.get("dividendYield"),
        "week52_high": info.get("fiftyTwoWeekHigh"),
        "week52_low": info.get("fiftyTwoWeekLow"),
        "week52_change": info.get("52WeekChange"),
        "avg_volume": info.get("averageVolume"),
        "current_price": info.get("regularMarketPrice"),
        "prev_close": info.get("regularMarketPreviousClose"),
        "open_price": info.get("regularMarketOpen"),
        "beta": info.get("beta"),
        "description": info.get("longBusinessSummary", "")[:1000],
    }
    _cache_set(cache_key, info_data, ttl=300)
    return info_data


@app.post("/api/compare")
def compare_stocks(payload: dict):
    """Accept { symbols: ["AAPL","MSFT"], period: "1mo" }, return OHLCV for each."""
    symbols: list = payload.get("symbols", [])
    period: str = payload.get("period", "1mo")
    if not symbols or len(symbols) > 5:
        raise HTTPException(status_code=400, detail="1-5 symbols required")
    stocks = []
    for sym in symbols:
        try:
            df = _fetch_ticker(sym.upper(), period)
            stocks.append({
                "symbol": sym.upper(),
                "timestamp": df.index.strftime("%Y-%m-%dT%H:%M:%S").tolist(),
                "close": df["Close"].tolist(),
                "volume": df["Volume"].tolist(),
            })
        except Exception:
            continue
    return {"stocks": stocks, "period": period}


@app.get("/api/search")
def search_stocks(q: str = Query(..., min_length=1)):
    """Search for stock symbols using yfinance. Returns flat array of suggestions."""
    try:
        results = yf.Search(q, max_results=8)
        suggestions = []
        for quote in (results.quotes or []):
            suggestions.append({
                "symbol": quote.get("symbol", ""),
                "name": quote.get("shortname") or quote.get("longname", ""),
                "exchange": quote.get("exchDisp", quote.get("exchange", "")),
            })
        return suggestions
    except Exception:
        return []


@app.get("/health")
def health():
    return {"status": "ok", "time": datetime.now().isoformat()}
"""
Stock Market Toolkit -- FastAPI Backend
Uses direct Yahoo Finance chart/quote API with caching.
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import requests
import pandas as pd
import pandas_ta as ta
from datetime import datetime, timedelta
from typing import Optional
import time

YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
YAHOO_QUOTE = "https://query1.finance.yahoo.com/v10/finance/quoteSummary/{symbol}"

app = FastAPI(title="Stock Market Toolkit API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# In-memory cache: key -> (expires_at_timestamp, data)
_cache: dict = {}
CACHE_TTL_SECONDS = 60  # cache for 60 seconds to avoid Yahoo rate limits


def _cache_get(key: str):
    entry = _cache.get(key)
    if entry is None:
        return None
    expires_at, data = entry
    if time.time() > expires_at:
        del _cache[key]
        return None
    return data


def _cache_set(key: str, data, ttl: int = CACHE_TTL_SECONDS):
    _cache[key] = (time.time() + ttl, data)


RANGE_MAP = {
    "1d": "1d", "5d": "5d", "1mo": "1mo",
    "3mo": "3mo", "6mo": "6mo", "1y": "1y",
    "2y": "2y", "5y": "5y", "max": "max",
}
INTERVAL_MAP = {
    "1d": "30m", "5d": "30m", "1mo": "1d",
    "3mo": "1d", "6mo": "1d", "1y": "1d",
    "2y": "1wk", "5y": "1wk", "max": "1mo",
}


def _fetch_yahoo(symbol: str, period: str = "1y"):
    """Fetch OHLCV from Yahoo Finance chart API with caching."""
    cache_key = f"chart:{symbol}:{period}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    range_ = RANGE_MAP.get(period, "1y")
    interval = INTERVAL_MAP.get(period, "1d")
    url = YAHOO_CHART.format(symbol=symbol)
    params = {"interval": interval, "range": range_}
    r = requests.get(url, params=params, headers=HEADERS, timeout=10)
    if r.status_code == 429:
        raise HTTPException(status_code=429, detail="Yahoo Finance rate limited. Try again in a minute.")
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Yahoo Finance error: {r.status_code}")
    data = r.json()
    result = data.get("chart", {}).get("result")
    if not result:
        error = data.get("chart", {}).get("error", {})
        raise HTTPException(status_code=404, detail=error.get("description", f"No data for {symbol}"))
    _cache_set(cache_key, result[0])
    return result[0]


@app.get("/api/stock/{symbol}")
def get_stock_data(
    symbol: str,
    period: str = Query("1y", description="1d,5d,1mo,3mo,6mo,1y,2y,5y,max"),
):
    """Return OHLCV data for a ticker."""
    result = _fetch_yahoo(symbol.upper(), period)
    timestamps = result.get("timestamp", [])
    quote = result.get("indicators", {}).get("quote", [{}])[0]
    volumes = quote.get("volume", [])

    return {
        "symbol": symbol.upper(),
        "period": period,
        "timestamp": [datetime.fromtimestamp(t).isoformat() for t in timestamps],
        "open": quote.get("open", []),
        "high": quote.get("high", []),
        "low": quote.get("low", []),
        "close": quote.get("close", []),
        "volume": volumes,
    }


@app.get("/api/stock/{symbol}/indicators")
def get_indicators(
    symbol: str,
    period: str = Query("1y"),
):
    """Return OHLCV + technical indicators."""
    result = _fetch_yahoo(symbol.upper(), period)
    timestamps = result.get("timestamp", [])
    quote = result.get("indicators", {}).get("quote", [{}])[0]

    close = pd.Series(quote.get("close", []))
    high = pd.Series(quote.get("high", []))
    low = pd.Series(quote.get("low", []))
    volume = pd.Series(quote.get("volume", []))

    if close.empty or len(close) < 5:
        raise HTTPException(status_code=404, detail=f"Insufficient data for {symbol}")

    macd_df = ta.macd(close)
    bbands_df = ta.bbands(close)

    return {
        "symbol": symbol.upper(),
        "period": period,
        "timestamp": [datetime.fromtimestamp(t).isoformat() for t in timestamps],
        "open": quote.get("open", []),
        "high": quote.get("high", []),
        "low": quote.get("low", []),
        "close": close.tolist(),
        "volume": volume.tolist() if not volume.isna().all() else [],
        "sma20": ta.sma(close, length=20).tolist(),
        "sma50": ta.sma(close, length=50).tolist() if len(close) >= 50 else [],
        "sma200": ta.sma(close, length=200).tolist() if len(close) >= 200 else [],
        "ema12": ta.ema(close, length=12).tolist() if len(close) >= 12 else [],
        "ema26": ta.ema(close, length=26).tolist() if len(close) >= 26 else [],
        "rsi": ta.rsi(close, length=14).tolist(),
        "macd": macd_df["MACD_12_26_9"].tolist() if macd_df is not None else [],
        "macd_signal": macd_df["MACDs_12_26_9"].tolist() if macd_df is not None else [],
        "macd_hist": macd_df["MACDh_12_26_9"].tolist() if macd_df is not None else [],
        "bb_upper": bbands_df["BBU_20_2.0"].tolist() if bbands_df is not None else [],
        "bb_middle": bbands_df["BBM_20_2.0"].tolist() if bbands_df is not None else [],
        "bb_lower": bbands_df["BBL_20_2.0"].tolist() if bbands_df is not None else [],
        "atr": ta.atr(high, low, close, length=14).tolist() if len(close) >= 14 else [],
    }


@app.get("/api/stock/{symbol}/info")
def get_stock_info(symbol: str):
    """Return company/market info."""
    symbol = symbol.upper()
    cache_key = f"info:{symbol}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    result = _fetch_yahoo(symbol, "1mo")
    meta = result.get("meta", {})

    info_url = YAHOO_QUOTE.format(symbol=symbol)
    params = {
        "modules": "financialData,quoteType,defaultKeyStatistics,assetProfile,summaryDetail",
        "formatted": "false",
    }
    info_data = {}
    try:
        r = requests.get(info_url, params=params, headers=HEADERS, timeout=10)
        if r.status_code == 200:
            data = r.json()
            result_data = data.get("quoteSummary", {}).get("result", [{}])
            if result_data:
                ap = result_data[0].get("assetProfile", {})
                dks = result_data[0].get("defaultKeyStatistics", {})
                sd = result_data[0].get("summaryDetail", {})
                info_data = {
                    "symbol": symbol,
                    "company_name": ap.get("longName") or meta.get("shortName", "N/A"),
                    "exchange": meta.get("exchangeName", "N/A"),
                    "sector": ap.get("sector", "N/A"),
                    "industry": ap.get("industry", "N/A"),
                    "market_cap": dks.get("marketCap", {}).get("raw"),
                    "pe_ratio": sd.get("trailingPE", {}).get("raw"),
                    "dividend_yield": sd.get("dividendYield", {}).get("raw"),
                    "week52_high": dks.get("fiftyTwoWeekHigh", {}).get("raw"),
                    "week52_low": dks.get("fiftyTwoWeekLow", {}).get("raw"),
                    "week52_change": dks.get("52WeekChange", {}).get("raw"),
                    "avg_volume": sd.get("averageVolume", {}).get("raw"),
                    "current_price": meta.get("regularMarketPrice"),
                    "prev_close": meta.get("previousClose"),
                    "open_price": meta.get("chartPreviousClose"),
                    "beta": dks.get("beta", {}).get("raw"),
                    "description": ap.get("longBusinessSummary", "")[:1000],
                }
    except Exception:
        pass

    if not info_data:
        info_data = {
            "symbol": symbol,
            "company_name": meta.get("shortName", symbol),
            "exchange": meta.get("exchangeName", "N/A"),
            "current_price": meta.get("regularMarketPrice"),
            "prev_close": meta.get("previousClose"),
            "week52_high": meta.get("fiftyTwoWeekHigh"),
            "week52_low": meta.get("fiftyTwoWeekLow"),
            "description": "",
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
            result = _fetch_yahoo(sym.upper(), period)
            quote = result.get("indicators", {}).get("quote", [{}])[0]
            timestamps = result.get("timestamp", [])
            stocks.append({
                "symbol": sym.upper(),
                "timestamp": [datetime.fromtimestamp(t).isoformat() for t in timestamps],
                "close": quote.get("close", []),
                "volume": quote.get("volume", []),
            })
        except Exception:
            continue
    return {"stocks": stocks, "period": period}


@app.get("/api/search")
def search_stocks(q: str = Query(..., min_length=1)):
    """Simple search - return matching ticker suggestions."""
    return {"query": q, "suggestions": [q.upper()]}


@app.get("/health")
def health():
    return {"status": "ok", "time": datetime.now().isoformat()}
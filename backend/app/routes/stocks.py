from fastapi import APIRouter, Depends, HTTPException, Query
from app.models import User
from app.schemas import (
    StockDataResponse, IndicatorsResponse, StockInfoResponse,
    CompareRequest, CompareResponse, CompareStockData,
)
from app.auth import get_current_user
import yfinance as yf
import pandas_ta as ta
import math

router = APIRouter(prefix="/api", tags=["stocks"])

CACHE_TTL = 300  # 5 minutes

def _clean(v):
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v

def _clean_list(lst):
    return [_clean(v) for v in lst]

@router.get("/stock/{symbol}", response_model=StockDataResponse)
async def get_stock(
    symbol: str,
    period: str = Query("1mo"),
    current_user: User = Depends(get_current_user),
):
    if period not in ("1d","5d","1w","1mo","3mo","6mo","1y","2y","5y","max"):
        raise HTTPException(status_code=400, detail="Invalid period")

    ticker = yf.Ticker(symbol.upper())
    # Use intraday intervals for short periods (yfinance daily data has too few rows)
    interval_map = {"1d": "5m", "5d": "15m"}
    interval = interval_map.get(period, "1d")
    df = ticker.history(period=period, interval=interval, auto_adjust=True)

    if df.empty:
        raise HTTPException(status_code=404, detail=f"No data for {symbol}")

    return StockDataResponse(
        symbol=symbol.upper(),
        period=period,
        timestamp=df.index.strftime("%Y-%m-%dT%H:%M:%S").tolist(),
        open=_clean_list(df["Open"].tolist()),
        high=_clean_list(df["High"].tolist()),
        low=_clean_list(df["Low"].tolist()),
        close=_clean_list(df["Close"].tolist()),
        volume=[int(v) if not math.isnan(v) else None for v in df["Volume"].tolist()],
    )

@router.get("/stock/{symbol}/indicators", response_model=IndicatorsResponse)
async def get_indicators(
    symbol: str,
    period: str = Query("3mo"),
    current_user: User = Depends(get_current_user),
):
    ticker = yf.Ticker(symbol.upper())
    interval_map = {"1d": "5m", "5d": "15m"}
    interval = interval_map.get(period, "1d")
    df = ticker.history(period=period, interval=interval, auto_adjust=True)

    if len(df) < 2:
        raise HTTPException(status_code=404, detail=f"No data for {symbol} ({period})")

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

    macd_df = _safe_ta_series(ta.macd, close)
    rsi_vals = _safe_ta_series(ta.rsi, close, length=14)
    bbands_df = _safe_ta_series(ta.bbands, close, length=20, std=2)

    return IndicatorsResponse(
        symbol=symbol.upper(),
        period=period,
        timestamp=df.index.strftime("%Y-%m-%dT%H:%M:%S").tolist(),
        sma20=_clean_list(_safe_ta_series(ta.sma, close, length=20)),
        sma50=_clean_list(_safe_ta_series(ta.sma, close, length=50) if len(close) >= 50 else [None] * len(close)),
        sma200=_clean_list(_safe_ta_series(ta.sma, close, length=200) if len(close) >= 200 else [None] * len(close)),
        ema12=_clean_list(_safe_ta_series(ta.ema, close, length=12)),
        ema26=_clean_list(_safe_ta_series(ta.ema, close, length=26)),
        rsi=_clean_list(rsi_vals.tolist() if hasattr(rsi_vals, 'tolist') else list(rsi_vals)),
        macd=_clean_list(_df_col(macd_df, "MACD_12_26_9")),
        macd_signal=_clean_list(_df_col(macd_df, "MACDs_12_26_9")),
        macd_hist=_clean_list(_df_col(macd_df, "MACDh_12_26_9")),
        bb_upper=_clean_list(_df_col(bbands_df, "BBU_20_2.0_2.0")),
        bb_middle=_clean_list(_df_col(bbands_df, "BBM_20_2.0_2.0")),
        bb_lower=_clean_list(_df_col(bbands_df, "BBL_20_2.0_2.0")),
        atr=_clean_list(_safe_ta_series(ta.atr, df["High"], df["Low"], df["Close"], length=14)),
    )

@router.get("/stock/{symbol}/info", response_model=StockInfoResponse)
async def get_stock_info(
    symbol: str,
    current_user: User = Depends(get_current_user),
):
    ticker = yf.Ticker(symbol.upper())
    info = ticker.info or {}
    
    return StockInfoResponse(
        symbol=symbol.upper(),
        short_name=info.get("shortName", symbol.upper()),
        long_name=info.get("longName"),
        sector=info.get("sector"),
        industry=info.get("industry"),
        price=info.get("currentPrice") or info.get("regularMarketPrice", 0),
        currency=info.get("currency"),
        market_cap=info.get("marketCap"),
        sharesOutstanding=info.get("sharesOutstanding"),
        trailing_pe=info.get("trailingPE"),
        forward_pe=info.get("forwardPE"),
        dividend_yield=info.get("dividendYield"),
        avg_volume=info.get("averageVolume"),
        beta=info.get("beta"),
        week_52_high=info.get("fiftyTwoWeekHigh"),
        week_52_low=info.get("fiftyTwoWeekLow"),
    )

@router.post("/compare", response_model=CompareResponse)
async def compare_stocks(
    data: CompareRequest,
    current_user: User = Depends(get_current_user),
):
    stocks = []
    interval_map = {"1d": "5m", "5d": "15m"}
    int_interval = interval_map.get(data.period, "1d")
    for symbol in data.symbols:
        ticker = yf.Ticker(symbol.upper())
        df = ticker.history(period=data.period, interval=int_interval, auto_adjust=True)
        
        if df.empty:
            raise HTTPException(status_code=404, detail=f"No data for {symbol}")
        
        stocks.append(CompareStockData(
            symbol=symbol.upper(),
            timestamp=df.index.strftime("%Y-%m-%dT%H:%M:%S").tolist(),
            close=_clean_list(df["Close"].tolist()),
            volume=[int(v) if not (isinstance(v, float) and math.isnan(v)) else None for v in df["Volume"].tolist()],
        ))
    
    return CompareResponse(stocks=stocks)

@router.get("/search")
async def search_symbols(
    q: str = Query(..., min_length=1),
):
    try:
        import yfinance as yf
        search_result = yf.Search(q, max_results=10)
        quotes = search_result.quotes if search_result.quotes else []
        return [
            {
                "symbol": r["symbol"],
                "name": r.get("longname", r.get("shortname", "")),
                "exchange": r.get("exchange", ""),
            }
            for r in quotes
            if r.get("symbol") and r.get("quoteType") == "EQUITY"
        ][:8]
    except Exception:
        return []

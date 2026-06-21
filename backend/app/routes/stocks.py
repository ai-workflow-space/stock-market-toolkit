from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User
from app.schemas import (
    StockDataResponse, IndicatorsResponse, StockInfoResponse,
    CompareRequest, CompareResponse, CompareStockData,
)
from app.auth import get_current_user
import yfinance as yf
import pandas as pd
import pandas_ta as ta
import math
import time
import json

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
    df = ticker.history(period=period, auto_adjust=True)
    
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
    df = ticker.history(period=period, auto_adjust=True)
    
    if len(df) < 5:
        raise HTTPException(status_code=404, detail=f"Insufficient data for {symbol}")
    
    close = df["Close"]
    
    macd_df = None
    bbands_df = None
    try:
        macd_df = ta.macd(close)
    except Exception:
        pass
    try:
        bbands_df = ta.bbands(close, length=20, std=2)
    except Exception:
        pass
    
    return IndicatorsResponse(
        symbol=symbol.upper(),
        period=period,
        timestamp=df.index.strftime("%Y-%m-%dT%H:%M:%S").tolist(),
        sma20=_clean_list(ta.sma(close, length=20).tolist()) if len(close) >= 20 else [],
        sma50=_clean_list(ta.sma(close, length=50).tolist()) if len(close) >= 50 else [],
        sma200=_clean_list(ta.sma(close, length=200).tolist()) if len(close) >= 200 else [],
        ema12=_clean_list(ta.ema(close, length=12).tolist()) if len(close) >= 12 else [],
        ema26=_clean_list(ta.ema(close, length=26).tolist()) if len(close) >= 26 else [],
        rsi=_clean_list(ta.rsi(close, length=14).tolist()),
        macd=_clean_list(macd_df["MACD_12_26_9"].tolist()) if macd_df is not None else [],
        macd_signal=_clean_list(macd_df["MACDs_12_26_9"].tolist()) if macd_df is not None else [],
        macd_hist=_clean_list(macd_df["MACDh_12_26_9"].tolist()) if macd_df is not None else [],
        bb_upper=_clean_list(bbands_df["BBU_20_2.0_2.0"].tolist()) if bbands_df is not None else [],
        bb_middle=_clean_list(bbands_df["BBM_20_2.0_2.0"].tolist()) if bbands_df is not None else [],
        bb_lower=_clean_list(bbands_df["BBL_20_2.0_2.0"].tolist()) if bbands_df is not None else [],
        atr=_clean_list(ta.atr(df["High"], df["Low"], df["Close"], length=14).tolist()),
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
    for symbol in data.symbols:
        ticker = yf.Ticker(symbol.upper())
        df = ticker.history(period=data.period, auto_adjust=True)
        
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
    current_user: User = Depends(get_current_user),
):
    try:
        from yfinance import search
        results = search(q)
        return [
            {"symbol": r["symbol"], "name": r.get("longName", r.get("shortName", "")),
             "exchange": r.get("exchange", "")}
            for r in results.get("quotes", [])[:10]
        ]
    except Exception:
        return []

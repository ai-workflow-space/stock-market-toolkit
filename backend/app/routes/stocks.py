from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from app.models import User
from app.schemas import (
    StockDataResponse,
    IndicatorsResponse,
    StockInfoResponse,
    FundamentalsResponse,
    DividendsResponse,
    YearlyDividend,
    CompareRequest,
    CompareResponse,
    CompareStockData,
)
from app.auth import get_current_user
from app.providers import market_provider, fundamentals_provider
import pandas as pd
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
    if period not in ("1d", "5d", "1w", "1mo", "3mo", "6mo", "1y", "2y", "5y", "max"):
        raise HTTPException(status_code=400, detail="Invalid period")

    interval_map = {"1d": "5m", "5d": "15m"}
    interval = interval_map.get(period, "1d")
    result = await market_provider.get_history(
        symbol.upper(), period=period, interval=interval
    )
    df = result.value

    if df.empty:
        raise HTTPException(status_code=404, detail=f"No data for {symbol}")

    return StockDataResponse(
        symbol=symbol.upper(),
        period=period,
        cached_at=datetime.utcnow().isoformat(),
        source=result.source,
        as_of=result.as_of,
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
    interval_map = {"1d": "5m", "5d": "15m"}
    interval = interval_map.get(period, "1d")
    result = await market_provider.get_history(
        symbol.upper(), period=period, interval=interval
    )
    df = result.value

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

    try:
        macd_df = ta.macd(close, fast=12, slow=26, signal=9)
        bbands_df = ta.bbands(close, length=20, std=2)
    except Exception:
        macd_df = None
        bbands_df = None

    rsi_vals = _safe_ta_series(ta.rsi, close, length=14)

    return IndicatorsResponse(
        symbol=symbol.upper(),
        period=period,
        cached_at=datetime.utcnow().isoformat(),
        timestamp=df.index.strftime("%Y-%m-%dT%H:%M:%S").tolist(),
        sma20=_clean_list(_safe_ta_series(ta.sma, close, length=20)),
        sma50=_clean_list(
            _safe_ta_series(ta.sma, close, length=50)
            if len(close) >= 50
            else [None] * len(close)
        ),
        sma200=_clean_list(
            _safe_ta_series(ta.sma, close, length=200)
            if len(close) >= 200
            else [None] * len(close)
        ),
        ema12=_clean_list(_safe_ta_series(ta.ema, close, length=12)),
        ema26=_clean_list(_safe_ta_series(ta.ema, close, length=26)),
        rsi=_clean_list(
            rsi_vals.tolist() if hasattr(rsi_vals, "tolist") else list(rsi_vals)
        ),
        macd=_clean_list(_df_col(macd_df, "MACD_12_26_9")),
        macd_signal=_clean_list(_df_col(macd_df, "MACDs_12_26_9")),
        macd_hist=_clean_list(_df_col(macd_df, "MACDh_12_26_9")),
        bb_upper=_clean_list(_df_col(bbands_df, "BBU_20_2.0_2.0")),
        bb_middle=_clean_list(_df_col(bbands_df, "BBM_20_2.0_2.0")),
        bb_lower=_clean_list(_df_col(bbands_df, "BBL_20_2.0_2.0")),
        atr=_clean_list(
            _safe_ta_series(ta.atr, df["High"], df["Low"], df["Close"], length=14)
        ),
    )


@router.get("/stock/{symbol}/info", response_model=StockInfoResponse)
async def get_stock_info(
    symbol: str,
    current_user: User = Depends(get_current_user),
):
    result = await market_provider.get_info(symbol.upper())
    info = result.value

    return StockInfoResponse(
        symbol=symbol.upper(),
        cached_at=datetime.utcnow().isoformat(),
        source=result.source,
        as_of=result.as_of,
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


def _fs_val(df: pd.DataFrame, row_name: str, col_idx: int = 0):
    """Extract a value from a financial statement DataFrame."""
    try:
        val = df.loc[row_name]
        if isinstance(val, pd.Series):
            if col_idx < len(val):
                v = val.iloc[col_idx]
                return v if pd.notna(v) else None
        return None
    except (KeyError, IndexError, TypeError):
        return None


@router.get("/stock/{symbol}/fundamentals", response_model=FundamentalsResponse)
async def get_fundamentals(
    symbol: str,
    current_user: User = Depends(get_current_user),
):
    income = await fundamentals_provider.get_income_statement(symbol.upper())
    balance = await fundamentals_provider.get_balance_sheet(symbol.upper())
    cashflow = await fundamentals_provider.get_cash_flow(symbol.upper())

    if income.empty or balance.empty:
        raise HTTPException(status_code=404, detail=f"No fundamentals data for {symbol}")

    f_score = 0

    ni_cur = _fs_val(income, "Net Income", 0)
    ni_prev = _fs_val(income, "Net Income", 1)
    rev_cur = _fs_val(income, "Total Revenue", 0)
    rev_prev = _fs_val(income, "Total Revenue", 1)
    gp_cur = _fs_val(income, "Gross Profit", 0)
    gp_prev = _fs_val(income, "Gross Profit", 1)
    oi_cur = _fs_val(income, "Operating Income", 0)
    eps_cur = _fs_val(income, "Diluted EPS", 0)
    eps_prev = _fs_val(income, "Diluted EPS", 1)

    ta_cur = _fs_val(balance, "Total Assets", 0)
    ta_prev = _fs_val(balance, "Total Assets", 1)
    tl_cur = _fs_val(balance, "Total Liabilities Net Minority Interest", 0)
    tl_prev = _fs_val(balance, "Total Liabilities Net Minority Interest", 1)
    ca_cur = _fs_val(balance, "Current Assets", 0)
    ca_prev = _fs_val(balance, "Current Assets", 1)
    cl_cur = _fs_val(balance, "Current Liabilities", 0)
    cl_prev = _fs_val(balance, "Current Liabilities", 1)
    eq_cur = _fs_val(balance, "Stockholders Equity", 0)

    cfo_cur = _fs_val(cashflow, "Operating Cash Flow", 0) if not cashflow.empty else None

    roa = round(ni_cur / ta_cur * 100, 2) if ni_cur and ta_cur else None
    roa_prev = round(ni_prev / ta_prev * 100, 2) if ni_prev and ta_prev else None
    roe = round(ni_cur / eq_cur * 100, 2) if ni_cur and eq_cur else None
    gross_margin = round(gp_cur / rev_cur * 100, 2) if gp_cur and rev_cur else None
    op_margin = round(oi_cur / rev_cur * 100, 2) if oi_cur and rev_cur else None
    net_margin = round(ni_cur / rev_cur * 100, 2) if ni_cur and rev_cur else None
    eps_growth = round((eps_cur - eps_prev) / abs(eps_prev) * 100, 2) if eps_cur and eps_prev and eps_prev != 0 else None
    rev_growth = round((rev_cur - rev_prev) / abs(rev_prev) * 100, 2) if rev_cur and rev_prev and rev_prev != 0 else None

    # Piotroski F-Score
    # 1. ROA > 0
    if roa and roa > 0:
        f_score += 1
    # 2. CFO > 0
    if cfo_cur and cfo_cur > 0:
        f_score += 1
    # 3. ROA improving
    if roa and roa_prev and roa > roa_prev:
        f_score += 1
    # 4. Accruals (CFO > NI)
    if cfo_cur and ni_cur and cfo_cur > ni_cur:
        f_score += 1
    # 5. Leverage ratio decreasing
    lv_cur = tl_cur / ta_cur if tl_cur and ta_cur else None
    lv_prev = tl_prev / ta_prev if tl_prev and ta_prev else None
    if lv_cur and lv_prev and lv_cur < lv_prev:
        f_score += 1
    # 6. Current ratio improving
    cr_cur = ca_cur / cl_cur if ca_cur and cl_cur else None
    cr_prev = ca_prev / cl_prev if ca_prev and cl_prev else None
    if cr_cur and cr_prev and cr_cur > cr_prev:
        f_score += 1
    # 7. No share dilution
    sh_cur = _fs_val(balance, "Ordinary Shares Number", 0)
    sh_prev = _fs_val(balance, "Ordinary Shares Number", 1)
    if sh_cur and sh_prev and sh_cur <= sh_prev:
        f_score += 1
    # 8. Gross margin improving
    gm_cur = gp_cur / rev_cur if gp_cur and rev_cur else None
    gm_prev = gp_prev / rev_prev if gp_prev and rev_prev else None
    if gm_cur and gm_prev and gm_cur > gm_prev:
        f_score += 1
    # 9. Asset turnover improving
    at_cur = rev_cur / ta_cur if rev_cur and ta_cur else None
    at_prev = rev_prev / ta_prev if rev_prev and ta_prev else None
    if at_cur and at_prev and at_cur > at_prev:
        f_score += 1

    return FundamentalsResponse(
        symbol=symbol.upper(),
        cached_at=datetime.utcnow().isoformat(),
        f_score=f_score,
        roe=roe,
        roa=roa,
        gross_margin=gross_margin,
        op_margin=op_margin,
        net_margin=net_margin,
        eps_growth=eps_growth,
        rev_growth=rev_growth,
    )


@router.get("/stock/{symbol}/dividends", response_model=DividendsResponse)
async def get_dividends(
    symbol: str,
    current_user: User = Depends(get_current_user),
):
    divs = await fundamentals_provider.get_dividends(symbol.upper())

    if divs.empty:
        return DividendsResponse(
            symbol=symbol.upper(),
            cached_at=datetime.utcnow().isoformat(),
            yearly=[],
            streak=0,
        )

    # Yearly totals
    yearly_totals = divs.groupby(divs.index.year).sum()
    yearly = [
        YearlyDividend(year=int(year), total=round(float(total), 4))
        for year, total in yearly_totals.items()
    ]
    yearly.sort(key=lambda y: y.year)

    # Consecutive streak (from latest year backwards)
    streak = 0
    if yearly:
        all_years = sorted(set(divs.index.year))
        latest = all_years[-1]
        y = latest
        while y in all_years:
            streak += 1
            y -= 1

    # Yield & payout ratio (using most recent year's total)
    latest_total = yearly[-1].total if yearly else 0
    yield_pct = None
    payout_ratio = None
    try:
        info = (await market_provider.get_info(symbol.upper())).value
        price = info.get("currentPrice") or info.get("regularMarketPrice")
        if price and latest_total:
            yield_pct = round(latest_total / price * 100, 2)
        eps = info.get("trailingEps")
        if eps and latest_total:
            payout_ratio = round(latest_total / eps * 100, 2)
    except Exception:
        pass

    return DividendsResponse(
        symbol=symbol.upper(),
        cached_at=datetime.utcnow().isoformat(),
        yearly=yearly,
        yield_pct=yield_pct,
        payout_ratio=payout_ratio,
        streak=streak,
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
        result = await market_provider.get_history(
            symbol.upper(), period=data.period, interval=int_interval
        )
        df = result.value

        if df.empty:
            raise HTTPException(status_code=404, detail=f"No data for {symbol}")

        stocks.append(
            CompareStockData(
                symbol=symbol.upper(),
                timestamp=df.index.strftime("%Y-%m-%dT%H:%M:%S").tolist(),
                close=_clean_list(df["Close"].tolist()),
                volume=[
                    int(v) if not (isinstance(v, float) and math.isnan(v)) else None
                    for v in df["Volume"].tolist()
                ],
            )
        )

    return CompareResponse(stocks=stocks)


@router.get("/search")
async def search_symbols(
    q: str = Query(..., min_length=1),
):
    try:
        import yfinance as yf

        def _do_search(max_results: int = 20) -> list:
            search_result = yf.Search(q, max_results=max_results)
            return search_result.quotes if search_result.quotes else []

        # First attempt with more results
        quotes = _do_search(20)

        # If too few results, retry once more (Yahoo Finance API can be inconsistent)
        if len(quotes) < 3:
            quotes = _do_search(20)

        # Filter for equity types, preferring TAI exchange for Taiwan stocks
        results = [
            {
                "symbol": r["symbol"],
                "name": r.get("longname", r.get("shortname", "")),
                "exchange": r.get("exchange", ""),
            }
            for r in quotes
            if r.get("symbol") and r.get("quoteType") in ("EQUITY", "ETF")
        ]

        # Boost TAI exchange results to top if present
        tai_results = [r for r in results if r["exchange"] == "TAI"]
        other_results = [r for r in results if r["exchange"] != "TAI"]
        return (tai_results + other_results)[:8]
    except Exception:
        return []

from fastapi import APIRouter, Depends, HTTPException, Query
import logging

from app.models import User
from app.auth import get_current_user
from app.providers import market_provider
import pandas_ta as ta
import math

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["analysis"])

CACHE_TTL = 300  # 5 minutes


def _clean(v):
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v


def _clean_list(lst):
    return [_clean(v) for v in lst]


async def _compute_analysis(symbol: str, period: str = "3mo") -> dict:
    """Get comprehensive technical analysis for a symbol (no auth dependency)."""
    interval_map = {"1d": "5m", "5d": "15m"}
    interval = interval_map.get(period, "1d")
    try:
        result = await market_provider.get_history(
            symbol.upper(), period=period, interval=interval
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=502, detail=f"Data provider unavailable for {symbol}"
        ) from exc
    df = result.value

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
    except Exception:
        macd_df = None

    rsi_vals = _safe_ta_series(ta.rsi, close, length=14)

    # ── Best Four Point signal computation ──────────────────────────────────
    latest_close = float(close.iloc[-1])
    n = len(close)

    # BIAS = (close - SMA20) / SMA20 * 100
    sma20_vals = ta.sma(close, length=20)
    latest_sma20 = float(sma20_vals.iloc[-1]) if sma20_vals.notna().any() else None
    bias = (
        _clean((latest_close - latest_sma20) / latest_sma20 * 100)
        if latest_sma20
        else None
    )

    # KDJ (stochastic)
    kdj_df = ta.stoch(high=df["High"], low=df["Low"], close=close, k=14, d=3)
    kdj_k_vals = kdj_df["STOCHk_14_3_3"].tolist() if kdj_df is not None else [None] * n
    kdj_d_vals = kdj_df["STOCHd_14_3_3"].tolist() if kdj_df is not None else [None] * n
    kdj_k = _clean(kdj_k_vals[-1])
    kdj_d = _clean(kdj_d_vals[-1])

    # MACD histogram (last value)
    macd_hist_list = _df_col(macd_df, "MACDh_12_26_9")
    macd_hist = (
        _clean(macd_hist_list[-1])
        if macd_hist_list and not isinstance(macd_hist_list[0], type(None))
        else None
    )

    # Volume ratio = volume / 20-day avg volume
    vol_series = df["Volume"]
    vol_avg = vol_series.rolling(20).mean()
    vol_ratio = (
        _clean(float(vol_series.iloc[-1] / vol_avg.iloc[-1]))
        if not math.isnan(vol_avg.iloc[-1])
        else None
    )

    # RSI latest
    rsi_vals_list = rsi_vals.tolist() if hasattr(rsi_vals, "tolist") else list(rsi_vals)
    latest_rsi = _clean(rsi_vals_list[-1]) if rsi_vals_list else None

    # ── Signal logic (inspired by twstock best_four_point) ──────────────────
    reasons = []
    score = 0.0

    if bias is not None and bias < -3:
        score += 0.25
        reasons.append(f"BIAS={bias:.1f} (< -3, oversold)")
    elif bias is not None and bias > 3:
        score -= 0.25
        reasons.append(f"BIAS={bias:.1f} (> +3, overbought)")

    if macd_hist is not None and macd_hist > 0:
        score += 0.25
        reasons.append(f"MACD hist positive ({macd_hist:.4f})")
    elif macd_hist is not None and macd_hist < 0:
        score -= 0.25
        reasons.append(f"MACD hist negative ({macd_hist:.4f})")

    if kdj_k is not None and kdj_d is not None:
        if kdj_k > kdj_d:
            score += 0.25
            reasons.append(f"KDJ golden cross (K={kdj_k:.1f} > D={kdj_d:.1f})")
        else:
            score -= 0.25
            reasons.append(f"KDJ death cross (K={kdj_k:.1f} < D={kdj_d:.1f})")

    if vol_ratio is not None and vol_ratio > 1.2:
        if score > 0:
            score += 0.25
            reasons.append(f"Volume surge ({vol_ratio:.2f}x avg)")
        elif score < 0:
            score -= 0.25
            reasons.append(f"High volume selling ({vol_ratio:.2f}x avg)")

    confidence = min(abs(score), 1.0)

    if score >= 0.75:
        signal = "BUY"
    elif score <= -0.75:
        signal = "SELL"
    else:
        signal = "NEUTRAL"

    return {
        "symbol": symbol.upper(),
        "period": period,
        "signal": signal,
        "confidence": round(confidence, 2),
        "reasons": reasons,
        "price": round(latest_close, 2),
        "timestamp": df.index[-1].isoformat() if len(df) > 0 else None,
        "indicators": {
            "bias": bias,
            "kdj_k": kdj_k,
            "kdj_d": kdj_d,
            "volume_ratio": vol_ratio,
            "macd_histogram": macd_hist,
            "rsi": latest_rsi,
            "sma20": _clean(latest_sma20),
            "sma50": _clean(
                float(ta.sma(close, length=50).iloc[-1]) if len(close) >= 50 else None
            ),
        },
    }


@router.get("/analysis/signals")
async def get_batch_signals(
    symbols: str = Query(..., description="Comma-separated list of symbols (max 25)"),
    period: str = Query("1mo"),
    current_user: User = Depends(get_current_user),
):
    """Get signals for multiple symbols.

    Returns ``{"signals": [...], "errors": [{"symbol", "error"}]}`` so the
    caller can surface a reason for symbols whose analysis failed instead of
    silently dropping them.
    """
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    if len(symbol_list) > 25:
        raise HTTPException(status_code=400, detail="Maximum 25 symbols allowed")
    results: list[dict] = []
    errors: list[dict] = []
    for sym in symbol_list:
        try:
            results.append(await _compute_analysis(sym, period))
        except HTTPException as exc:
            errors.append({"symbol": sym, "error": exc.detail})
        except Exception as exc:  # noqa: BLE001
            log.warning("analysis failed for %s: %s", sym, exc)
            errors.append({"symbol": sym, "error": "analysis failed"})
    return {"signals": results, "errors": errors}


@router.get("/analysis/{symbol}")
async def get_analysis(
    symbol: str,
    period: str = Query("3mo"),
    current_user: User = Depends(get_current_user),
):
    """Get comprehensive technical analysis for a symbol."""
    return await _compute_analysis(symbol, period)

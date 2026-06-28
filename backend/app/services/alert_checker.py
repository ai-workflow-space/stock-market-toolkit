"""
Alert checker service - runs periodically to check price alerts and send notifications.
"""

from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import logging
import math
import httpx

from app.database import AsyncSessionLocal
import yfinance as yf
from app.models import (
    Alert,
    AlertCondition,
    NotificationSettings,
    TriggeredAlert,
    NotificationDelivery,
    SmtpSettings,
)
from app.providers import market_provider
from app.services.cache import cached, cache_key
from app.services.mailer import send_email

log = logging.getLogger(__name__)

COOLDOWN_MINUTES = 60
DISCORD_COLOR_ABOVE = 5763719  # green
DISCORD_COLOR_BELOW = 15548905  # red

# yfinance period mapping for short intervals
PERIOD_MAP = {
    "5m": ("5d", "5m"),
    "15m": ("5d", "15m"),
    "30m": ("5d", "30m"),
    "1h": ("1mo", "1h"),
    "4h": ("1mo", "4h"),
    "1d": ("1y", "1d"),
}

CONDITION_LABELS = {
    "above": "🔼 Above",
    "below": "🔽 Below",
    "pct_change_up": "📈 +% Up",
    "pct_change_down": "📉 -% Down",
}


def _build_email_body(
    symbol: str,
    alert: Alert,
    current_price: float,
    triggered_at: datetime,
) -> str:
    condition_label = CONDITION_LABELS.get(alert.condition_type, alert.condition_type)
    threshold_str = (
        f"${alert.threshold:.2f}"
        if alert.condition_type in ("above", "below")
        else f"{alert.threshold:.1f}%"
    )
    return f"""<h2>Price Alert Triggered</h2>
<p><b>Symbol:</b> {symbol}</p>
<p><b>Condition:</b> {condition_label}</p>
<p><b>Current Price:</b> ${current_price:.2f}</p>
<p><b>Threshold:</b> {threshold_str}</p>
<p><b>Triggered At:</b> {triggered_at.strftime("%Y-%m-%d %H:%M UTC")}</p>
<hr>
<p>View and manage your alerts at <a href="https://stock-toolkit.app/alerts">stock-toolkit.app</a>.</p>"""


def _clean(v):
    """Replace NaN/inf with None."""
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v


async def _get_current_price(symbol: str, period: str) -> float | None:
    """Fetch current/recent price for a symbol using specified period."""
    if period not in PERIOD_MAP:
        period = "1h"
    hist_period, interval = PERIOD_MAP[period]

    try:
        result = await market_provider.get_history(
            symbol, period=hist_period, interval=interval
        )
        df = result.value
        if df.empty:
            return None
        return float(df["Close"].iloc[-1])
    except Exception as e:
        log.warning(f"Failed to fetch price for {symbol}: {e}")
        return None


async def _get_period_start_price(symbol: str, period: str) -> float | None:
    """Get price at the start of the period for percentage change calculation."""
    if period not in PERIOD_MAP:
        period = "1h"
    hist_period, interval = PERIOD_MAP[period]

    try:
        result = await market_provider.get_history(
            symbol, period=hist_period, interval=interval
        )
        df = result.value
        if df.empty or len(df) < 2:
            return None
        return float(df["Close"].iloc[0])
    except Exception as e:
        log.warning(f"Failed to fetch period start price for {symbol}: {e}")
        return None


async def _get_ohlcv_df(symbol: str, period: str):
    """Fetch OHLCV dataframe for a symbol, cached via BE-2."""
    if period not in PERIOD_MAP:
        period = "1h"
    hist_period, interval = PERIOD_MAP[period]

    async def _load():
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=hist_period, interval=interval, auto_adjust=True)
        return df

    key = cache_key("ohlcv", symbol, period)
    return await cached(key, ttl=120, loader=_load)


async def _get_indicators(symbol: str, period: str) -> dict:
    """Fetch latest indicator values for a symbol, cached via BE-2."""
    async def _load():
        import pandas_ta as ta
        df = await _get_ohlcv_df(symbol, period)
        result = {"price": None, "rsi": None, "macd_hist": None, "macd_signal": None, "pct_change": None}
        if df.empty:
            return result

        close = df["Close"]
        price = float(close.iloc[-1])
        result["price"] = price

        if len(close) >= 14:
            rsi_series = ta.rsi(close, length=14)
            if rsi_series is not None and not rsi_series.empty:
                result["rsi"] = float(rsi_series.iloc[-1])

        if len(close) >= 26:
            macd_df = ta.macd(close, fast=12, slow=26, signal=9)
            if macd_df is not None and not macd_df.empty:
                result["macd_hist"] = _clean(float(macd_df["MACDh_12_26_9"].iloc[-1]))
                result["macd_signal"] = _clean(float(macd_df["MACDs_12_26_9"].iloc[-1]))

        if len(close) >= 2:
            pct = ((float(close.iloc[-1]) - float(close.iloc[0])) / float(close.iloc[0])) * 100
            result["pct_change"] = pct

        return result

    key = cache_key("indicators", symbol, period)
    return await cached(key, ttl=120, loader=_load)


def _evaluate_condition(condition: AlertCondition, indicators: dict) -> bool:
    """Evaluate a single AlertCondition against current indicator values."""
    metric = condition.metric
    op = condition.operator
    value = condition.value

    current_val = indicators.get(metric)
    if current_val is None:
        return False

    if op == "gt":
        return current_val > value
    elif op == "lt":
        return current_val < value
    elif op == "eq":
        return abs(current_val - value) < 0.001
    elif op == "crosses_above":
        # Check if current > value (already satisfied for crossing)
        # For a proper cross check we'd need previous value too
        return current_val > value
    return False


def _should_trigger(
    condition_type: str,
    current_price: float,
    threshold: float,
    period_start_price: float | None,
) -> bool:
    """Check if legacy alert condition is met."""
    if condition_type == "above":
        return current_price > threshold
    elif condition_type == "below":
        return current_price < threshold
    elif condition_type == "pct_change_up":
        if period_start_price is None or period_start_price == 0:
            return False
        pct_change = ((current_price - period_start_price) / period_start_price) * 100
        return pct_change > threshold
    elif condition_type == "pct_change_down":
        if period_start_price is None or period_start_price == 0:
            return False
        pct_change = ((current_price - period_start_price) / period_start_price) * 100
        return pct_change < -threshold
    return False


def _check_multi_condition(alert: Alert, indicators: dict) -> bool:
    """Evaluate all conditions of an alert using its combinator."""
    conditions = alert.conditions or []
    if not conditions:
        return False

    combinator = alert.combinator or "all"
    results = [_evaluate_condition(c, indicators) for c in conditions]

    if combinator == "all":
        return all(results)
    else:
        return any(results)


def _build_discord_embed(
    symbol: str | None,
    condition_type: str | None,
    current_price: float | None,
    threshold: float | None,
    triggered_at: datetime | None,
    pct_change_today: float | None,
) -> dict:
    """Build a Discord embed dict. When symbol is None, builds a test notification embed."""
    if symbol is None:
        return {
            "title": "🔔 Test notification",
            "description": "Your Discord webhook is configured correctly.",
            "color": 0x2ECC71,
            "url": "https://stock-toolkit.app/alerts",
        }

    color = DISCORD_COLOR_ABOVE if condition_type == "above" else DISCORD_COLOR_BELOW
    emoji = "🔔"
    condition_label = CONDITION_LABELS.get(condition_type, condition_type)
    threshold_str = (
        f"${threshold:.2f}"
        if condition_type in ("above", "below")
        else f"{threshold:.1f}%"
    )
    price_str = f"${current_price:.2f}"

    if pct_change_today is not None:
        price_change_str = f"({pct_change_today:+.1f}% today)"
    else:
        price_change_str = ""

    return {
        "title": f"{emoji} Price Alert: {symbol} {condition_label}",
        "description": f"Current price: {price_str} {price_change_str}",
        "color": color,
        "fields": [
            {"name": "Condition", "value": condition_type, "inline": True},
            {"name": "Threshold", "value": threshold_str, "inline": True},
            {
                "name": "Triggered At",
                "value": triggered_at.strftime("%Y-%m-%d %H:%M UTC"),
                "inline": True,
            },
        ],
        "url": "https://stock-toolkit.app/alerts",
    }


async def _send_discord_notification(
    webhook_url: str,
    symbol: str | None = None,
    condition_type: str | None = None,
    current_price: float | None = None,
    threshold: float | None = None,
    triggered_at: datetime | None = None,
    pct_change_today: float | None = None,
) -> tuple[bool, int | None, str | None]:
    """Send notification to Discord webhook. Returns (success, http_status, error)."""
    embed = _build_discord_embed(
        symbol, condition_type, current_price, threshold, triggered_at, pct_change_today
    )

    if symbol is None:
        payload = {"content": "🔔 **Test notification**", "embeds": [embed]}
    else:
        condition_label = CONDITION_LABELS.get(condition_type, condition_type)
        payload = {"content": "🔔 **Price Alert Triggered**", "embeds": [embed]}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(webhook_url, json=payload)
            if resp.status_code >= 200 and resp.status_code < 300:
                log.info(f"Discord notification sent (symbol={symbol or 'test'})")
                return (True, resp.status_code, None)
            else:
                log.warning(
                    f"Discord notification failed (symbol={symbol or 'test'}): {resp.status_code}"
                )
                return (False, resp.status_code, f"HTTP {resp.status_code}")
    except Exception as e:
        log.error(f"Failed to send Discord notification: {e}")
        return (False, None, str(e))


async def check_alerts():
    """
    Main function to check all enabled alerts and trigger notifications.
    Called by the cron job every 15 minutes.
    """
    log.info("Starting alert check...")

    async with AsyncSessionLocal() as db:
        # Fetch all enabled alerts with their notification settings
        result = await db.execute(
            select(Alert, NotificationSettings)
            .options(selectinload(Alert.conditions))
            .join(
                NotificationSettings,
                Alert.user_id == NotificationSettings.user_id,
                isouter=True,
            )
            .where(Alert.enabled)
        )
        rows = result.all()

        if not rows:
            log.info("No enabled alerts to check")
            return

        log.info(f"Checking {len(rows)} enabled alerts")

        # Group alerts by symbol for batch fetching
        symbol_alerts: dict[str, list[tuple[Alert, NotificationSettings | None]]] = {}
        for alert, settings in rows:
            sym = alert.symbol.upper()
            if sym not in symbol_alerts:
                symbol_alerts[sym] = []
            symbol_alerts[sym].append((alert, settings))

        # Process each symbol's alerts
        now = datetime.now(timezone.utc)
        for symbol, alert_settings_list in symbol_alerts.items():
            current_price = await _get_current_price(symbol, "1h")
            if current_price is None:
                log.warning(f"Could not fetch price for {symbol}, skipping")
                continue

            # Fetch indicators once per symbol for multi-condition alerts
            has_multi = any(a.conditions for a, _ in alert_settings_list)
            indicators = None
            if has_multi:
                # Use the shortest period among multi-condition alerts
                period = "1h"
                for a, _ in alert_settings_list:
                    if a.conditions:
                        period = a.period
                        break
                indicators = await _get_indicators(symbol, period)

            # Get period start prices for pct_change alerts
            period_prices: dict[str, float | None] = {}
            pct_change_alerts = [
                (a, s)
                for a, s in alert_settings_list
                if a.condition_type in ("pct_change_up", "pct_change_down")
            ]
            if pct_change_alerts:
                for alert, _ in pct_change_alerts:
                    if alert.period not in period_prices:
                        period_prices[alert.period] = await _get_period_start_price(
                            symbol, alert.period
                        )

            for alert, settings in alert_settings_list:
                try:
                    # Check cooldown
                    if alert.cooldown_until and alert.cooldown_until > now:
                        continue

                    # Check if alert should trigger
                    triggered = False
                    trigger_condition_type = alert.condition_type
                    trigger_threshold = alert.threshold

                    if alert.conditions:
                        # Multi-condition evaluation
                        triggered = _check_multi_condition(alert, indicators)
                    else:
                        # Legacy single-condition evaluation
                        period_start_price = None
                        if alert.condition_type in ("pct_change_up", "pct_change_down"):
                            period_start_price = period_prices.get(alert.period)

                        triggered = _should_trigger(
                            alert.condition_type,
                            current_price,
                            alert.threshold,
                            period_start_price,
                        )

                    if triggered:
                        # Create triggered alert record
                        triggered_record = TriggeredAlert(
                            alert_id=alert.id,
                            user_id=alert.user_id,
                            symbol=symbol,
                            condition_type=trigger_condition_type,
                            trigger_price=current_price,
                            threshold_value=trigger_threshold,
                            notified=False,
                            read=False,
                        )
                        db.add(triggered_record)

                        # Set cooldown
                        alert.cooldown_until = now + timedelta(minutes=COOLDOWN_MINUTES)

                        # Send notifications if settings exist and are enabled
                        delivery_records = []
                        if settings:
                            if (
                                settings.discord_enabled
                                and settings.discord_webhook_url
                            ):
                                (
                                    success,
                                    http_status,
                                    error,
                                ) = await _send_discord_notification(
                                    settings.discord_webhook_url,
                                    symbol,
                                    trigger_condition_type,
                                    current_price,
                                    trigger_threshold,
                                    now,
                                )
                                delivery_records.append(
                                    NotificationDelivery(
                                        triggered_alert_id=None,  # filled after flush
                                        user_id=alert.user_id,
                                        channel="discord",
                                        status="success" if success else "failed",
                                        http_status=http_status,
                                        error=error,
                                    )
                                )
                                if success:
                                    triggered_record.notified = True
                            # Email notification
                            if (
                                settings.email_enabled
                                and settings.email_address
                            ):
                                smtp_cfg = await db.get(SmtpSettings, 1)
                                if smtp_cfg and smtp_cfg.host:
                                    email_body = _build_email_body(
                                        symbol, alert, current_price, now
                                    )
                                    email_success = await send_email(
                                        smtp_cfg,
                                        settings.email_address,
                                        f"Price Alert: {symbol}",
                                        html_body=email_body,
                                    )
                                    delivery_records.append(
                                        NotificationDelivery(
                                            triggered_alert_id=None,
                                            user_id=alert.user_id,
                                            channel="email",
                                            status="success" if email_success else "failed",
                                            error=None if email_success else "Email send failed",
                                        )
                                    )
                                    if email_success:
                                        triggered_record.notified = True

                        # Flush to get triggered_record.id, then link deliveries
                        await db.flush()
                        for dr in delivery_records:
                            dr.triggered_alert_id = triggered_record.id
                            db.add(dr)

                        await db.commit()
                        log.info(
                            f"Alert triggered: {symbol} {trigger_condition_type} at ${current_price:.2f}"
                        )

                except Exception as e:
                    log.error(f"Error processing alert {alert.id}: {e}")
                    await db.rollback()

        log.info("Alert check completed")


async def check_alerts_endpoint():
    """Synchronous wrapper for calling check_alerts from an API endpoint."""
    await check_alerts()
    return {"status": "ok", "message": "Alerts checked"}


if __name__ == "__main__":
    import asyncio

    asyncio.run(check_alerts())

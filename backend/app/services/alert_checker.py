"""
Alert checker service - runs periodically to check price alerts and send notifications.
"""
import yfinance as yf
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
import logging
import math
import httpx

from app.database import AsyncSessionLocal
from app.models import Alert, NotificationSettings, TriggeredAlert

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
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=hist_period, interval=interval, auto_adjust=True)
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
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=hist_period, interval=interval, auto_adjust=True)
        if df.empty or len(df) < 2:
            return None
        return float(df["Close"].iloc[0])
    except Exception as e:
        log.warning(f"Failed to fetch period start price for {symbol}: {e}")
        return None


def _should_trigger(
    condition_type: str,
    current_price: float,
    threshold: float,
    period_start_price: float | None,
) -> bool:
    """Check if alert condition is met."""
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


async def _send_discord_notification(
    webhook_url: str,
    symbol: str,
    condition_type: str,
    current_price: float,
    threshold: float,
    triggered_at: datetime,
    pct_change_today: float | None = None,
):
    """Send notification to Discord webhook."""
    color = DISCORD_COLOR_ABOVE if condition_type == "above" else DISCORD_COLOR_BELOW
    emoji = "🔔"
    condition_label = CONDITION_LABELS.get(condition_type, condition_type)
    threshold_str = f"${threshold:.2f}" if condition_type in ("above", "below") else f"{threshold:.1f}%"
    price_str = f"${current_price:.2f}"
    
    if pct_change_today is not None:
        price_change_str = f"({pct_change_today:+.1f}% today)"
    else:
        price_change_str = ""

    embed = {
        "title": f"{emoji} Price Alert: {symbol} {condition_label}",
        "description": f"Current price: {price_str} {price_change_str}",
        "color": color,
        "fields": [
            {"name": "Condition", "value": condition_type, "inline": True},
            {"name": "Threshold", "value": threshold_str, "inline": True},
            {"name": "Triggered At", "value": triggered_at.strftime("%Y-%m-%d %H:%M UTC"), "inline": True},
        ],
        "url": "https://stock-toolkit.app/alerts",
    }

    payload = {"content": f"{emoji} **Price Alert Triggered**", "embeds": [embed]}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(webhook_url, json=payload)
            log.info(f"Discord notification sent for {symbol} alert")
    except Exception as e:
        log.error(f"Failed to send Discord notification: {e}")


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
            .join(NotificationSettings, Alert.user_id == NotificationSettings.user_id, isouter=True)
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

            # Get period start prices for pct_change alerts
            period_prices: dict[str, float | None] = {}
            pct_change_alerts = [
                (a, s) for a, s in alert_settings_list
                if a.condition_type in ("pct_change_up", "pct_change_down")
            ]
            if pct_change_alerts:
                # Fetch period start for each unique period
                for alert, _ in pct_change_alerts:
                    if alert.period not in period_prices:
                        period_prices[alert.period] = await _get_period_start_price(symbol, alert.period)

            for alert, settings in alert_settings_list:
                try:
                    # Check cooldown
                    if alert.cooldown_until and alert.cooldown_until > now:
                        continue

                    # Determine period start price for pct_change
                    period_start_price = None
                    if alert.condition_type in ("pct_change_up", "pct_change_down"):
                        period_start_price = period_prices.get(alert.period)

                    # Check if alert should trigger
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
                            condition_type=alert.condition_type,
                            trigger_price=current_price,
                            threshold_value=alert.threshold,
                            notified=False,
                            read=False,
                        )
                        db.add(triggered_record)

                        # Set cooldown
                        alert.cooldown_until = now + timedelta(minutes=COOLDOWN_MINUTES)

                        # Send notifications if settings exist and are enabled
                        if settings:
                            if settings.discord_enabled and settings.discord_webhook_url:
                                await _send_discord_notification(
                                    settings.discord_webhook_url,
                                    symbol,
                                    alert.condition_type,
                                    current_price,
                                    alert.threshold,
                                    now,
                                )
                                triggered_record.notified = True
                            # Email notification could be added here

                        await db.commit()
                        log.info(f"Alert triggered: {symbol} {alert.condition_type} at ${current_price:.2f}")

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
"""
Discord notification delivery for alert triggers.
"""

from datetime import datetime
import logging

import httpx

log = logging.getLogger(__name__)

DISCORD_COLOR_ABOVE = 5763719  # green
DISCORD_COLOR_BELOW = 15548905  # red

CONDITION_LABELS = {
    "above": "🔼 Above",
    "below": "🔽 Below",
    "pct_change_up": "📈 +% Up",
    "pct_change_down": "📉 -% Down",
}


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
        # Test notification
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
        # Test notification - simple text content
        payload = {"content": "🔔 **Test notification**", "embeds": [embed]}
    else:
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
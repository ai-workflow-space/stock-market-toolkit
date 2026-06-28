#!/usr/bin/env python3
"""Apply the three targeted changes for the Discord test endpoint."""

import sys

# ─── 1. Update schemas.py ────────────────────────────────────────────────────
schemas_path = '/home/kyle/projects/stock-market-toolkit/backend/app/schemas.py'
content = open(schemas_path).read()

old_schemas = '''class SmtpTestRequest(BaseModel):
    to_email: EmailStr


class SmtpTestResponse(BaseModel):
    success: bool
    message: str'''

new_schemas = old_schemas + '''


# ─── Notification test schemas ───
class DiscordTestRequest(BaseModel):
    webhook_url: str = Field(..., min_length=1)'''

assert old_schemas in content, 'schemas old string not found'
content = content.replace(old_schemas, new_schemas, 1)
open(schemas_path, 'w').write(content)
assert 'DiscordTestRequest' in open(schemas_path).read()
print('1. schemas.py: DiscordTestRequest added')

# ─── 2. Update alert_checker.py ──────────────────────────────────────────────
checker_path = '/home/kyle/projects/stock-market-toolkit/backend/app/services/alert_checker.py'
content = open(checker_path).read()

old_func = '''async def _send_discord_notification(
    webhook_url: str,
    symbol: str,
    condition_type: str,
    current_price: float,
    threshold: float,
    triggered_at: datetime,
    pct_change_today: float | None = None,
) -> tuple[bool, int | None, str | None]:
    """Send notification to Discord webhook. Returns (success, http_status, error)."""
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

    embed = {
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

    payload = {"content": f"{emoji} **Price Alert Triggered**", "embeds": [embed]}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(webhook_url, json=payload)
            if resp.status_code >= 200 and resp.status_code < 300:
                log.info(f"Discord notification sent for {symbol} alert")
                return (True, resp.status_code, None)
            else:
                log.warning(
                    f"Discord notification failed for {symbol}: {resp.status_code}"
                )
                return (False, resp.status_code, f"HTTP {resp.status_code}")
    except Exception as e:
        log.error(f"Failed to send Discord notification: {e}")
        return (False, None, str(e))'''

new_func = '''def _build_discord_embed(
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
        return (False, None, str(e))'''

assert old_func in content, 'alert_checker old func not found'
content = content.replace(old_func, new_func, 1)
open(checker_path, 'w').write(content)
assert '_build_discord_embed' in open(checker_path).read()
print('2. alert_checker.py: refactored with _build_discord_embed helper')

# ─── 3. Update alerts.py ─────────────────────────────────────────────────────
alerts_path = '/home/kyle/projects/stock-market-toolkit/backend/app/routes/alerts.py'
content = open(alerts_path).read()

# Add DiscordTestRequest to imports
old_import = '''from app.schemas import (
    AlertCreate,
    AlertUpdate,
    AlertResponse,
    TriggeredAlertResponse,
    NotificationSettingsResponse,
    NotificationSettingsUpdate,
    NotificationDeliveryResponse,
)'''
new_import = old_import.replace(
    'NotificationDeliveryResponse,',
    'NotificationDeliveryResponse,\n    DiscordTestRequest,'
)
assert old_import in content, 'alerts import not found'
content = content.replace(old_import, new_import, 1)

# Add new endpoint before @router.put("/settings", ...)
old_settings = '''
@router.put("/settings", response_model=NotificationSettingsResponse)'''
new_with_endpoint = '''
@router.post("/notifications/test-discord")
async def test_discord_webhook(
    data: DiscordTestRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a test Discord webhook notification to verify the webhook URL."""
    from app.services.alert_checker import _send_discord_notification

    success, status, error = await _send_discord_notification(
        webhook_url=data.webhook_url
    )
    if not success:
        raise HTTPException(status_code=400, detail=error or "Discord webhook test failed")
    return {"ok": True}


@router.put("/settings", response_model=NotificationSettingsResponse)'''

assert old_settings in content, 'settings route not found'
content = content.replace(old_settings, new_with_endpoint, 1)
open(alerts_path, 'w').write(content)

# Verify
c = open(alerts_path).read()
assert 'DiscordTestRequest' in c
assert '/notifications/test-discord' in c
print('3. alerts.py: endpoint added')

print('\nAll changes applied successfully')
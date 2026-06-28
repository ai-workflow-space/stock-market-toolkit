from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone

from app.database import get_db
from app.models import (
    User,
    Alert,
    AlertCondition,
    NotificationSettings,
    TriggeredAlert,
    NotificationDelivery,
)
from app.schemas import (
    AlertCreate,
    AlertUpdate,
    AlertResponse,
    TriggeredAlertResponse,
    NotificationSettingsResponse,
    NotificationSettingsUpdate,
    NotificationDeliveryResponse,
    DiscordTestRequest,
)
from app.auth import get_current_user

router = APIRouter(prefix="/api/alerts", tags=["alerts"])

MAX_ALERTS_PER_USER = 50


def _condition_label(ct: str) -> str:
    labels = {
        "above": "🔼 Above",
        "below": "🔽 Below",
        "pct_change_up": "📈 +% Up",
        "pct_change_down": "📉 -% Down",
    }
    return labels.get(ct, ct)


@router.post("", response_model=AlertResponse, status_code=201)
async def create_alert(
    data: AlertCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check max alerts limit
    result = await db.execute(
        select(func.count(Alert.id)).where(Alert.user_id == current_user.id)
    )
    count = result.scalar() or 0
    if count >= MAX_ALERTS_PER_USER:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum of {MAX_ALERTS_PER_USER} alerts per user reached",
        )

    conditions = data.conditions or []

    if conditions:
        alert = Alert(
            user_id=current_user.id,
            symbol=data.symbol.upper(),
            symbol_name=data.symbol_name,
            condition_type="multi",
            threshold=data.threshold or 0.0,
            period=data.period,
            combinator=data.combinator,
            enabled=True,
        )
        db.add(alert)
        await db.flush()
        for c in conditions:
            db.add(
                AlertCondition(
                    alert_id=alert.id,
                    metric=c.metric,
                    operator=c.operator,
                    value=c.value,
                )
            )
    else:
        alert = Alert(
            user_id=current_user.id,
            symbol=data.symbol.upper(),
            symbol_name=data.symbol_name,
            condition_type=data.condition_type,
            threshold=data.threshold,
            period=data.period,
            combinator=data.combinator,
            enabled=True,
        )
        db.add(alert)

    await db.commit()
    await db.refresh(alert)
    return alert


@router.get("", response_model=list[AlertResponse])
async def list_alerts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Alert)
        .options(selectinload(Alert.conditions))
        .where(Alert.user_id == current_user.id)
        .order_by(Alert.created_at.desc())
    )
    return result.scalars().all()


@router.get("/triggered", response_model=list[TriggeredAlertResponse])
async def list_triggered_alerts(
    unread_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(TriggeredAlert).where(TriggeredAlert.user_id == current_user.id)
    if unread_only:
        query = query.where(~TriggeredAlert.read)
    query = query.order_by(TriggeredAlert.triggered_at.desc())

    result = await db.execute(query)
    return result.scalars().all()


@router.patch("/triggered/{alert_id}/read", response_model=TriggeredAlertResponse)
async def mark_triggered_alert_read(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TriggeredAlert).where(
            TriggeredAlert.id == alert_id,
            TriggeredAlert.user_id == current_user.id,
        )
    )
    triggered = result.scalar_one_or_none()
    if not triggered:
        raise HTTPException(status_code=404, detail="Triggered alert not found")

    triggered.read = True
    await db.commit()
    await db.refresh(triggered)
    return triggered


@router.get("/settings", response_model=NotificationSettingsResponse)
async def get_notification_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(NotificationSettings).where(
            NotificationSettings.user_id == current_user.id
        )
    )
    settings = result.scalar_one_or_none()
    if not settings:
        # Return defaults
        return NotificationSettingsResponse(
            user_id=current_user.id,
            discord_webhook_url=None,
            email_address=None,
            email_enabled=False,
            discord_enabled=True,
            default_period="1h",
            timezone="UTC",
        )
    return settings


MAX_DELIVERIES_PER_USER = 100


@router.get("/deliveries", response_model=list[NotificationDeliveryResponse])
async def list_deliveries(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List recent notification delivery attempts, newest first."""
    result = await db.execute(
        select(NotificationDelivery)
        .where(NotificationDelivery.user_id == current_user.id)
        .order_by(NotificationDelivery.created_at.desc())
        .limit(limit)
    )
    return result.scalars().all()


@router.post("/deliveries/{delivery_id}/resend", status_code=202)
async def resend_notification(
    delivery_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Re-trigger the alert associated with a delivery attempt."""
    result = await db.execute(
        select(NotificationDelivery).where(
            NotificationDelivery.id == delivery_id,
            NotificationDelivery.user_id == current_user.id,
        )
    )
    delivery = result.scalar_one_or_none()
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")

    # Re-trigger by calling check_alerts for this specific alert
    from app.services.alert_checker import check_alerts_endpoint

    await check_alerts_endpoint()
    return {"status": "ok", "message": "Resend triggered"}


@router.post("/notifications/test-discord")
async def test_discord_webhook(
    data: DiscordTestRequest,
    current_user: User = Depends(get_current_user),
):
    """Send a test Discord webhook notification to verify the webhook URL."""
    from app.services.alert_checker import _send_discord_notification

    success, status, error = await _send_discord_notification(
        webhook_url=data.webhook_url
    )
    if not success:
        raise HTTPException(status_code=400, detail=error or "Discord webhook test failed")
    return {"ok": True}


@router.put("/settings", response_model=NotificationSettingsResponse)
async def update_notification_settings(
    data: NotificationSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(NotificationSettings).where(
            NotificationSettings.user_id == current_user.id
        )
    )
    settings = result.scalar_one_or_none()

    if settings:
        if data.discord_webhook_url is not None:
            settings.discord_webhook_url = data.discord_webhook_url
        if data.email_address is not None:
            settings.email_address = data.email_address
        settings.email_enabled = data.email_enabled
        settings.discord_enabled = data.discord_enabled
        settings.default_period = data.default_period
        settings.timezone = data.timezone
        settings.updated_at = datetime.now(timezone.utc)
    else:
        settings = NotificationSettings(
            user_id=current_user.id,
            discord_webhook_url=data.discord_webhook_url,
            email_address=data.email_address,
            email_enabled=data.email_enabled,
            discord_enabled=data.discord_enabled,
            default_period=data.default_period,
            timezone=data.timezone,
        )
        db.add(settings)

    await db.commit()
    await db.refresh(settings)
    return settings


@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Alert)
        .options(selectinload(Alert.conditions))
        .where(Alert.id == alert_id, Alert.user_id == current_user.id)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.patch("/{alert_id}", response_model=AlertResponse)
async def update_alert(
    alert_id: int,
    data: AlertUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Alert).where(Alert.id == alert_id, Alert.user_id == current_user.id)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    if data.symbol is not None:
        alert.symbol = data.symbol.upper()
    if data.condition_type is not None:
        alert.condition_type = data.condition_type
    if data.threshold is not None:
        alert.threshold = data.threshold
    if data.period is not None:
        alert.period = data.period
    if data.enabled is not None:
        alert.enabled = data.enabled

    await db.commit()
    await db.refresh(alert)
    # Reload with conditions for response
    result = await db.execute(
        select(Alert)
        .options(selectinload(Alert.conditions))
        .where(Alert.id == alert.id)
    )
    alert = result.scalar_one()
    return alert
    return alert


@router.delete("/{alert_id}", status_code=204)
async def delete_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Alert).where(Alert.id == alert_id, Alert.user_id == current_user.id)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    await db.delete(alert)
    await db.commit()

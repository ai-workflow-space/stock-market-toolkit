from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone, timedelta
import secrets
from app.models import User, InviteCode, SmtpSettings
from app.database import get_db
from app.schemas import (
    InviteCodeCreate,
    InviteCodeResponse,
    InviteCodeListResponse,
    SmtpSettingsResponse,
    SmtpSettingsUpdate,
    SmtpTestRequest,
    SmtpTestResponse,
)
from app.auth import require_admin
from app.utils.crypto import encrypt
from app.services.mailer import send_test_email

router = APIRouter(prefix="/api/admin", tags=["admin"])


def generate_code() -> str:
    """Generate a secure random invite code."""
    return secrets.token_urlsafe(16)


@router.post("/invite-codes", response_model=InviteCodeResponse, status_code=201)
async def create_invite_code(
    data: InviteCodeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Generate a new invitation code. Requires authentication."""
    expires_at = datetime.now(timezone.utc) + timedelta(days=data.expires_in_days)

    invite = InviteCode(
        code=generate_code(),
        created_by=current_user.id,
        expires_at=expires_at,
        is_active=True,
    )
    db.add(invite)
    await db.commit()
    await db.refresh(invite)
    return invite


@router.get("/invite-codes", response_model=InviteCodeListResponse)
async def list_invite_codes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """List all invitation codes. Requires authentication."""
    result = await db.execute(select(InviteCode).order_by(InviteCode.created_at.desc()))
    codes = result.scalars().all()

    return InviteCodeListResponse(
        codes=[InviteCodeResponse.model_validate(c) for c in codes],
        total=len(codes),
    )


@router.delete("/invite-codes/{code_id}", status_code=204)
async def deactivate_invite_code(
    code_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Deactivate an invitation code. Requires authentication."""
    invite = await db.get(InviteCode, code_id)
    if not invite:
        raise HTTPException(status_code=404, detail="Invitation code not found")

    invite.is_active = False
    await db.commit()
    return None


@router.get("/smtp", response_model=SmtpSettingsResponse)
async def get_smtp_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    result = await db.get(SmtpSettings, 1)
    if not result:
        raise HTTPException(status_code=404, detail="SMTP settings not configured")
    return SmtpSettingsResponse(
        host=result.host,
        port=result.port,
        use_tls=result.use_tls,
        username=result.username,
        password_set=bool(result.password_encrypted),
        from_address=result.from_address,
        reply_to=result.reply_to,
        updated_at=result.updated_at,
    )


@router.put("/smtp", response_model=SmtpSettingsResponse)
async def upsert_smtp_settings(
    data: SmtpSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    settings = await db.get(SmtpSettings, 1)
    if settings is None:
        settings = SmtpSettings(id=1)
        db.add(settings)

    if data.host is not None:
        settings.host = data.host
    if data.port is not None:
        settings.port = data.port
    if data.use_tls is not None:
        settings.use_tls = data.use_tls
    if data.username is not None:
        settings.username = data.username
    if data.password is not None:
        settings.password_encrypted = encrypt(data.password)
    if data.from_address is not None:
        settings.from_address = data.from_address
    if data.reply_to is not None:
        settings.reply_to = data.reply_to

    await db.commit()
    await db.refresh(settings)

    return SmtpSettingsResponse(
        host=settings.host,
        port=settings.port,
        use_tls=settings.use_tls,
        username=settings.username,
        password_set=bool(settings.password_encrypted),
        from_address=settings.from_address,
        reply_to=settings.reply_to,
        updated_at=settings.updated_at,
    )


@router.post("/smtp/test", response_model=SmtpTestResponse)
async def test_smtp_settings(
    data: SmtpTestRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    settings = await db.get(SmtpSettings, 1)
    if not settings:
        raise HTTPException(status_code=404, detail="SMTP settings not configured")
    if not settings.host or not settings.from_address:
        raise HTTPException(status_code=400, detail="SMTP host and from_address must be configured")

    success, message = await send_test_email(settings, data.to_email)
    return SmtpTestResponse(success=success, message=message)

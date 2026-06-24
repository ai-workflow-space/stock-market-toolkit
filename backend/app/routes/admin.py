from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone, timedelta
import secrets
from app.models import User, InviteCode
from app.database import get_db
from app.schemas import InviteCodeCreate, InviteCodeResponse, InviteCodeListResponse
from app.auth import require_admin

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

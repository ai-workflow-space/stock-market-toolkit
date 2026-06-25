from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone, timedelta
import secrets
import json
from pathlib import Path
from typing import Optional
from app.models import User, InviteCode
from app.database import get_db
from app.schemas import (
    InviteCodeCreate,
    InviteCodeResponse,
    InviteCodeListResponse,
    InviteSendRequest,
    InviteSendResponse,
    InviteRevokeRequest,
    AuditLogListResponse,
)
from app.auth import require_admin
from app.services.audit import write_audit, get_audit_logs

router = APIRouter(prefix="/api/admin", tags=["admin"])


def generate_code() -> str:
    """Generate a secure random invite code."""
    return secrets.token_urlsafe(16)


@router.post("/invite-codes", response_model=InviteCodeResponse, status_code=201)
async def create_invite_code(
    data: InviteCodeCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Generate a new invitation code. Requires authentication."""
    expires_at = datetime.now(timezone.utc) + timedelta(days=data.expires_in_days)

    invite = InviteCode(
        code=generate_code(),
        token=secrets.token_urlsafe(32),
        created_by=current_user.id,
        expires_at=expires_at,
        is_active=True,
        email=data.email,
    )
    db.add(invite)
    await db.commit()
    await db.refresh(invite)
    await write_audit(
        db,
        actor_id=current_user.id,
        action="invite.created",
        target=invite.code,
        meta={"expires_in_days": data.expires_in_days, "has_email": bool(data.email)},
        request=request,
    )
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
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Deactivate an invitation code. Requires authentication."""
    invite = await db.get(InviteCode, code_id)
    if not invite:
        raise HTTPException(status_code=404, detail="Invitation code not found")

    invite.is_active = False
    await db.commit()
    await write_audit(
        db,
        actor_id=current_user.id,
        action="invite.revoked",
        target=invite.code,
        meta={"invite_id": code_id},
        request=request,
    )
    return None


@router.post("/invite-send", response_model=InviteSendResponse, status_code=201)
async def send_invite(
    data: InviteSendRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Create an email-based invitation and send it. Admin only.
    If SMTP is not configured, returns the invite link in the response."""
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    token = secrets.token_urlsafe(32)
    code = generate_code()

    invite = InviteCode(
        code=code,
        token=token,
        created_by=current_user.id,
        expires_at=expires_at,
        is_active=True,
        email=data.email,
    )
    db.add(invite)
    await db.commit()
    await db.refresh(invite)

    invite_link = f"/register?token={token}"

    await write_audit(
        db,
        actor_id=current_user.id,
        action="invite.sent",
        target=data.email,
        meta={"invite_code": code, "token": token},
        request=request,
    )

    return InviteSendResponse(
        message="Invitation created. SMTP not configured — invite link returned in response.",
        invite_code=code,
        token=token,
        invite_link=invite_link,
    )


@router.post("/invite-revoke")
async def revoke_invite(
    data: InviteRevokeRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Revoke an invitation by token. Admin only."""
    result = await db.execute(
        select(InviteCode).where(InviteCode.token == data.token)
    )
    invite = result.scalar_one_or_none()
    if not invite:
        raise HTTPException(status_code=404, detail="Invitation not found")

    invite.is_active = False
    await db.commit()

    await write_audit(
        db,
        actor_id=current_user.id,
        action="invite.revoked",
        target=invite.code,
        meta={"token": data.token},
        request=request,
    )
    return {"message": "Invitation revoked"}


@router.get("/logs")
async def get_logs(
    level: Optional[str] = Query(
        None, description="Filter by log level (e.g. INFO, ERROR)"
    ),
    since: Optional[str] = Query(
        None, description="ISO datetime filter (logs after this time)"
    ),
    limit: int = Query(100, ge=1, le=10000, description="Max number of log entries"),
    search: Optional[str] = Query(None, description="Text search across log entries"),
    current_user: User = Depends(require_admin),
):
    log_file = Path(__file__).resolve().parent.parent.parent / "logs" / "app.json"

    if not log_file.exists():
        return {"logs": [], "total": 0}

    entries: list[dict] = []
    try:
        with open(log_file, "r") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entries.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    except OSError:
        return {"logs": [], "total": 0}

    if level:
        level_upper = level.upper()
        entries = [e for e in entries if e.get("level") == level_upper]

    if since:
        try:
            since_dt = datetime.fromisoformat(since)
            entries = [
                e
                for e in entries
                if e.get("timestamp")
                and datetime.fromisoformat(e["timestamp"]) >= since_dt
            ]
        except ValueError:
            pass

    if search:
        search_lower = search.lower()
        entries = [
            e for e in entries if search_lower in json.dumps(e, default=str).lower()
        ]

    entries.sort(key=lambda e: e.get("timestamp", ""), reverse=True)

    total = len(entries)
    entries = entries[:limit]

    return {"logs": entries, "total": total}


@router.get("/audit-logs", response_model=AuditLogListResponse)
async def list_audit_logs(
    actor: Optional[str] = Query(None, description="Filter by actor user ID"),
    action: Optional[str] = Query(None, description="Filter by action name"),
    date_from: Optional[str] = Query(
        None, description="ISO date filter (inclusive, e.g. 2026-01-01)"
    ),
    date_to: Optional[str] = Query(
        None, description="ISO date filter (inclusive, e.g. 2026-06-30)"
    ),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=200, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """List audit log entries with pagination and filters. Admin only."""
    logs, total = await get_audit_logs(
        db,
        actor=actor,
        action=action,
        date_from=date_from,
        date_to=date_to,
        page=page,
        per_page=per_page,
    )
    return AuditLogListResponse(logs=logs, total=total)

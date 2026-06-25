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
        created_by=current_user.id,
        expires_at=expires_at,
        is_active=True,
    )
    db.add(invite)
    await db.commit()
    await db.refresh(invite)
    await write_audit(
        db,
        actor_id=current_user.id,
        action="invite.created",
        target=invite.code,
        meta={"expires_in_days": data.expires_in_days},
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


@router.get("/access-logs")
async def get_access_logs(
    since: Optional[str] = Query(
        None, description="ISO datetime filter (logs after this time)"
    ),
    limit: int = Query(100, ge=1, le=10000, description="Max number of log entries"),
    search: Optional[str] = Query(None, description="Text search across log entries"),
    status: Optional[int] = Query(
        None, description="Filter by HTTP status code"
    ),
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
                    parsed = json.loads(line)
                    if parsed.get("type") == "access":
                        entries.append(parsed)
                except json.JSONDecodeError:
                    continue
    except OSError:
        return {"logs": [], "total": 0}

    if status is not None:
        entries = [e for e in entries if e.get("status") == status]

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

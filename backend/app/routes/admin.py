from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone, timedelta
import secrets
import json
from pathlib import Path
from typing import Optional
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

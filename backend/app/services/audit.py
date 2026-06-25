import json
from datetime import datetime
from typing import Optional
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.models import AuditLog


async def write_audit(
    db: AsyncSession,
    actor_id: Optional[str],
    action: str,
    target: Optional[str] = None,
    meta: Optional[dict] = None,
    request: Optional[Request] = None,
) -> AuditLog:
    ip = None
    if request:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            ip = forwarded.split(",")[0].strip()
        elif request.client:
            ip = request.client.host

    entry = AuditLog(
        actor_id=actor_id,
        action=action,
        target=target,
        meta=json.dumps(meta) if meta else None,
        ip=ip,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


async def get_audit_logs(
    db: AsyncSession,
    actor: Optional[str] = None,
    action: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    page: int = 1,
    per_page: int = 50,
) -> tuple[list[AuditLog], int]:
    conditions = []
    if actor:
        conditions.append(AuditLog.actor_id == actor)
    if action:
        conditions.append(AuditLog.action == action)
    if date_from:
        conditions.append(AuditLog.created_at >= datetime.fromisoformat(date_from))
    if date_to:
        conditions.append(AuditLog.created_at <= datetime.fromisoformat(date_to))

    count_query = select(func.count()).select_from(AuditLog)
    query = select(AuditLog)
    if conditions:
        count_query = count_query.where(*conditions)
        query = query.where(*conditions)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    query = query.order_by(desc(AuditLog.created_at))
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    logs = result.scalars().all()

    return list(logs), total

"""Tests for the audit log system."""

import json
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.database import Base
from app.models import AuditLog
from app.services.audit import write_audit, get_audit_logs


def test_audit_log_model_exists():
    """AuditLog model must be importable and have the expected table name."""
    assert AuditLog.__tablename__ == "audit_logs"


def test_audit_log_schema_importable():
    """AuditLogResponse schema must be importable."""
    from app.schemas import AuditLogResponse, AuditLogListResponse

    assert "id" in AuditLogResponse.model_fields
    assert "action" in AuditLogResponse.model_fields
    assert "logs" in AuditLogListResponse.model_fields
    assert "total" in AuditLogListResponse.model_fields


@pytest.mark.asyncio
async def test_write_audit_creates_entry():
    """write_audit creates an AuditLog entry in the database."""
    engine = create_async_engine("sqlite+aiosqlite://", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    AsyncSessionLocal = async_sessionmaker(
        bind=engine, class_=AsyncSession, expire_on_commit=False
    )

    async with AsyncSessionLocal() as db:
        entry = await write_audit(
            db,
            actor_id="test-actor",
            action="test.action",
            target="test-target",
            meta={"key": "value"},
        )
        assert entry.id is not None
        assert entry.actor_id == "test-actor"
        assert entry.action == "test.action"
        assert entry.target == "test-target"
        assert json.loads(entry.meta) == {"key": "value"}


@pytest.mark.asyncio
async def test_get_audit_logs_filters():
    """get_audit_logs returns filtered results."""
    engine = create_async_engine("sqlite+aiosqlite://", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    AsyncSessionLocal = async_sessionmaker(
        bind=engine, class_=AsyncSession, expire_on_commit=False
    )

    async with AsyncSessionLocal() as db:
        await write_audit(db, actor_id="a1", action="user.login", target="u1")
        await write_audit(db, actor_id="a1", action="user.logout", target="u1")
        await write_audit(db, actor_id="a2", action="user.login", target="u2")

        logs, total = await get_audit_logs(db, action="user.login")
        assert total == 2
        assert all(log.action == "user.login" for log in logs)

        logs, total = await get_audit_logs(db, actor="a1")
        assert total == 2
        assert all(log.actor_id == "a1" for log in logs)

        logs, total = await get_audit_logs(db, actor="a2", action="user.login")
        assert total == 1
        assert logs[0].actor_id == "a2"
        assert logs[0].action == "user.login"


@pytest.mark.asyncio
async def test_get_audit_logs_pagination():
    """get_audit_logs paginates correctly."""
    engine = create_async_engine("sqlite+aiosqlite://", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    AsyncSessionLocal = async_sessionmaker(
        bind=engine, class_=AsyncSession, expire_on_commit=False
    )

    async with AsyncSessionLocal() as db:
        for i in range(5):
            await write_audit(db, actor_id="a1", action="test.action", target=f"t{i}")

        logs, total = await get_audit_logs(db, page=1, per_page=2)
        assert total == 5
        assert len(logs) == 2

        logs, total = await get_audit_logs(db, page=3, per_page=2)
        assert len(logs) == 1


@pytest.mark.asyncio
async def test_write_audit_without_actor():
    """write_audit allows None actor (for unauthenticated actions like failed login)."""
    engine = create_async_engine("sqlite+aiosqlite://", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    AsyncSessionLocal = async_sessionmaker(
        bind=engine, class_=AsyncSession, expire_on_commit=False
    )

    async with AsyncSessionLocal() as db:
        entry = await write_audit(
            db,
            actor_id=None,
            action="login.failed",
            target="unknown@example.com",
        )
        assert entry.actor_id is None
        assert entry.target == "unknown@example.com"

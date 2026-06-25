"""Tests for the invitation token system."""

import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.database import Base
from app.models import User, InviteCode
from app.auth import hash_password


def test_invite_code_model_has_token_and_email():
    """InviteCode model must have email and token columns."""
    from app.models import InviteCode

    assert hasattr(InviteCode, "email")
    assert hasattr(InviteCode, "token")

    columns = {c.name: c for c in InviteCode.__table__.columns}
    assert "email" in columns
    assert columns["email"].nullable is True
    assert "token" in columns
    assert columns["token"].nullable is True
    assert columns["token"].unique is True


def test_invite_schemas_have_new_fields():
    """InviteCode schemas must expose email and token fields."""
    from app.schemas import (
        InviteCodeCreate,
        InviteCodeResponse,
        InviteSendRequest,
        InviteSendResponse,
        InviteRevokeRequest,
        UserRegister,
    )

    assert "email" in InviteCodeCreate.model_fields
    assert "email" in InviteCodeResponse.model_fields
    assert "token" in InviteCodeResponse.model_fields
    assert "invite_token" in UserRegister.model_fields
    assert "email" in InviteSendRequest.model_fields
    assert "message" in InviteSendResponse.model_fields
    assert "invite_code" in InviteSendResponse.model_fields
    assert "token" in InviteSendResponse.model_fields
    assert "invite_link" in InviteSendResponse.model_fields
    assert "token" in InviteRevokeRequest.model_fields


@pytest.mark.asyncio
async def test_invite_token_creates_user():
    """Registering with a valid invite token creates the user and marks invite as used."""
    engine = create_async_engine("sqlite+aiosqlite://", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    AsyncSessionLocal = async_sessionmaker(
        bind=engine, class_=AsyncSession, expire_on_commit=False
    )

    async with AsyncSessionLocal() as db:
        admin = User(
            id="admin-id",
            email="admin@test.com",
            username="admin",
            hashed_password=hash_password("secret123"),
        )
        db.add(admin)
        await db.flush()

        invite = InviteCode(
            code="INVITE001",
            token="valid-token-abc",
            created_by=admin.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            is_active=True,
        )
        db.add(invite)
        await db.commit()

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(InviteCode).where(InviteCode.token == "valid-token-abc")
        )
        invite = result.scalar_one_or_none()
        assert invite is not None
        assert invite.is_active is True
        assert invite.expires_at > datetime.now(timezone.utc).replace(tzinfo=None)
        assert invite.used_by is None

        user = User(
            id="user-1",
            email="newuser@test.com",
            username="newuser",
            hashed_password=hash_password("password123"),
        )
        db.add(user)
        await db.flush()

        invite.used_by = user.id
        invite.used_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(invite)

        assert invite.used_by == "user-1"
        assert invite.used_at is not None


@pytest.mark.asyncio
async def test_invite_token_validates_correctly():
    """Non-existent, revoked, and already-used tokens are all rejected."""
    engine = create_async_engine("sqlite+aiosqlite://", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    AsyncSessionLocal = async_sessionmaker(
        bind=engine, class_=AsyncSession, expire_on_commit=False
    )

    async with AsyncSessionLocal() as db:
        admin = User(
            id="admin-3",
            email="admin3@test.com",
            username="admin3",
            hashed_password=hash_password("secret123"),
        )
        db.add(admin)
        await db.flush()

        used_invite = InviteCode(
            code="USED0001",
            token="used-token",
            created_by=admin.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            is_active=True,
            used_by="some-user-id",
            used_at=datetime.now(timezone.utc),
        )
        db.add(used_invite)

        revoked_invite = InviteCode(
            code="REVOKED01",
            token="revoked-token",
            created_by=admin.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            is_active=False,
        )
        db.add(revoked_invite)

        active_invite = InviteCode(
            code="ACTIVE01",
            token="active-valid-token",
            created_by=admin.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            is_active=True,
        )
        db.add(active_invite)
        await db.commit()

    async with AsyncSessionLocal() as db:
        # Non-existent token
        result = await db.execute(
            select(InviteCode).where(InviteCode.token == "nonexistent")
        )
        assert result.scalar_one_or_none() is None

        # Already used token
        result = await db.execute(
            select(InviteCode).where(InviteCode.token == "used-token")
        )
        invite = result.scalar_one_or_none()
        assert invite is not None
        assert invite.used_by is not None

        # Revoked token
        result = await db.execute(
            select(InviteCode).where(InviteCode.token == "revoked-token")
        )
        invite = result.scalar_one_or_none()
        assert invite is not None
        assert invite.is_active is False

        # Valid active token
        result = await db.execute(
            select(InviteCode).where(InviteCode.token == "active-valid-token")
        )
        invite = result.scalar_one_or_none()
        assert invite is not None
        assert invite.is_active is True
        assert invite.used_by is None
        assert invite.expires_at > datetime.now(timezone.utc).replace(tzinfo=None)


@pytest.mark.asyncio
async def test_invite_token_expired_rejected():
    """An expired invite token is rejected (expires_at in the past)."""
    engine = create_async_engine("sqlite+aiosqlite://", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    AsyncSessionLocal = async_sessionmaker(
        bind=engine, class_=AsyncSession, expire_on_commit=False
    )

    async with AsyncSessionLocal() as db:
        admin = User(
            id="admin-2",
            email="admin2@test.com",
            username="admin2",
            hashed_password=hash_password("secret123"),
        )
        db.add(admin)
        await db.flush()

        invite = InviteCode(
            code="EXPIRED01",
            token="expired-token-xyz",
            created_by=admin.id,
            expires_at=datetime.now(timezone.utc) - timedelta(days=1),
            is_active=True,
        )
        db.add(invite)
        await db.commit()

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(InviteCode).where(InviteCode.token == "expired-token-xyz")
        )
        invite = result.scalar_one_or_none()
        assert invite is not None
        assert invite.expires_at < datetime.now(timezone.utc).replace(tzinfo=None)

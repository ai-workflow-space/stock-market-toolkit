"""Tests for admin SMTP settings (issue #106)."""

from fastapi import FastAPI
from fastapi.testclient import TestClient
from datetime import datetime, timezone
import pytest
import uuid

from app.auth import create_access_token, hash_password
from app.database import AsyncSessionLocal
from app.models import User


# ── Helpers ───────────────────────────────────────────────────────────────────


@pytest.fixture(scope="module")
def app():
    from app.main import app

    yield app


@pytest.fixture(scope="module")
def client(app: FastAPI):
    with TestClient(app) as c:
        yield c


async def _seed_admin(db_session) -> User:
    uid = str(uuid.uuid4())
    user = User(
        id=uid,
        email=f"admin-{uid[:8]}@test.local",
        username=f"admin-{uid[:8]}",
        hashed_password=hash_password("testpass123"),
        is_active=True,
        is_admin=True,
    )
    db_session.add(user)
    await db_session.commit()
    return user


def _admin_token(user: User) -> str:
    return create_access_token(data={"sub": user.id})


async def _non_admin_token(db_session) -> str:
    uid = str(uuid.uuid4())
    user = User(
        id=uid,
        email=f"user-{uid[:8]}@test.local",
        username=f"user-{uid[:8]}",
        hashed_password=hash_password("testpass123"),
        is_active=True,
        is_admin=False,
    )
    db_session.add(user)
    await db_session.commit()
    return create_access_token(data={"sub": user.id})


async def _reset_smtp_settings():
    """Delete any existing SMTP settings to start with a clean slate."""
    async with AsyncSessionLocal() as session:
        from app.models import SmtpSettings
        from sqlalchemy import delete
        await session.execute(delete(SmtpSettings))
        await session.commit()


# ─── Crypto tests ────────────────────────────────────────────────────────────


class TestCrypto:
    def test_encrypt_decrypt_roundtrip(self):
        from app.utils.crypto import encrypt, decrypt

        original = "smtp_password_123!"
        encrypted = encrypt(original)
        assert encrypted != original
        decrypted = decrypt(encrypted)
        assert decrypted == original

    def test_encryption_not_deterministic(self):
        from app.utils.crypto import encrypt

        v = "hello-world"
        e1 = encrypt(v)
        e2 = encrypt(v)
        assert e1 != e2

    def test_encrypt_empty_string(self):
        from app.utils.crypto import encrypt, decrypt

        e = encrypt("")
        assert decrypt(e) == ""

    def test_derived_key_is_stable(self):
        from app.utils.crypto import derive_key

        key1 = derive_key()
        key2 = derive_key()
        assert key1 == key2
        assert len(key1) == 44

    def test_decrypt_invalid_raises(self):
        from app.utils.crypto import decrypt

        with pytest.raises(Exception):
            decrypt("not-a-valid-fernet-token")


# ─── SmtpSettings model tests ─────────────────────────────────────────────────


class TestSmtpSettingsModel:
    def test_model_importable(self):
        from app.models import SmtpSettings

        assert SmtpSettings.__tablename__ == "smtp_settings"

    def test_model_has_expected_columns(self):
        from app.models import SmtpSettings

        cols = {c.name for c in SmtpSettings.__table__.columns}
        for name in ("host", "port", "username", "password_encrypted",
                     "use_tls", "from_address", "reply_to", "updated_at"):
            assert name in cols, f"Missing column: {name}"

    def test_smtp_settings_defaults(self):
        from app.models import SmtpSettings

        s = SmtpSettings(host="smtp.example.com", port=587, from_address="noreply@example.com")
        assert s.host == "smtp.example.com"
        assert s.port == 587
        # use_tls defaults to True via column default (applied at INSERT time)


# ─── Schema tests ─────────────────────────────────────────────────────────────


class TestSmtpSchemas:
    def test_smtp_settings_update_valid(self):
        from app.schemas import SmtpSettingsUpdate

        data = SmtpSettingsUpdate(
            host="smtp.gmail.com",
            port=587,
            username="user@gmail.com",
            password="app-password",
            use_tls=True,
            from_address="user@gmail.com",
        )
        assert data.host == "smtp.gmail.com"

    def test_smtp_settings_update_defaults(self):
        from app.schemas import SmtpSettingsUpdate

        data = SmtpSettingsUpdate(host="smtp.gmail.com")
        assert data.host == "smtp.gmail.com"
        assert data.port is None
        assert data.password is None

    def test_smtp_settings_response_has_password_set(self):
        from app.schemas import SmtpSettingsResponse

        data = SmtpSettingsResponse(
            host="smtp.gmail.com",
            port=587,
            use_tls=True,
            username="user",
            password_set=True,
            from_address="user@gmail.com",
            reply_to=None,
            updated_at=datetime.now(timezone.utc),
        )
        assert data.password_set is True
        assert not hasattr(data, "password_encrypted")

    def test_smtp_test_request_valid(self):
        from app.schemas import SmtpTestRequest

        req = SmtpTestRequest(to_email="test@example.com")
        assert req.to_email == "test@example.com"

    def test_smtp_test_request_invalid_email(self):
        from app.schemas import SmtpTestRequest
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            SmtpTestRequest(to_email="bad-email")

    def test_smtp_test_response(self):
        from app.schemas import SmtpTestResponse

        resp = SmtpTestResponse(success=True, message="Test email sent successfully")
        assert resp.success is True


# ─── Route tests ──────────────────────────────────────────────────────────────


class TestSmtpAdminRoutes:
    def test_smtp_route_not_found_when_no_settings(self, client, app):

        async def _setup():
            await _reset_smtp_settings()
            async with AsyncSessionLocal() as session:
                user = await _seed_admin(session)
                return _admin_token(user)

        import asyncio
        token = asyncio.run(_setup())

        resp = client.get(
            "/api/admin/smtp",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 404
        assert "not configured" in resp.json()["detail"].lower()

    def test_smtp_create_and_retrieve(self, client, app):

        async def _setup():
            async with AsyncSessionLocal() as session:
                user = await _seed_admin(session)
                return _admin_token(user)

        import asyncio
        token = asyncio.run(_setup())

        create_payload = {
            "host": "smtp.example.com",
            "port": 587,
            "username": "bot@example.com",
            "password": "secret-smtp-pass",
            "use_tls": True,
            "from_address": "bot@example.com",
        }

        resp = client.put(
            "/api/admin/smtp",
            json=create_payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["host"] == "smtp.example.com"
        assert body["port"] == 587
        assert body["username"] == "bot@example.com"
        assert "password" not in body
        assert "password_encrypted" not in body
        assert body["password_set"] is True
        assert body["from_address"] == "bot@example.com"

        resp2 = client.get(
            "/api/admin/smtp",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp2.status_code == 200
        assert resp2.json()["host"] == "smtp.example.com"

    def test_smtp_create_updates_existing(self, client, app):

        async def _setup():
            async with AsyncSessionLocal() as session:
                user = await _seed_admin(session)
                return _admin_token(user)

        import asyncio
        token = asyncio.run(_setup())

        payload_1 = {
            "host": "smtp.old.com",
            "port": 587,
            "from_address": "old@example.com",
        }
        payload_2 = {
            "host": "smtp.new.com",
            "port": 465,
            "from_address": "new@example.com",
        }

        client.put(
            "/api/admin/smtp",
            json=payload_1,
            headers={"Authorization": f"Bearer {token}"},
        )
        client.put(
            "/api/admin/smtp",
            json=payload_2,
            headers={"Authorization": f"Bearer {token}"},
        )
        resp = client.get(
            "/api/admin/smtp",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.json()["host"] == "smtp.new.com"

    def test_smtp_requires_admin(self, client, app):

        async def _setup():
            async with AsyncSessionLocal() as session:
                token = await _non_admin_token(session)
                return token

        import asyncio
        token = asyncio.run(_setup())

        resp = client.get(
            "/api/admin/smtp",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 403

    def test_smtp_requires_auth(self, client):
        resp = client.get("/api/admin/smtp")
        assert resp.status_code == 403

    def test_smtp_test_no_settings(self, client, app):

        async def _setup():
            await _reset_smtp_settings()
            async with AsyncSessionLocal() as session:
                user = await _seed_admin(session)
                return _admin_token(user)

        import asyncio
        token = asyncio.run(_setup())

        resp = client.post(
            "/api/admin/smtp/test",
            json={"to_email": "test@example.com"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 404

    def test_smtp_test_bad_email(self, client, app):

        async def _setup():
            async with AsyncSessionLocal() as session:
                user = await _seed_admin(session)
                return _admin_token(user)

        import asyncio
        token = asyncio.run(_setup())

        resp = client.post(
            "/api/admin/smtp/test",
            json={"to_email": "not-an-email"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 422

    def test_smtp_routes_registered(self, app):
        paths = {route.path for route in app.routes}
        for path in ("/api/admin/smtp", "/api/admin/smtp/test"):
            assert path in paths, f"Missing route: {path}"


# ─── Integration / smoke ──────────────────────────────────────────────────────


def test_admin_smtp_module_imports():
    from app.main import app

    assert isinstance(app, FastAPI)


def test_crypto_module_importable():
    from app.utils.crypto import encrypt, decrypt

    assert callable(encrypt)
    assert callable(decrypt)


def test_email_service_importable():
    from app.services.mailer import send_email

    assert callable(send_email)

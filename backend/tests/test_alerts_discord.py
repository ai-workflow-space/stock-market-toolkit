"""Tests for Discord notification test endpoint (PR #201)."""

from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest
import uuid
from unittest.mock import AsyncMock, patch

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


async def _seed_user(db_session, admin: bool = False) -> User:
    uid = str(uuid.uuid4())
    user = User(
        id=uid,
        email=f"user-{uid[:8]}@test.local",
        username=f"user-{uid[:8]}",
        hashed_password=hash_password("testpass123"),
        is_active=True,
        is_admin=admin,
    )
    db_session.add(user)
    await db_session.commit()
    return user


def _auth_header(user: User) -> dict:
    return {"Authorization": f"Bearer {create_access_token(data={'sub': user.id})}"}


async def _auth_token(admin: bool = False) -> str:
    async with AsyncSessionLocal() as session:
        user = await _seed_user(session, admin=admin)
        return create_access_token(data={"sub": user.id})


# ─── Auth ─────────────────────────────────────────────────────────────────────


class TestDiscordTestAuth:
    def test_requires_auth(self, client):
        resp = client.post(
            "/api/alerts/notifications/test-discord",
            json={"webhook_url": "https://discord.com/api/webhooks/123456/abcdef"},
        )
        assert resp.status_code == 403

    def test_rejects_bad_token(self, client):
        resp = client.post(
            "/api/alerts/notifications/test-discord",
            json={"webhook_url": "https://discord.com/api/webhooks/123456/abcdef"},
            headers={"Authorization": "Bearer invalid-token"},
        )
        assert resp.status_code == 401


# ─── Schema validation ─────────────────────────────────────────────────────────


class TestDiscordTestSchema:
    def test_empty_webhook_url(self, client):
        """Empty string for webhook_url is rejected with 422."""

        async def _setup():
            return await _auth_token(admin=True)

        import asyncio
        token = asyncio.run(_setup())

        resp = client.post(
            "/api/alerts/notifications/test-discord",
            json={"webhook_url": ""},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 422

    def test_malformed_url_rejected(self, client):
        """Non-URL string for webhook_url is rejected with 422."""

        async def _setup():
            return await _auth_token(admin=True)

        import asyncio
        token = asyncio.run(_setup())

        resp = client.post(
            "/api/alerts/notifications/test-discord",
            json={"webhook_url": "not-a-valid-url"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 422

    def test_valid_webhook_url_accepted_by_schema(self):
        """HttpUrl validation accepts a properly-formed Discord webhook URL."""
        from app.schemas import DiscordTestRequest

        req = DiscordTestRequest(
            webhook_url="https://discord.com/api/webhooks/123456789/abcdefghijklmnop"
        )
        assert str(req.webhook_url) == "https://discord.com/api/webhooks/123456789/abcdefghijklmnop"


# ─── Route ─────────────────────────────────────────────────────────────────────


class TestDiscordTestRoute:
    def test_successful_call_returns_ok_true(self, client):
        """A call with a valid webhook_url and mocked successful send returns {"ok": True}."""

        async def _setup():
            return await _auth_token(admin=True)

        import asyncio
        token = asyncio.run(_setup())

        with patch(
            "app.services.alert_checker._send_discord_notification",
            new_callable=AsyncMock,
            return_value=(True, 204, None),
        ) as mock_send:
            resp = client.post(
                "/api/alerts/notifications/test-discord",
                json={"webhook_url": "https://discord.com/api/webhooks/123456/abcdef"},
                headers={"Authorization": f"Bearer {token}"},
            )

        assert resp.status_code == 200
        assert resp.json() == {"ok": True}
        mock_send.assert_called_once()
        # verify the URL value is passed correctly (HttpUrl preserves the original)
        _, kwargs = mock_send.call_args
        assert str(kwargs["webhook_url"]) == "https://discord.com/api/webhooks/123456/abcdef"

    def test_failed_send_returns_400(self, client):
        """A call that fails at the Discord API returns 400 with error detail."""

        async def _setup():
            return await _auth_token(admin=True)

        import asyncio
        token = asyncio.run(_setup())

        with patch(
            "app.services.alert_checker._send_discord_notification",
            new_callable=AsyncMock,
            return_value=(False, 400, "Webhook URL invalid"),
        ) as mock_send:
            resp = client.post(
                "/api/alerts/notifications/test-discord",
                json={"webhook_url": "https://discord.com/api/webhooks/123456/abcdef"},
                headers={"Authorization": f"Bearer {token}"},
            )

        assert resp.status_code == 400
        assert "Webhook URL invalid" in resp.json()["detail"]
        mock_send.assert_called_once()
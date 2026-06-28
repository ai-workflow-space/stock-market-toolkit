"""Tests for POST /api/alerts/notifications/test-discord."""

import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.auth import get_current_user
from app.models import User


@pytest.fixture
def mock_user():
    return User(id="1", email="test@test.com", username="testuser", hashed_password="xxx")


@pytest.fixture
def client(mock_user):
    app.dependency_overrides[get_current_user] = lambda: mock_user
    yield TestClient(app)
    app.dependency_overrides.clear()


class TestDiscordWebhookEndpoint:
    """Backend tests for POST /api/alerts/notifications/test-discord."""

    def test_valid_webhook_returns_200(self, client):
        """A reachable, valid webhook_url returns 200 with {"ok": True}."""
        with patch("app.services.alert_checker._send_discord_notification") as mock_send:
            mock_send.return_value = (True, 200, None)
            response = client.post(
                "/api/alerts/notifications/test-discord",
                json={"webhook_url": "https://discord.com/api/webhooks/valid/test"},
            )
            assert response.status_code == 200
            assert response.json() == {"ok": True}
            mock_send.assert_called_once_with(
                webhook_url="https://discord.com/api/webhooks/valid/test"
            )

    def test_webhook_failure_returns_400(self, client):
        """When _send_discord_notification returns success=False, endpoint returns 400."""
        with patch("app.services.alert_checker._send_discord_notification") as mock_send:
            mock_send.return_value = (False, 403, "HTTP 403")
            response = client.post(
                "/api/alerts/notifications/test-discord",
                json={"webhook_url": "https://discord.com/api/webhooks/bad/test"},
            )
            assert response.status_code == 400
            assert response.json()["detail"]  # has error detail

    def test_webhook_network_error_returns_400(self, client):
        """When _send_discord_notification returns success=False (e.g. network error logged internally),
        endpoint propagates the failure as 400 via its error-detail branch."""
        with patch("app.services.alert_checker._send_discord_notification") as mock_send:
            # Simulate what _send_discord_notification does internally when httpx raises:
            # it catches the exception and returns (False, None, "Failed to send Discord notification")
            mock_send.return_value = (False, None, "Failed to send Discord notification")
            response = client.post(
                "/api/alerts/notifications/test-discord",
                json={"webhook_url": "https://discord.com/api/webhooks/timeout/test"},
            )
            assert response.status_code == 400
            assert response.json()["detail"]  # has error detail

    def test_empty_webhook_url_rejected_by_pydantic(self, client):
        """An empty string webhook_url is rejected by Pydantic validation (min_length=1)."""
        response = client.post(
            "/api/alerts/notifications/test-discord",
            json={"webhook_url": ""},
        )
        assert response.status_code == 422

    def test_missing_webhook_url_rejected_by_pydantic(self, client):
        """Omitting webhook_url entirely returns a 422 validation error."""
        response = client.post(
            "/api/alerts/notifications/test-discord",
            json={},
        )
        assert response.status_code == 422

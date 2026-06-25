"""Smoke tests for the backend application.

Regression guard for the class of failure where a route module imports a
symbol that does not exist in ``app.models`` (e.g. ``InviteCode``). That
crashes the container on startup with::

    ImportError: cannot import name 'InviteCode' from 'app.models'

Importing ``app.main`` imports every router (auth, stocks, alerts, mcp,
analysis, admin, watchlist), so such an error surfaces here at unit speed.
The app boots with no required env vars because ``app.config`` falls back to
a local SQLite database.
"""

from fastapi import FastAPI
from fastapi.testclient import TestClient


def test_app_imports():
    """Importing the app must not raise (no missing route/model symbols)."""
    from app.main import app

    assert isinstance(app, FastAPI)


def test_invite_code_model_exists():
    """Direct guard: admin.py imports InviteCode, so the model must exist."""
    from app.models import InviteCode

    assert InviteCode.__tablename__ == "invite_codes"


def test_market_provider_singleton_importable():
    """routes/stocks.py + analysis.py import the shared market_provider singleton."""
    from app.providers import market_provider

    assert hasattr(market_provider, "get_history")
    assert hasattr(market_provider, "get_info")


def test_admin_invite_routes_registered():
    """The admin invite-code endpoints must be wired into the app."""
    from app.main import app

    paths = {route.path for route in app.routes}
    assert "/api/admin/invite-codes" in paths


def test_health_endpoint_boots_app():
    """Entering the lifespan runs init_db exactly like the Docker healthcheck."""
    from app.main import app

    with TestClient(app) as client:
        resp = client.get("/health")

    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"

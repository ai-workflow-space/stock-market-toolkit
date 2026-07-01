"""Regression tests for POST /api/alerts — GitHub #236.

Tests that creating an alert with conditions returns 201 with the conditions
array populated, rather than 500 (MissingGreenlet from lazy-loading on async
session after db.refresh).
"""

import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.auth import get_current_user
from app.database import get_db
from app.models import User, Alert, AlertCondition


@pytest.fixture
def mock_user():
    return User(id="1", email="test@test.com", username="testuser", hashed_password="xxx")


def _make_condition(id, alert_id, metric, operator, value) -> AlertCondition:
    return AlertCondition(
        id=id,
        alert_id=alert_id,
        metric=metric,
        operator=operator,
        value=value,
    )


def _make_alert_with_conditions(
    alert_id: int, symbol: str, conditions: list,
    condition_type: str = "above", threshold: float = 0.0, period: str = "1h",
) -> Alert:
    alert = Alert(
        id=alert_id,
        user_id="1",
        symbol=symbol,
        enabled=True,
        combinator="AND",
        condition_type=condition_type,
        threshold=threshold,
        period=period,
    )
    # Replace SQLAlchemy instrumented collection with a plain list so we can
    # assign our mock conditions without hitting ORM backref logic
    object.__setattr__(alert, 'conditions', conditions)
    return alert


class MockDbSession:
    """Controlled mock AsyncSession: returns pre-configured query results.

    Simulates what a real async session would return after a selectinload query,
    without requiring a database connection.
    """

    def __init__(self, query_results: list):
        # List of MagicMock results to return sequentially for each execute() call
        self._query_results = query_results
        self.committed = False
        self.added_instances = []

    async def execute(self, query):
        return self._query_results.pop(0) if self._query_results else MagicMock()

    async def commit(self):
        self.committed = True

    async def flush(self):
        pass  # no-op for testing

    async def refresh(self, instance):
        pass  # not used by the fixed code path

    def add(self, instance):
        self.added_instances.append(instance)

    # Context manager for `async with get_db():`
    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc_info):
        return None


@pytest.fixture
def client(mock_user):
    app.dependency_overrides[get_current_user] = lambda: mock_user
    yield TestClient(app, raise_server_exceptions=False)
    app.dependency_overrides.clear()


class TestCreateAlert:
    """Backend regression tests for POST /api/alerts."""

    def test_create_alert_with_conditions_returns_201_and_includes_conditions(
        self, client, mock_user
    ):
        """Creating an alert with conditions returns 201 and the conditions array is populated.

        Before the fix: db.refresh did not load relationships, AlertResponse
        serialization lazy-loaded conditions on the async session → MissingGreenlet → 500.
        After the fix: a re-query with selectinload attaches conditions before serialization.
        """
        conditions = [
            _make_condition(id=1, alert_id=42, metric="price", operator="gt", value=150.0),
            _make_condition(id=2, alert_id=42, metric="rsi", operator="gt", value=70.0),
        ]
        created_alert = _make_alert_with_conditions(42, "AAPL", conditions)

        # First execute: count query at lines 50-53
        count_result = MagicMock()
        count_result.scalar.return_value = 0

        # Second execute: selectinload re-query at lines 100-104
        query_result = MagicMock()
        query_result.scalar_one.return_value = created_alert

        mock_session = MockDbSession(query_results=[count_result, query_result])

        def override_get_db():
            return mock_session

        app.dependency_overrides[get_db] = override_get_db

        try:
            response = client.post(
                "/api/alerts",
                json={
                    "symbol": "AAPL",
                    "conditions": [
                        {"metric": "price", "operator": "gt", "value": 150.0},
                        {"metric": "rsi", "operator": "gt", "value": 70.0},
                    ],
                },
            )
        finally:
            del app.dependency_overrides[get_db]

        assert response.status_code == 201, response.json()
        data = response.json()
        assert data["symbol"] == "AAPL"
        assert len(data["conditions"]) == 2
        assert data["conditions"][0]["metric"] == "price"
        assert data["conditions"][1]["metric"] == "rsi"

    def test_create_alert_without_conditions_returns_201(self, client, mock_user):
        """Creating an alert with no conditions payload returns 201 correctly."""
        created_alert = _make_alert_with_conditions(99, "TSLA", [])

        count_result = MagicMock()
        count_result.scalar.return_value = 0

        query_result = MagicMock()
        query_result.scalar_one.return_value = created_alert

        mock_session = MockDbSession(query_results=[count_result, query_result])

        def override_get_db():
            return mock_session

        app.dependency_overrides[get_db] = override_get_db

        try:
            response = client.post("/api/alerts", json={"symbol": "TSLA"})
        finally:
            del app.dependency_overrides[get_db]

        assert response.status_code == 201, response.json()
        data = response.json()
        assert data["symbol"] == "TSLA"
        assert data["conditions"] == []
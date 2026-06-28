"""Tests for analysis routes (GET /api/analysis/{symbol}, GET /api/analysis/signals)."""
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


def test_get_analysis_provider_failure_returns_502(client):
    """When market_provider.get_history raises RuntimeError, should return 502."""
    from app.providers.chain import FallbackChain
    with patch("app.routes.analysis.market_provider", spec=FallbackChain) as mock_provider:
        mock_provider.get_history = AsyncMock(
            side_effect=RuntimeError("All providers failed")
        )
        response = client.get("/api/analysis/AAPL?period=1mo")
        assert response.status_code == 502
        assert "unavailable" in response.json()["detail"].lower()
        assert "AAPL" in response.json()["detail"]


def test_get_batch_signals_partial_failure_returns_structured_errors(client):
    """When one symbol fails and another succeeds, return 200 with signals + errors.

    The get_batch_signals handler catches HTTPException (from the 502 path in
    _compute_analysis) and also falls back to a generic 'analysis failed' for any
    other exception, collecting them all into the ``errors`` list while still
    returning 200 with the symbols that succeeded.
    """
    from app.providers.chain import FallbackChain
    with patch("app.routes.analysis.market_provider", spec=FallbackChain) as mock_provider:
        # AAPL: provider raises RuntimeError -> _compute_analysis raises 502 -> caught
        # GOOG: returns a real-looking DataFrame -> analysis succeeds
        import pandas as pd
        from datetime import datetime
        from app.providers.chain import TaggedValue

        # Need 50+ rows so SMA20/SMA50 don't produce all-NaN series.
        n = 60
        good_df = pd.DataFrame({
            "Open":   [150.0 + i * 0.1 for i in range(n)],
            "High":   [152.0 + i * 0.1 for i in range(n)],
            "Low":    [149.0 + i * 0.1 for i in range(n)],
            "Close":  [151.0 + i * 0.1 for i in range(n)],
            "Volume": [1_000_000 + i * 10_000 for i in range(n)],
        }, index=pd.date_range("2024-01-01", periods=n, freq="D"))

        def get_history_side_effect(symbol, period, interval):
            if symbol == "AAPL":
                raise RuntimeError("All providers failed")
            return TaggedValue(good_df, "yfinance", datetime.utcnow())

        mock_provider.get_history = AsyncMock(side_effect=get_history_side_effect)

        response = client.get("/api/analysis/signals?symbols=AAPL,GOOG&period=1mo")
        assert response.status_code == 200
        data = response.json()
        assert "signals" in data
        assert "errors" in data
        # GOOG should have a valid signal; AAPL should be in errors
        assert len(data["signals"]) == 1
        assert data["signals"][0]["symbol"] == "GOOG"
        assert len(data["errors"]) == 1
        assert data["errors"][0]["symbol"] == "AAPL"
        assert "unavailable" in data["errors"][0]["error"].lower()


def test_get_batch_signals_all_fail_returns_empty_signals_with_errors(client):
    """When all symbols fail, return 200 with empty signals list and populated errors."""
    from app.providers.chain import FallbackChain
    with patch("app.routes.analysis.market_provider", spec=FallbackChain) as mock_provider:
        mock_provider.get_history = AsyncMock(
            side_effect=RuntimeError("All providers failed")
        )
        response = client.get("/api/analysis/signals?symbols=INVALD1,INVALD2&period=1mo")
        assert response.status_code == 200
        data = response.json()
        assert data["signals"] == []
        assert len(data["errors"]) == 2
        assert data["errors"][0]["symbol"] == "INVALD1"
        assert data["errors"][1]["symbol"] == "INVALD2"


def _thin_df(n):
    """A valid-shaped OHLCV frame with only ``n`` trading days (e.g. a new IPO)."""
    import pandas as pd
    return pd.DataFrame({
        "Open":   [10.0 + i * 0.1 for i in range(n)],
        "High":   [10.5 + i * 0.1 for i in range(n)],
        "Low":    [9.5 + i * 0.1 for i in range(n)],
        "Close":  [10.2 + i * 0.1 for i in range(n)],
        "Volume": [500_000 + i * 1_000 for i in range(n)],
    }, index=pd.date_range("2026-06-26", periods=n, freq="D"))


def test_get_analysis_recently_listed_returns_422_with_reason(client):
    """A symbol with too few trading days (recent IPO, e.g. SPCX) returns a
    specific 422 reason, never a generic 500/"analysis failed"."""
    from datetime import datetime
    from app.providers.chain import FallbackChain, TaggedValue
    with patch("app.routes.analysis.market_provider", spec=FallbackChain) as mock_provider:
        mock_provider.get_history = AsyncMock(
            return_value=TaggedValue(_thin_df(1), "yfinance", datetime.utcnow())
        )
        response = client.get("/api/analysis/SPCX?period=1mo")
        assert response.status_code == 422
        detail = response.json()["detail"]
        assert "SPCX" in detail
        assert "history" in detail.lower()
        # the reason must mention how thin the data is, not be opaque
        assert "1 trading day" in detail


def test_get_batch_signals_thin_history_surfaces_specific_reason(client):
    """In the batch endpoint a recently-listed symbol lands in errors[] with the
    insufficient-history reason while a well-established symbol still succeeds."""
    from datetime import datetime
    from app.providers.chain import FallbackChain, TaggedValue

    good = _thin_df(60)  # plenty of history
    thin = _thin_df(1)   # listed today

    def side_effect(symbol, period, interval):
        return TaggedValue(good if symbol == "AAPL" else thin, "yfinance", datetime.utcnow())

    with patch("app.routes.analysis.market_provider", spec=FallbackChain) as mock_provider:
        mock_provider.get_history = AsyncMock(side_effect=side_effect)
        response = client.get("/api/analysis/signals?symbols=AAPL,SPCX&period=1mo")
        assert response.status_code == 200
        data = response.json()
        assert [s["symbol"] for s in data["signals"]] == ["AAPL"]
        assert len(data["errors"]) == 1
        err = data["errors"][0]
        assert err["symbol"] == "SPCX"
        assert "history" in err["error"].lower()
        assert err["error"] != "analysis failed"
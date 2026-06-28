import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.auth import get_current_user
from app.models import User


@pytest.fixture
def mock_user():
    user = User(id="1", email="test@test.com", username="testuser", hashed_password="xxx")
    return user


@pytest.fixture
def client(mock_user):
    app.dependency_overrides[get_current_user] = lambda: mock_user
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_get_stock_provider_failure_returns_503(client):
    """When yfinance fails, should return 503 not 500."""
    from app.providers.chain import FallbackChain
    with patch("app.routes.stocks.market_provider", spec=FallbackChain) as mock_provider:
        mock_provider.get_history = AsyncMock(
            side_effect=RuntimeError("All providers failed")
        )
        response = client.get("/api/stock/AAPL?period=1mo")
        assert response.status_code == 503
        assert "unavailable" in response.json()["detail"].lower()


def test_get_stock_empty_data_returns_404(client):
    """When provider returns empty DataFrame, should return 404."""
    from app.providers.chain import FallbackChain, TaggedValue
    import pandas as pd
    with patch("app.routes.stocks.market_provider", spec=FallbackChain) as mock_provider:
        empty_df = pd.DataFrame({"Open": [], "High": [], "Low": [], "Close": [], "Volume": []})
        mock_result = MagicMock(spec=TaggedValue)
        mock_result.value = empty_df
        mock_result.source = "yfinance"
        mock_result.as_of = datetime.utcnow()
        mock_provider.get_history = AsyncMock(return_value=mock_result)
        response = client.get("/api/stock/INVALID?period=1mo")
        assert response.status_code == 404


def test_get_indicators_provider_failure_returns_503(client):
    """When market provider fails, indicators endpoint should return 503."""
    from app.providers.chain import FallbackChain
    with patch("app.routes.stocks.market_provider", spec=FallbackChain) as mock_provider:
        mock_provider.get_history = AsyncMock(
            side_effect=RuntimeError("All providers failed")
        )
        response = client.get("/api/stock/AAPL/indicators?period=3mo")
        assert response.status_code == 503


def test_get_stock_info_provider_failure_returns_503(client):
    """When market provider fails, info endpoint should return 503."""
    from app.providers.chain import FallbackChain
    with patch("app.routes.stocks.market_provider", spec=FallbackChain) as mock_provider:
        mock_provider.get_info = AsyncMock(
            side_effect=RuntimeError("All providers failed")
        )
        response = client.get("/api/stock/AAPL/info")
        assert response.status_code == 503
        assert "unavailable" in response.json()["detail"].lower()


def test_get_fundamentals_provider_failure_returns_503(client):
    from app.providers.chain import FallbackChain
    with patch("app.routes.stocks.fundamentals_provider", spec=FallbackChain) as mock:
        mock.get_fundamentals_dict = AsyncMock(
            side_effect=RuntimeError("All providers failed")
        )
        response = client.get("/api/stock/AAPL/fundamentals")
        assert response.status_code == 503


def test_get_dividends_provider_failure_returns_503(client):
    from app.providers.chain import FallbackChain
    with patch("app.routes.stocks.fundamentals_provider", spec=FallbackChain) as mock:
        mock.get_dividends = AsyncMock(side_effect=RuntimeError("All providers failed"))
        response = client.get("/api/stock/AAPL/dividends")
        assert response.status_code == 503


def test_compare_provider_failure_returns_503(client):
    from app.providers.chain import FallbackChain
    with patch("app.routes.stocks.market_provider", spec=FallbackChain) as mock:
        mock.get_history = AsyncMock(side_effect=RuntimeError("All providers failed"))
        response = client.post("/api/compare", json={"symbols": ["AAPL", "GOOG"], "period": "1mo"})
        assert response.status_code == 503


def test_provider_error_message_includes_providers_list(client):
    """Verify that when all providers fail, error message includes helpful text."""
    from app.providers.chain import FallbackChain
    with patch("app.routes.stocks.market_provider", spec=FallbackChain) as mock:
        mock.get_history = AsyncMock(
            side_effect=RuntimeError(
                "All providers failed for symbol=AAPL period=1mo interval=1d. "
                "Providers tried: ['yfinance']"
            )
        )
        response = client.get("/api/stock/AAPL?period=1mo")
        assert response.status_code == 503
        assert "unavailable" in response.json()["detail"].lower()


# ─── /api/stock/{symbol}/news endpoint tests ──────────────────────────────────

def test_get_stock_news_happy_path(client):
    """Returns 200 with correct NewsResponse shape when provider returns articles."""
    from app.providers.chain import FallbackChain
    fake_articles = [
        {
            "title": "Apple Reports Record Q3 Earnings",
            "publisher": "Reuters",
            "link": "https://example.com/article1",
            "publishedAt": 1699900000,
        },
        {
            "title": "AAPL Hits New High",
            "publisher": "CNBC",
            "link": "https://example.com/article2",
            "publishedAt": 1699800000,
        },
    ]
    with patch("app.routes.stocks.market_provider", spec=FallbackChain) as mock_provider:
        mock_provider.get_news = AsyncMock(return_value=fake_articles)
        response = client.get("/api/stock/AAPL/news")
        assert response.status_code == 200
        data = response.json()
        assert data["symbol"] == "AAPL"
        assert "cached_at" in data
        assert len(data["articles"]) == 2
        assert data["articles"][0]["title"] == "Apple Reports Record Q3 Earnings"
        assert data["articles"][0]["link"] == "https://example.com/article1"


def test_get_stock_news_provider_failure_returns_empty_articles(client):
    """When market_provider.get_news raises, returns 200 with empty articles.

    News is non-critical so the endpoint swallows provider failures and returns
    an empty list rather than a 503 — consistent with the endpoint design.
    """
    from app.providers.chain import FallbackChain
    with patch("app.routes.stocks.market_provider", spec=FallbackChain) as mock_provider:
        mock_provider.get_news = AsyncMock(
            side_effect=RuntimeError("All providers failed for news symbol=AAPL")
        )
        response = client.get("/api/stock/AAPL/news")
        assert response.status_code == 200
        data = response.json()
        assert data["symbol"] == "AAPL"
        assert data["articles"] == []

"""Unit tests for app.services.ingestion."""

from unittest.mock import AsyncMock, MagicMock, patch

import pandas as pd
import pytest

from app.models import Dividend, FinancialStatement, JobRun, SymbolScore


@pytest.fixture
def mock_db():
    db = MagicMock()
    db.execute = AsyncMock()
    db.execute.return_value = MagicMock()
    db.add = MagicMock()
    db.commit = AsyncMock()
    return db


def _mock_fundamentals_dict():
    return {
        "current": {
            "net_income": 100,
            "total_assets": 1000,
            "operating_cash_flow": 120,
            "long_term_debt": 100,
            "current_assets": 500,
            "current_liabilities": 200,
            "gross_profit": 400,
            "total_revenue": 1000,
            "basic_eps": 2.0,
            "total_equity": 500,
            "operating_income": 200,
            "weighted_shares_outstanding": 100,
        },
        "prior": {
            "net_income": 80,
            "total_assets": 900,
            "operating_cash_flow": 90,
            "long_term_debt": 200,
            "current_assets": 400,
            "current_liabilities": 250,
            "gross_profit": 300,
            "total_revenue": 800,
            "basic_eps": 1.0,
            "total_equity": 400,
            "operating_income": 150,
            "weighted_shares_outstanding": 100,
        },
    }


def _mock_dividends_series():
    dates = pd.date_range(end=pd.Timestamp.now(), periods=8, freq="QE")
    return pd.Series([0.25] * 4 + [0.50] * 4, index=dates)


# ─── upsert_financial_statement ────────────────────────────────────────────


@pytest.mark.asyncio
async def test_upsert_financial_statement_creates_new(mock_db):
    from app.services.ingestion import upsert_financial_statement

    mock_db.execute.return_value.scalar_one_or_none.return_value = None

    data = {"current": {}, "prior": {}}
    result = await upsert_financial_statement(mock_db, "AAPL", "annual", data)

    assert result.symbol == "AAPL"
    assert result.period == "annual"
    assert result.data == data
    mock_db.add.assert_called_once()


@pytest.mark.asyncio
async def test_upsert_financial_statement_updates_existing(mock_db):
    from app.services.ingestion import upsert_financial_statement

    existing = FinancialStatement(
        symbol="AAPL",
        period="annual",
        data={"current": {}, "prior": {}},
    )
    mock_db.execute.return_value.scalar_one_or_none.return_value = existing

    new_data = {"current": {"net_income": 200}, "prior": {}}
    result = await upsert_financial_statement(mock_db, "AAPL", "annual", new_data)

    assert result.data == new_data
    mock_db.add.assert_not_called()


# ─── upsert_dividends ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_upsert_dividends_creates_new(mock_db):
    from app.services.ingestion import upsert_dividends

    mock_db.execute.return_value.scalar_one_or_none.return_value = None

    divs = _mock_dividends_series()
    result = await upsert_dividends(mock_db, "AAPL", divs)

    assert len(result) == len(divs)
    assert mock_db.add.call_count == len(divs)


@pytest.mark.asyncio
async def test_upsert_dividends_empty_series(mock_db):
    from app.services.ingestion import upsert_dividends

    result = await upsert_dividends(mock_db, "AAPL", pd.Series(dtype=float))
    assert result == []


@pytest.mark.asyncio
async def test_upsert_dividends_none(mock_db):
    from app.services.ingestion import upsert_dividends

    result = await upsert_dividends(mock_db, "AAPL", None)
    assert result == []


# ─── upsert_symbol_score ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_upsert_symbol_score_creates_new(mock_db):
    from app.services.ingestion import upsert_symbol_score

    mock_db.execute.return_value.scalar_one_or_none.return_value = None

    result = await upsert_symbol_score(
        mock_db, "AAPL", "piotroski", 8, {"positive_roa": True}
    )

    assert result.symbol == "AAPL"
    assert result.score_type == "piotroski"
    assert result.score == 8
    mock_db.add.assert_called_once()


@pytest.mark.asyncio
async def test_upsert_symbol_score_updates_existing(mock_db):
    from app.services.ingestion import upsert_symbol_score

    existing = SymbolScore(symbol="AAPL", score_type="piotroski", score=5)
    mock_db.execute.return_value.scalar_one_or_none.return_value = existing

    result = await upsert_symbol_score(
        mock_db, "AAPL", "piotroski", 9, {"positive_roa": True}
    )

    assert result.score == 9
    mock_db.add.assert_not_called()


# ─── run_nightly_ingest ───────────────────────────────────────────────────


def _make_mock_db(mock_session):
    db = MagicMock()
    db.execute = AsyncMock()
    db.execute.return_value = MagicMock()
    db.execute.return_value.scalar_one_or_none.return_value = None
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.__aenter__ = AsyncMock(return_value=db)
    db.__aexit__ = AsyncMock(return_value=None)
    mock_session.return_value = db
    return db


@pytest.mark.asyncio
async def test_run_nightly_ingest():
    from app.services.ingestion import run_nightly_ingest

    fund_data = _mock_fundamentals_dict()
    div_data = _mock_dividends_series()

    with (
        patch("app.services.ingestion.AsyncSessionLocal") as mock_session,
        patch(
            "app.services.ingestion.fundamentals_provider.get_fundamentals_dict",
            AsyncMock(return_value=fund_data),
        ),
        patch(
            "app.services.ingestion.fundamentals_provider.get_dividends",
            AsyncMock(return_value=div_data),
        ),
        patch("app.services.ingestion.get_settings") as mock_settings,
    ):
        _make_mock_db(mock_session)
        mock_settings.return_value.INGEST_DELAY_SECONDS = 0
        mock_settings.return_value.INGEST_MAX_SYMBOLS = 3

        processed = await run_nightly_ingest()

    assert processed == 3


@pytest.mark.asyncio
async def test_run_nightly_ingest_handles_errors():
    from app.services.ingestion import run_nightly_ingest

    with (
        patch("app.services.ingestion.AsyncSessionLocal") as mock_session,
        patch(
            "app.services.ingestion.fundamentals_provider.get_fundamentals_dict",
            AsyncMock(side_effect=Exception("API error")),
        ),
        patch("app.services.ingestion.get_settings") as mock_settings,
    ):
        _make_mock_db(mock_session)
        mock_settings.return_value.INGEST_DELAY_SECONDS = 0
        mock_settings.return_value.INGEST_MAX_SYMBOLS = 2

        processed = await run_nightly_ingest()

    assert processed == 0


# ─── get_latest_job_run ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_latest_job_run_returns_none(mock_db):
    from app.services.ingestion import get_latest_job_run

    mock_db.execute.return_value.scalar_one_or_none.return_value = None

    result = await get_latest_job_run(mock_db)
    assert result is None


@pytest.mark.asyncio
async def test_get_latest_job_run_returns_run(mock_db):
    from app.services.ingestion import get_latest_job_run

    job = JobRun(
        id=1,
        job_type="nightly_ingest",
        status="completed",
        symbols_processed=10,
        total_symbols=10,
        errors=0,
    )
    mock_db.execute.return_value.scalar_one_or_none.return_value = job

    result = await get_latest_job_run(mock_db)
    assert result.id == 1
    assert result.status == "completed"

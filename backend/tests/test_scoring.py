"""Unit tests for app.services.scoring."""

import pandas as pd
import pytest
from app.services.scoring import (
    dividend_quality,
    piotroski_f_score,
    profitability_metrics,
)


# ─── Piotroski F-Score ───────────────────────────────────────────────────


def test_piotroski_perfect_score():
    cur = {
        "net_income": 100,
        "total_assets": 1000,
        "operating_cash_flow": 120,
        "long_term_debt": 100,
        "current_assets": 500,
        "current_liabilities": 200,
        "gross_profit": 400,
        "total_revenue": 1000,
        "weighted_shares_outstanding": 100,
    }
    prev = {
        "net_income": 80,
        "total_assets": 900,
        "operating_cash_flow": 90,
        "long_term_debt": 200,
        "current_assets": 400,
        "current_liabilities": 250,
        "gross_profit": 300,
        "total_revenue": 800,
        "weighted_shares_outstanding": 100,
    }
    result = piotroski_f_score(cur, prev)
    assert result == 9


def test_piotroski_zero_score():
    cur = {
        "net_income": -100,
        "total_assets": 1000,
        "operating_cash_flow": -150,
        "long_term_debt": 500,
        "current_assets": 100,
        "current_liabilities": 400,
        "gross_profit": 100,
        "total_revenue": 1000,
        "weighted_shares_outstanding": 200,
    }
    prev = {
        "net_income": 50,
        "total_assets": 500,
        "operating_cash_flow": 80,
        "long_term_debt": 100,
        "current_assets": 300,
        "current_liabilities": 200,
        "gross_profit": 300,
        "total_revenue": 800,
        "weighted_shares_outstanding": 100,
    }
    result = piotroski_f_score(cur, prev)
    assert result == 0


def test_piotroski_missing_fields_default_to_zero():
    cur = {"net_income": 100}
    prev = {"net_income": 50}
    result = piotroski_f_score(cur, prev)
    assert isinstance(result, int)
    assert 0 <= result <= 9


# ─── Profitability Metrics ───────────────────────────────────────────────


def test_profitability_metrics_returns_all_keys():
    f = {
        "net_income": 100,
        "total_revenue": 1000,
        "total_equity": 500,
        "total_assets": 2000,
        "gross_profit": 400,
        "operating_income": 200,
        "basic_eps": 2.0,
    }
    m = profitability_metrics(f)
    for key in (
        "roe",
        "roa",
        "gross_margin",
        "op_margin",
        "net_margin",
        "eps_growth",
        "rev_growth",
    ):
        assert key in m


def test_profitability_metrics_no_prior():
    f = {
        "net_income": 100,
        "total_revenue": 1000,
        "total_equity": 500,
        "total_assets": 2000,
        "gross_profit": 400,
        "operating_income": 200,
        "basic_eps": 2.0,
    }
    m = profitability_metrics(f)
    assert m["roe"] == 0.2
    assert m["roa"] == 0.05
    assert m["gross_margin"] == 0.4
    assert m["op_margin"] == 0.2
    assert m["net_margin"] == 0.1
    assert m["eps_growth"] is None
    assert m["rev_growth"] is None


def test_profitability_metrics_with_prior():
    cur = {
        "net_income": 100,
        "total_revenue": 1000,
        "total_equity": 500,
        "total_assets": 2000,
        "gross_profit": 400,
        "operating_income": 200,
        "basic_eps": 2.0,
    }
    prev = {
        "basic_eps": 1.0,
        "total_revenue": 800,
    }
    m = profitability_metrics(cur, prev)
    assert m["eps_growth"] == 1.0  # (2.0 - 1.0) / 1.0
    assert m["rev_growth"] == 0.25  # (1000 - 800) / 800


def test_profitability_metrics_zero_denominator():
    f = {
        "net_income": 0,
        "total_revenue": 0,
        "total_equity": 0,
        "total_assets": 0,
        "gross_profit": 0,
        "operating_income": 0,
        "basic_eps": 0,
    }
    m = profitability_metrics(f)
    for v in m.values():
        assert v is None or v == 0.0


# ─── Dividend Quality ────────────────────────────────────────────────────


def test_dividend_quality_no_data():
    result = dividend_quality({}, {}, None)
    assert result["score"] == 0
    assert result["details"]["has_dividends"] is False

    result = dividend_quality({}, {}, pd.Series(dtype=float))
    assert result["score"] == 0
    assert result["details"]["has_dividends"] is False


def test_dividend_quality_not_a_series():
    result = dividend_quality({}, {}, [1, 2, 3])
    assert result["score"] == 0
    assert result["details"]["has_dividends"] is False


def test_dividend_quality_full_score():
    dates = pd.date_range(end=pd.Timestamp.now(), periods=8, freq="QE")
    divs = pd.Series([0.25] * 4 + [0.50] * 4, index=dates)
    f_current = {"net_income": 100}
    result = dividend_quality(f_current, {}, divs)
    assert result["score"] == 3
    assert result["details"]["consistent"] is True
    assert result["details"]["growth"] == pytest.approx(1.0)
    assert result["details"]["payout_ratio"] == pytest.approx(2.0 / 100)


def test_dividend_quality_tz_aware_index():
    """yfinance returns dividends with a tz-aware index (e.g. America/New_York);
    this must not raise when compared against the current time."""
    dates = pd.date_range(end=pd.Timestamp.now(tz="America/New_York"), periods=8, freq="QE")
    divs = pd.Series([0.25] * 4 + [0.50] * 4, index=dates)
    f_current = {"net_income": 100}
    result = dividend_quality(f_current, {}, divs)
    assert result["score"] == 3
    assert result["details"]["consistent"] is True


def test_dividend_quality_non_datetime_index_does_not_raise():
    """A dividends Series without a DatetimeIndex (int/object/string index) must
    not raise — a non-datetime index has no ``.tz`` and is otherwise
    incomparable to a Timestamp, which previously surfaced as a 500."""
    f_current = {"net_income": 100}

    int_idx = pd.Series([0.25, 0.50], index=[2023, 2024])
    result = dividend_quality(f_current, {}, int_idx)
    assert result["details"]["has_dividends"] is True
    assert isinstance(result["score"], int)

    str_idx = pd.Series([0.25, 0.50], index=["2023-03-01", "2024-03-01"])
    result = dividend_quality(f_current, {}, str_idx)
    assert isinstance(result["score"], int)


def test_dividend_quality_growth():
    dates = pd.date_range(end=pd.Timestamp.now(), periods=8, freq="QE")
    divs = pd.Series([0.5] * 4 + [0.6] * 4, index=dates)
    f_current = {"net_income": 100}
    result = dividend_quality(f_current, {}, divs)
    assert result["score"] == 3
    assert result["details"]["growth"] > 0


def test_dividend_quality_high_payout_ratio():
    dates = pd.date_range(end=pd.Timestamp.now(), periods=8, freq="QE")
    divs = pd.Series([0.25] * 4 + [0.50] * 4, index=dates)
    f_current = {"net_income": 1}
    result = dividend_quality(f_current, {}, divs)
    assert result["details"]["payout_ratio"] >= 0.6
    assert result["details"]["growth"] > 0
    assert result["score"] == 2  # loses point for high payout (consistent + growth, no payout)

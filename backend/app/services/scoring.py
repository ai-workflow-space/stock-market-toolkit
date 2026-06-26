"""I/O-free fundamental scoring functions for Piotroski F-Score and profitability analysis."""

import pandas as pd


def _f(v, default=0.0):
    try:
        return float(v) if v is not None else default
    except (ValueError, TypeError):
        return default


def piotroski_f_score(cur: dict, prev: dict) -> dict:
    """Compute Piotroski F-Score (0–9) from current and prior year fundamentals.

    Nine criteria across three categories:
      Profitability (1–4): positive ROA, positive CFO, ROA growth, CFO > NI
      Lever/Liquidity (5–7): decreasing leverage, increasing current ratio, no dilution
      Efficiency   (8–9): increasing gross margin, increasing asset turnover
    """
    ni = _f(cur.get("net_income"))
    ta = _f(cur.get("total_assets"))
    cfo = _f(cur.get("operating_cash_flow"))
    ltd = _f(cur.get("long_term_debt"))
    ca = _f(cur.get("current_assets"))
    cl = _f(cur.get("current_liabilities"))
    gp = _f(cur.get("gross_profit"))
    rev = _f(cur.get("total_revenue"))

    ni_p = _f(prev.get("net_income"))
    ta_p = _f(prev.get("total_assets"))
    ltd_p = _f(prev.get("long_term_debt"))
    ca_p = _f(prev.get("current_assets"))
    cl_p = _f(prev.get("current_liabilities"))
    gp_p = _f(prev.get("gross_profit"))
    rev_p = _f(prev.get("total_revenue"))
    shares_p = _f(prev.get("weighted_shares_outstanding"))
    shares_c = _f(cur.get("weighted_shares_outstanding"))

    roa = ni / ta if ta else 0.0
    roa_p = ni_p / ta_p if ta_p else 0.0
    lev = ltd / ta if ta else 0.0
    lev_p = ltd_p / ta_p if ta_p else 0.0
    cr = ca / cl if cl else 0.0
    cr_p = ca_p / cl_p if cl_p else 0.0
    gm = gp / rev if rev else 0.0
    gm_p = gp_p / rev_p if rev_p else 0.0
    at = rev / ta if ta else 0.0
    at_p = rev_p / ta_p if ta_p else 0.0

    criteria = {
        "positive_roa": roa > 0,
        "positive_cfo": cfo > 0,
        "roa_growth": roa > roa_p,
        "cfo_exceeds_ni": cfo > ni,
        "decreasing_leverage": lev < lev_p,
        "increasing_current_ratio": cr > cr_p,
        "no_dilution": shares_c <= shares_p,
        "increasing_gross_margin": gm > gm_p,
        "increasing_asset_turnover": at > at_p,
    }

    score = sum(1 for v in criteria.values() if v)
    return {"score": score, "details": criteria}


def profitability_metrics(f: dict, prev: dict | None = None) -> dict:
    """Compute profitability ratios from a current-year fundamentals dict.

    When *prev* is supplied, year-over-year growth rates are included.
    """
    ni = _f(f.get("net_income"))
    rev = _f(f.get("total_revenue"))
    equity = _f(f.get("total_equity"))
    assets = _f(f.get("total_assets"))
    gp = _f(f.get("gross_profit"))
    op = _f(f.get("operating_income"))
    eps = _f(f.get("basic_eps"))

    eps_growth = None
    rev_growth = None
    if prev is not None:
        eps_p = _f(prev.get("basic_eps"))
        rev_p = _f(prev.get("total_revenue"))
        if eps_p:
            eps_growth = (eps - eps_p) / abs(eps_p)
        if rev_p:
            rev_growth = (rev - rev_p) / rev_p

    return {
        "roe": ni / equity if equity else None,
        "roa": ni / assets if assets else None,
        "gross_margin": gp / rev if rev else None,
        "op_margin": op / rev if rev else None,
        "net_margin": ni / rev if rev else None,
        "eps_growth": eps_growth,
        "rev_growth": rev_growth,
    }


def dividend_quality(f_current: dict, f_prior: dict, dividends_df) -> dict:
    """Evaluate dividend quality score (0–3).

    Criteria:
      1. Consistent payments (>= 4 in last 2 years)
      2. Positive year-over-year dividend growth
      3. Payout ratio < 0.6 (sustainable)

    *f_prior* is accepted for API consistency but not currently used.
    """
    details: dict = {}

    if (
        dividends_df is None
        or not isinstance(dividends_df, pd.Series)
        or dividends_df.empty
    ):
        details["has_dividends"] = False
        details["consistent"] = False
        details["growth"] = None
        details["payout_ratio"] = None
        return {"score": 0, "details": details}

    details["has_dividends"] = True
    score = 0

    now = pd.Timestamp.now()
    one_year_ago = now - pd.DateOffset(years=1)
    two_years_ago = now - pd.DateOffset(years=2)

    recent = dividends_df[dividends_df.index >= one_year_ago]
    prior = dividends_df[
        (dividends_df.index >= two_years_ago) & (dividends_df.index < one_year_ago)
    ]

    details["consistent"] = len(recent) >= 4
    if details["consistent"]:
        score += 1

    total_recent = float(recent.sum()) if len(recent) > 0 else 0.0
    total_prior = float(prior.sum()) if len(prior) > 0 else 0.0

    details["growth"] = (
        (total_recent - total_prior) / total_prior if total_prior > 0 else None
    )
    if details["growth"] is not None and details["growth"] > 0:
        score += 1

    ni = _f(f_current.get("net_income"))
    if ni > 0 and total_recent > 0:
        details["payout_ratio"] = total_recent / ni
        if details["payout_ratio"] < 0.6:
            score += 1
    else:
        details["payout_ratio"] = None

    return {"score": score, "details": details}

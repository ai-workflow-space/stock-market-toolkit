import logging

from fastapi import APIRouter, Query

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["search"])


@router.get("/search")
async def search_symbols(
    q: str = Query(..., min_length=1),
):
    try:
        import yfinance as yf

        def _do_search(max_results: int = 20) -> list:
            search_result = yf.Search(q, max_results=max_results)
            return search_result.quotes if search_result.quotes else []

        # First attempt with more results
        quotes = _do_search(20)

        # If too few results, retry once more (Yahoo Finance API can be inconsistent)
        if len(quotes) < 3:
            quotes = _do_search(20)

        # Filter for equity types, preferring TAI exchange for Taiwan stocks
        results = [
            {
                "symbol": r["symbol"],
                "name": r.get("longname", r.get("shortname", "")),
                "exchange": r.get("exchange", ""),
            }
            for r in quotes
            if r.get("symbol") and r.get("quoteType") in ("EQUITY", "ETF")
        ]

        # Boost TAI exchange results to top if present
        tai_results = [r for r in results if r["exchange"] == "TAI"]
        other_results = [r for r in results if r["exchange"] != "TAI"]
        return (tai_results + other_results)[:8]
    except Exception:
        return []
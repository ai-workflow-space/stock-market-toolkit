from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user
from app.models import User
from app.providers import fundamentals_provider
from app.schemas import FundamentalsResponse
from app.services.scoring import (
    dividend_quality,
    piotroski_f_score,
    profitability_metrics,
)

router = APIRouter(prefix="/api", tags=["fundamentals"])


@router.get("/stock/{symbol}/fundamentals", response_model=FundamentalsResponse)
async def get_fundamentals(
    symbol: str,
    current_user: User = Depends(get_current_user),
):
    data = await fundamentals_provider.get_fundamentals_dict(symbol.upper())
    dividends = await fundamentals_provider.get_dividends(symbol.upper())

    cur = data.get("current", {})
    prev = data.get("prior", {})

    if not cur:
        raise HTTPException(
            status_code=404, detail=f"No fundamentals data for {symbol}"
        )

    return FundamentalsResponse(
        symbol=symbol.upper(),
        cached_at=datetime.utcnow().isoformat(),
        profitability=profitability_metrics(cur, prev),
        piotroski=piotroski_f_score(cur, prev),
        dividend_quality=dividend_quality(cur, prev, dividends),
    )

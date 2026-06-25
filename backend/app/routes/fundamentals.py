from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import FinancialStatement, SymbolScore, User
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
    db: AsyncSession = Depends(get_db),
):
    symbol = symbol.upper()

    stmt = select(FinancialStatement).where(
        FinancialStatement.symbol == symbol,
        FinancialStatement.period == "annual",
    )
    result = await db.execute(stmt)
    fs = result.scalar_one_or_none()

    if fs is not None:
        data = fs.data
        cur = data.get("current", {})
        prev = data.get("prior", {})

        stmt_scores = select(SymbolScore).where(SymbolScore.symbol == symbol)
        result_scores = await db.execute(stmt_scores)
        score_rows = result_scores.scalars().all()

        scores = {s.score_type: s for s in score_rows}

        piotroski = {}
        profitability = {}
        dividend_q = {}

        if "piotroski" in scores:
            piotroski = {
                "score": scores["piotroski"].score,
                "details": scores["piotroski"].details or {},
            }
        else:
            piotroski = piotroski_f_score(cur, prev)

        if "profitability" in scores:
            profitability = scores["profitability"].details or {}
        else:
            profitability = profitability_metrics(cur, prev)

        if "dividend_quality" in scores:
            dividend_q = {
                "score": scores["dividend_quality"].score,
                "details": scores["dividend_quality"].details or {},
            }
        else:
            div_df = await fundamentals_provider.get_dividends(symbol)
            dividend_q = dividend_quality(cur, prev, div_df)

        return FundamentalsResponse(
            symbol=symbol,
            cached_at=datetime.utcnow().isoformat(),
            profitability=profitability,
            piotroski=piotroski,
            dividend_quality=dividend_q,
        )

    data = await fundamentals_provider.get_fundamentals_dict(symbol)
    dividends = await fundamentals_provider.get_dividends(symbol)

    cur = data.get("current", {})
    prev = data.get("prior", {})

    if not cur:
        raise HTTPException(
            status_code=404, detail=f"No fundamentals data for {symbol}"
        )

    return FundamentalsResponse(
        symbol=symbol,
        cached_at=datetime.utcnow().isoformat(),
        profitability=profitability_metrics(cur, prev),
        piotroski=piotroski_f_score(cur, prev),
        dividend_quality=dividend_quality(cur, prev, dividends),
    )

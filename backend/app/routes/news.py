import logging
from datetime import datetime

from fastapi import APIRouter, Depends
from app.models import User
from app.schemas import NewsResponse
from app.auth import get_current_user
from app.providers import market_provider

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["news"])


@router.get("/stock/{symbol}/news", response_model=NewsResponse)
async def get_stock_news(
    symbol: str,
    current_user: User = Depends(get_current_user),
):
    try:
        articles = await market_provider.get_news(symbol.upper())
    except Exception as exc:
        log.error("Failed to get news for %s: %s", symbol, exc, exc_info=True)
        articles = []  # Return empty rather than 503 -- news is non-critical
    return NewsResponse(
        symbol=symbol.upper(),
        cached_at=datetime.utcnow().isoformat(),
        articles=articles,
    )

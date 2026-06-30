from pydantic import BaseModel, Field
from typing import Optional


class NewsArticle(BaseModel):
    title: str
    publisher: Optional[str] = None
    link: str = Field(..., min_length=1)  # empty string blocked by yfinance filter too
    publishedAt: Optional[int] = None  # unix epoch from yfinance


class NewsResponse(BaseModel):
    symbol: str
    cached_at: str = ""
    articles: list[NewsArticle]
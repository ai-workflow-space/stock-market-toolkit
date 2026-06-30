from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ProfitabilityMetrics(BaseModel):
    roe: Optional[float] = None
    roa: Optional[float] = None
    gross_margin: Optional[float] = None
    op_margin: Optional[float] = None
    net_margin: Optional[float] = None
    eps_growth: Optional[float] = None
    rev_growth: Optional[float] = None


class DividendQualityDetails(BaseModel):
    score: int = 0
    has_dividends: bool = False
    consistent: bool = False
    growth: Optional[float] = None
    payout_ratio: Optional[float] = None


class FundamentalsResponse(BaseModel):
    symbol: str
    cached_at: str = ""
    f_score: int
    profitability: ProfitabilityMetrics
    dividend_quality: DividendQualityDetails
    statements: Optional[dict] = None


class YearlyDividend(BaseModel):
    year: int
    total: float


class DividendsResponse(BaseModel):
    symbol: str
    cached_at: str = ""
    yearly: list[YearlyDividend]
    yield_pct: Optional[float] = None
    payout_ratio: Optional[float] = None
    streak: int


class FinancialStatementResponse(BaseModel):
    id: int
    symbol: str
    period: str
    fiscal_year: Optional[int] = None
    fiscal_quarter: Optional[int] = None
    data: dict
    fetched_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DividendResponse(BaseModel):
    id: int
    symbol: str
    amount: float
    ex_date: datetime
    fetched_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SymbolScoreResponse(BaseModel):
    id: int
    symbol: str
    score_type: str
    score: Optional[float] = None
    details: Optional[dict] = None
    calculated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MonthlyRevenueResponse(BaseModel):
    id: int
    symbol: str
    year: int
    month: int
    revenue: Optional[float] = None
    fetched_at: Optional[datetime] = None

    class Config:
        from_attributes = True
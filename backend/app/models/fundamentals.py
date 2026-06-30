from sqlalchemy import Column, String, Float, Integer, DateTime, JSON, UniqueConstraint
from sqlalchemy.sql import func
from app.database import Base


class FinancialStatement(Base):
    __tablename__ = "financial_statements"

    id = Column(Integer, primary_key=True, autoincrement=True)
    symbol = Column(String, nullable=False, index=True)
    period = Column(String, nullable=False)  # "annual" | "quarterly"
    fiscal_year = Column(Integer, nullable=True)
    fiscal_quarter = Column(Integer, nullable=True)
    data = Column(JSON, nullable=False)
    fetched_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint(
            "symbol", "period", name="uq_financial_statements_symbol_period"
        ),
    )


class Dividend(Base):
    __tablename__ = "dividends"

    id = Column(Integer, primary_key=True, autoincrement=True)
    symbol = Column(String, nullable=False, index=True)
    amount = Column(Float, nullable=False)
    ex_date = Column(DateTime(timezone=True), nullable=False)
    fetched_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("symbol", "ex_date", name="uq_dividends_symbol_ex_date"),
    )


class SymbolScore(Base):
    __tablename__ = "symbol_scores"

    id = Column(Integer, primary_key=True, autoincrement=True)
    symbol = Column(String, nullable=False, index=True)
    score_type = Column(
        String, nullable=False
    )  # "piotroski" | "profitability" | "dividend_quality"
    score = Column(Float, nullable=True)
    details = Column(JSON, nullable=True)
    calculated_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint(
            "symbol", "score_type", name="uq_symbol_scores_symbol_score_type"
        ),
    )


class MonthlyRevenue(Base):
    __tablename__ = "monthly_revenue"

    id = Column(Integer, primary_key=True, autoincrement=True)
    symbol = Column(String, nullable=False, index=True)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    revenue = Column(Float, nullable=True)
    fetched_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint(
            "symbol", "year", "month", name="uq_monthly_revenue_symbol_year_month"
        ),
    )

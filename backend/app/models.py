from sqlalchemy import (
    Column,
    String,
    DateTime,
    Float,
    Boolean,
    Text,
    Integer,
    ForeignKey,
    JSON,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # watchlists = relationship("Watchlist", back_populates="user")
    alerts = relationship("Alert", back_populates="user", cascade="all, delete-orphan")
    notification_settings = relationship(
        "NotificationSettings",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    triggered_alerts = relationship(
        "TriggeredAlert", back_populates="user", cascade="all, delete-orphan"
    )


class Watchlist(Base):
    __tablename__ = "watchlists"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    symbol = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    symbol = Column(String, nullable=False)
    symbol_name = Column(String, nullable=True)
    condition_type = Column(
        String, nullable=False
    )  # above, below, pct_change_up, pct_change_down
    threshold = Column(Float, nullable=False)
    period = Column(String, nullable=False, default="1h")  # 5m, 15m, 30m, 1h, 4h, 1d
    enabled = Column(Boolean, default=True)
    cooldown_until = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="alerts")
    triggered = relationship(
        "TriggeredAlert", back_populates="alert", cascade="all, delete-orphan"
    )


class NotificationSettings(Base):
    __tablename__ = "notification_settings"

    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    discord_webhook_url = Column(Text, nullable=True)
    email_address = Column(String, nullable=True)
    email_enabled = Column(Boolean, default=False)
    discord_enabled = Column(Boolean, default=True)
    default_period = Column(String, default="1h")
    timezone = Column(String, default="UTC")
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user = relationship("User", back_populates="notification_settings")


class TriggeredAlert(Base):
    __tablename__ = "triggered_alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    alert_id = Column(Integer, ForeignKey("alerts.id"), nullable=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    symbol = Column(String, nullable=False)
    condition_type = Column(String, nullable=False)
    trigger_price = Column(Float, nullable=False)
    threshold_value = Column(Float, nullable=False)
    triggered_at = Column(DateTime(timezone=True), server_default=func.now())
    notified = Column(Boolean, default=False)
    read = Column(Boolean, default=False)

    user = relationship("User", back_populates="triggered_alerts")
    alert = relationship("Alert", back_populates="triggered")
    deliveries = relationship(
        "NotificationDelivery",
        back_populates="triggered_alert",
        cascade="all, delete-orphan",
    )


class NotificationDelivery(Base):
    __tablename__ = "notification_deliveries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    triggered_alert_id = Column(
        Integer, ForeignKey("triggered_alerts.id"), nullable=True
    )
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    channel = Column(String, nullable=False)  # discord | email | webhook
    status = Column(String, nullable=False)  # success | failed
    http_status = Column(Integer, nullable=True)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
    triggered_alert = relationship("TriggeredAlert", back_populates="deliveries")


class InviteCode(Base):
    __tablename__ = "invite_codes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String, unique=True, index=True, nullable=False)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    used_by = Column(String, ForeignKey("users.id"), nullable=True)
    used_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    creator = relationship("User", foreign_keys=[created_by])
    redeemer = relationship("User", foreign_keys=[used_by])


# ─── Ingestion / Fundamentals data models ───


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


class JobRun(Base):
    __tablename__ = "job_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_type = Column(String, nullable=False, index=True)  # "nightly_ingest"
    status = Column(String, nullable=False)  # "running" | "completed" | "failed"
    symbols_processed = Column(Integer, default=0)
    total_symbols = Column(Integer, default=0)
    errors = Column(Integer, default=0)
    error_details = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

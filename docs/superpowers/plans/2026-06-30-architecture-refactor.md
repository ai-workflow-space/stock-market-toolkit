# Architecture Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Minimal structural refactor to improve maintainability without rewriting functionality

**Architecture:** Domain-oriented file organization with clear single-responsibility per module. Split large flat files into focused domain modules. Extract cross-cutting concerns (notifications, cron) into dedicated modules.

**Tech Stack:** FastAPI 0.115.0, SQLAlchemy 2.0 (async), React 19.2.6, TypeScript 6.0, PostgreSQL 16

---

## Global Constraints

- Python 3.12+
- TypeScript 6.0+
- Preserve all existing API contracts (no breaking changes)
- Maintain async patterns throughout
- Preserve JWT auth flow
- Preserve database migration compatibility

---

## Current Architecture Assessment

### Directory Structure (Before)

```
backend/app/
├── main.py              # 150 lines - app entry + cron routes mixed
├── models.py            # 283 lines - ALL ORM models (16 tables)
├── schemas.py           # 485 lines - ALL Pydantic schemas
├── config.py
├── database.py
├── auth.py
├── cli.py
├── routes/
│   ├── stocks.py        # 415 lines - OHLCV, indicators, info, fundamentals, dividends, search, news
│   ├── alerts.py
│   ├── analysis.py
│   ├── auth.py
│   ├── watchlist.py
│   ├── admin.py
│   └── mcp.py
├── services/
│   ├── alert_checker.py # 513 lines - alert eval + notification dispatch
│   ├── scoring.py
│   ├── ingestion.py
│   ├── cache.py
│   ├── audit.py
│   └── mailer.py
└── providers/
```

### Evidence-Based Problems

| Problem | Evidence | Impact |
|---------|----------|--------|
| Flat `schemas.py` | 485 lines, 16 tables in one file | SRP violation, merge conflicts |
| Flat `models.py` | 283 lines, 16 tables in one file | SRP violation, hard to navigate |
| Monolithic `routes/stocks.py` | 415 lines, 7 distinct concerns | Untestable, single change affects many domains |
| `alert_checker.py` does too much | 513 lines, eval + Discord + email + delivery records | High coupling, hard to modify notifications |
| Duplicate `_clean()` functions | Copied in `routes/stocks.py` and `routes/analysis.py` | DRY violation, inconsistent behavior |
| Cron endpoints in `main.py` | `/cron/check-alerts` and `/cron/ingest` in app entry | Violates separation of concerns |
| Cache TTLs scattered | Multiple files define `CACHE_TTL` or similar | Inconsistent cache behavior, hard to tune |

---

## Minimal Refactor Plan

### Phase 1: Backend Schema/Model Splitting

**Approach:** Split `models.py` and `schemas.py` by domain, maintaining import compatibility via re-exports.

**New Structure:**
```
backend/app/
├── models/
│   ├── __init__.py      # Re-exports all models for backward compatibility
│   ├── user.py          # User model
│   ├── watchlist.py     # Watchlist model
│   ├── alert.py         # Alert, AlertCondition, TriggeredAlert, NotificationDelivery
│   ├── fundamentals.py  # FinancialStatement, Dividend, SymbolScore, MonthlyRevenue
│   ├── admin.py         # InviteCode, AuditLog, SmtpSettings, JobRun
│   └── base.py          # Base class, mixins
├── schemas/
│   ├── __init__.py      # Re-exports all schemas for backward compatibility
│   ├── auth.py          # Login, Register, Token schemas
│   ├── user.py          # UserResponse, UserUpdate
│   ├── watchlist.py     # WatchlistCreate, WatchlistResponse
│   ├── alert.py         # AlertCreate, AlertResponse, NotificationDelivery
│   ├── stock.py         # OHLCV, StockInfo, Indicator, Fundamentals, Dividend schemas
│   ├── analysis.py      # Signal schemas
│   ├── admin.py         # InviteCode, AuditLog schemas
│   └── common.py        # Pagination, Error, Health schemas
```

### Phase 2: Route Module Splitting

**Approach:** Split `routes/stocks.py` into focused route modules. The current 415-line file handles 7 concerns.

**New Structure:**
```
backend/app/routes/
├── __init__.py          # Re-exports for backward compatibility
├── stocks.py            # OHLCV data, indicators (moved)
├── stock_info.py        # Stock info, fundamentals, dividends (moved from stocks.py)
├── search.py            # Symbol search (moved from stocks.py)
├── news.py              # News (moved from stocks.py)
├── alerts.py            # (existing)
├── analysis.py          # (existing, needs duplicate removal)
├── auth.py              # (existing)
├── watchlist.py         # (existing)
├── admin.py             # (existing)
├── mcp.py               # (existing)
├── cron.py              # NEW - /cron/* endpoints extracted from main.py
```

### Phase 3: Alert Checker Decomposition

**Approach:** Extract notification dispatch from `alert_checker.py` into channel-specific modules.

**New Structure:**
```
backend/app/services/
├── alert_checker.py     # Alert evaluation logic only
├── notification/
│   ├── __init__.py
│   ├── dispatcher.py    # Orchestrates notification delivery
│   ├── channel.py       # Base channel interface
│   ├── discord.py       # Discord webhook delivery
│   └── email.py         # Email delivery via mailer
```

### Phase 4: Code Deduplication

- Extract `_clean()` and `_clean_list()` to `backend/app/services/cleanup.py`
- Extract indicator calculation helpers to `backend/app/services/indicators.py`
- Update both `routes/stocks.py` (after split) and `routes/analysis.py` to import from shared modules

### Phase 5: Cron Route Extraction

**Files:**
- Create: `backend/app/routes/cron.py`
- Modify: `backend/app/main.py:1-50`

Extract `/cron/check-alerts` and `/cron/ingest` from `main.py` into `routes/cron.py`.

---

## Task Decomposition

### Task 1: Split models.py into Domain Modules

**Files:**
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/base.py`
- Create: `backend/app/models/user.py`
- Create: `backend/app/models/watchlist.py`
- Create: `backend/app/models/alert.py`
- Create: `backend/app/models/fundamentals.py`
- Create: `backend/app/models/admin.py`
- Modify: `backend/app/models.py` (replace with imports from new structure)

**Interfaces:**
- Produces: All SQLAlchemy models at `app.models.*` and backward-compatible `app.models` import

- [ ] **Step 1: Create `backend/app/models/` directory and `__init__.py`**

```python
# backend/app/models/__init__.py
from .base import Base
from .user import User
from .watchlist import Watchlist
from .alert import Alert, AlertCondition, TriggeredAlert, NotificationDelivery, NotificationSetting
from .fundamentals import FinancialStatement, Dividend, SymbolScore, MonthlyRevenue
from .admin import InviteCode, AuditLog, SmtpSettings, JobRun

__all__ = [
    "Base",
    "User",
    "Watchlist",
    "Alert",
    "AlertCondition",
    "TriggeredAlert",
    "NotificationDelivery",
    "NotificationSetting",
    "FinancialStatement",
    "Dividend",
    "SymbolScore",
    "MonthlyRevenue",
    "InviteCode",
    "AuditLog",
    "SmtpSettings",
    "JobRun",
]
```

- [ ] **Step 2: Create `backend/app/models/base.py`**

```python
# backend/app/models/base.py
from datetime import datetime
from sqlalchemy import DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
```

- [ ] **Step 3: Create `backend/app/models/user.py`**

```python
# backend/app/models/user.py
from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base, TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
```

- [ ] **Step 4: Create `backend/app/models/watchlist.py`**

```python
# backend/app/models/watchlist.py
from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base, TimestampMixin


class Watchlist(Base, TimestampMixin):
    __tablename__ = "watchlists"
    __table_args__ = (
        UniqueConstraint("user_id", "symbol", name="uq_user_symbol"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    symbol: Mapped[str] = mapped_column(String(10), index=True)

    user: Mapped["User"] = relationship("User", back_populates="watchlists")
```

- [ ] **Step 5: Create `backend/app/models/alert.py`**

```python
# backend/app/models/alert.py
from sqlalchemy import ForeignKey, String, Boolean, Integer, Text, Float, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base, TimestampMixin

import enum


class AlertType(str, enum.Enum):
    ABOVE = "above"
    BELOW = "below"
    PCT_CHANGE_UP = "pct_change_up"
    PCT_CHANGE_DOWN = "pct_change_down"
    MULTI = "multi"


class Alert(Base, TimestampMixin):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    symbol: Mapped[str] = mapped_column(String(10), index=True)
    alert_type: Mapped[AlertType] = mapped_column(SQLEnum(AlertType))
    threshold: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_triggered_at: Mapped | None = None

    user: Mapped["User"] = relationship("User", back_populates="alerts")
    conditions: Mapped[list["AlertCondition"]] = relationship(back_populates="alert")
    triggered_alerts: Mapped[list["TriggeredAlert"]] = relationship(back_populates="alert")


class AlertCondition(Base, TimestampMixin):
    __tablename__ = "alert_conditions"

    id: Mapped[int] = mapped_column(primary_key=True)
    alert_id: Mapped[int] = mapped_column(ForeignKey("alerts.id"), index=True)
    condition_type: Mapped[str] = mapped_column(String(50))
    threshold: Mapped[float] = mapped_column(Float)
    logic: Mapped[str] = mapped_column(String(10), default="AND")

    alert: Mapped["Alert"] = relationship("Alert", back_populates="conditions")


class TriggeredAlert(Base, TimestampMixin):
    __tablename__ = "triggered_alerts"

    id: Mapped[int] = mapped_column(primary_key=True)
    alert_id: Mapped[int] = mapped_column(ForeignKey("alerts.id"), index=True)
    triggered_at: Mapped | None = None
    price_at_trigger: Mapped[float | None] = mapped_column(Float, nullable=True)

    alert: Mapped["Alert"] = relationship("Alert", back_populates="triggered_alerts")
    deliveries: Mapped[list["NotificationDelivery"]] = relationship(back_populates="triggered_alert")


class NotificationDelivery(Base, TimestampMixin):
    __tablename__ = "notification_deliveries"

    id: Mapped[int] = mapped_column(primary_key=True)
    triggered_alert_id: Mapped[int] = mapped_column(ForeignKey("triggered_alerts.id"), index=True)
    channel: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20))
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    triggered_alert: Mapped["TriggeredAlert"] = relationship("TriggeredAlert", back_populates="deliveries")


class NotificationSetting(Base, TimestampMixin):
    __tablename__ = "notification_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    channel: Mapped[str] = mapped_column(String(20))
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    config: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="notification_settings")
```

- [ ] **Step 6: Create `backend/app/models/fundamentals.py`**

```python
# backend/app/models/fundamentals.py
from sqlalchemy import ForeignKey, String, Integer, Text, Float
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base, TimestampMixin


class FinancialStatement(Base, TimestampMixin):
    __tablename__ = "financial_statements"

    id: Mapped[int] = mapped_column(primary_key=True)
    symbol: Mapped[str] = mapped_column(String(10), index=True)
    statement_type: Mapped[str] = mapped_column(String(20))
    fiscal_year: Mapped[int] = mapped_column(Integer)
    data: Mapped | None = mapped_column(Text)


class Dividend(Base, TimestampMixin):
    __tablename__ = "dividends"

    id: Mapped[int] = mapped_column(primary_key=True)
    symbol: Mapped[str] = mapped_column(String(10), index=True)
    date: Mapped | None = None
    amount: Mapped[float] = mapped_column(Float)
    dividend_type: Mapped[str | None] = mapped_column(String(20), nullable=True)


class SymbolScore(Base, TimestampMixin):
    __tablename__ = "symbol_scores"

    id: Mapped[int] = mapped_column(primary_key=True)
    symbol: Mapped[str] = mapped_column(String(10), unique=True, index=True)
    piotroski_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    profitability_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    dividend_quality_score: Mapped[float | None] = mapped_column(Float, nullable=True)


class MonthlyRevenue(Base, TimestampMixin):
    __tablename__ = "monthly_revenue"

    id: Mapped[int] = mapped_column(primary_key=True)
    symbol: Mapped[str] = mapped_column(String(10), index=True)
    year_month: Mapped[str] = mapped_column(String(7))
    revenue: Mapped[int] = mapped_column(Integer)
    revenue YoY: Mapped[float | None] = mapped_column(Float, nullable=True)
```

- [ ] **Step 7: Create `backend/app/models/admin.py`**

```python
# backend/app/models/admin.py
from sqlalchemy import ForeignKey, String, Text, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base, TimestampMixin


class InviteCode(Base, TimestampMixin):
    __tablename__ = "invite_codes"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    used_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    used_at: Mapped | None = None
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))


class AuditLog(Base, TimestampMixin):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(100))
    resource: Mapped[str | None] = mapped_column(String(100), nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)


class SmtpSettings(Base, TimestampMixin):
    __tablename__ = "smtp_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    host: Mapped[str] = mapped_column(String(255))
    port: Mapped[int] = mapped_column(Integer)
    username: Mapped[str] = mapped_column(String(255))
    encrypted_password: Mapped[str] = mapped_column(Text)
    use_tls: Mapped[bool] = mapped_column(Boolean, default=True)


class JobRun(Base, TimestampMixin):
    __tablename__ = "job_runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    job_name: Mapped[str] = mapped_column(String(100), index=True)
    status: Mapped[str] = mapped_column(String(20))
    started_at: Mapped | None = None
    completed_at: Mapped | None = None
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
```

- [ ] **Step 8: Replace `backend/app/models.py` with backward-compatible re-export**

```python
# backend/app/models.py
from .models import (
    Base,
    User,
    Watchlist,
    Alert,
    AlertCondition,
    TriggeredAlert,
    NotificationDelivery,
    NotificationSetting,
    FinancialStatement,
    Dividend,
    SymbolScore,
    MonthlyRevenue,
    InviteCode,
    AuditLog,
    SmtpSettings,
    JobRun,
)

__all__ = [
    "Base",
    "User",
    "Watchlist",
    "Alert",
    "AlertCondition",
    "TriggeredAlert",
    "NotificationDelivery",
    "NotificationSetting",
    "FinancialStatement",
    "Dividend",
    "SymbolScore",
    "MonthlyRevenue",
    "InviteCode",
    "AuditLog",
    "SmtpSettings",
    "JobRun",
]
```

- [ ] **Step 9: Run tests to verify no breaking changes**

Run: `pytest backend/tests/ -v --tb=short -x`
Expected: All tests pass

- [ ] **Step 10: Commit**

```bash
git add backend/app/models/ backend/app/models.py
git commit -m "refactor: split models.py into domain modules"
```

---

### Task 2: Split schemas.py into Domain Modules

**Files:**
- Create: `backend/app/schemas/__init__.py`
- Create: `backend/app/schemas/common.py`
- Create: `backend/app/schemas/auth.py`
- Create: `backend/app/schemas/user.py`
- Create: `backend/app/schemas/watchlist.py`
- Create: `backend/app/schemas/alert.py`
- Create: `backend/app/schemas/stock.py`
- Create: `backend/app/schemas/analysis.py`
- Create: `backend/app/schemas/admin.py`
- Modify: `backend/app/schemas.py` (replace with imports from new structure)

**Interfaces:**
- Produces: All Pydantic schemas at `app.schemas.*` and backward-compatible `app.schemas` import

- [ ] **Step 1: Create `backend/app/schemas/` directory and `common.py`**

```python
# backend/app/schemas/common.py
from pydantic import BaseModel, PaginationParams


class ErrorResponse(BaseModel):
    detail: str


class HealthResponse(BaseModel):
    status: str
    version: str | None = None


class PaginatedResponse(BaseModel):
    total: int
    page: int
    per_page: int
    items: list
```

- [ ] **Step 2: Create `backend/app/schemas/auth.py`**

```python
# backend/app/schemas/auth.py
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None
    invite_code: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: str
```

- [ ] **Step 3: Create `backend/app/schemas/user.py`**

```python
# backend/app/schemas/user.py
from pydantic import BaseModel, EmailStr


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str | None = None
    is_active: bool
    is_admin: bool

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    full_name: str | None = None
```

- [ ] **Step 4: Create `backend/app/schemas/watchlist.py`**

```python
# backend/app/schemas/watchlist.py
from pydantic import BaseModel


class WatchlistCreate(BaseModel):
    symbol: str


class WatchlistResponse(BaseModel):
    id: int
    user_id: int
    symbol: str

    model_config = {"from_attributes": True}
```

- [ ] **Step 5: Create `backend/app/schemas/alert.py`**

```python
# backend/app/schemas/alert.py
from pydantic import BaseModel
from datetime import datetime


class AlertConditionCreate(BaseModel):
    condition_type: str
    threshold: float
    logic: str = "AND"


class AlertCreate(BaseModel):
    symbol: str
    alert_type: str
    threshold: float | None = None
    conditions: list[AlertConditionCreate] | None = None


class AlertResponse(BaseModel):
    id: int
    user_id: int
    symbol: str
    alert_type: str
    threshold: float | None
    is_active: bool

    model_config = {"from_attributes": True}


class NotificationDeliveryResponse(BaseModel):
    id: int
    channel: str
    status: str
    error_message: str | None

    model_config = {"from_attributes": True}


class TriggeredAlertResponse(BaseModel):
    id: int
    alert_id: int
    triggered_at: datetime | None
    price_at_trigger: float | None
    deliveries: list[NotificationDeliveryResponse]

    model_config = {"from_attributes": True}
```

- [ ] **Step 6: Create `backend/app/schemas/stock.py`**

```python
# backend/app/schemas/stock.py
from pydantic import BaseModel
from datetime import date


class OHLCVResponse(BaseModel):
    date: date
    open: float
    high: float
    low: float
    close: float
    volume: int


class StockInfoResponse(BaseModel):
    symbol: str
    name: str | None = None
    sector: str | None = None
    industry: str | None = None
    market_cap: float | None = None
    pe_ratio: float | None = None
    dividend_yield: float | None = None


class IndicatorResponse(BaseModel):
    date: date
    sma_20: float | None = None
    sma_50: float | None = None
    sma_200: float | None = None
    ema_12: float | None = None
    ema_26: float | None = None
    rsi: float | None = None
    macd: float | None = None
    macd_signal: float | None = None
    macd_hist: float | None = None
    bb_upper: float | None = None
    bb_middle: float | None = None
    bb_lower: float | None = None
    atr: float | None = None


class FundamentalsResponse(BaseModel):
    symbol: str
    piotroski_score: int | None = None
    profitability_score: float | None = None
    dividend_quality_score: float | None = None
    revenue: int | None = None
    net_income: int | None = None
    operating_margin: float | None = None
    ROE: float | None = None
    debt_to_equity: float | None = None


class DividendResponse(BaseModel):
    date: date | None
    amount: float
    dividend_type: str | None

    model_config = {"from_attributes": True}
```

- [ ] **Step 7: Create `backend/app/schemas/analysis.py`**

```python
# backend/app/schemas/analysis.py
from pydantic import BaseModel
from datetime import date


class SignalResponse(BaseModel):
    symbol: str
    signal: str
    confidence: float
    date: date
    indicators: dict


class SignalDetailResponse(BaseModel):
    symbol: str
    signal: str
    confidence: float
    bias: float | None = None
    kdj: dict | None = None
    macd_hist: float | None = None
    volume_ratio: float | None = None
    rsi: float | None = None
```

- [ ] **Step 8: Create `backend/app/schemas/admin.py`**

```python
# backend/app/schemas/admin.py
from pydantic import BaseModel


class InviteCodeCreate(BaseModel):
    pass


class InviteCodeResponse(BaseModel):
    code: str
    created_at: str
    used_by: int | None

    model_config = {"from_attributes": True}


class AuditLogResponse(BaseModel):
    id: int
    user_id: int | None
    action: str
    resource: str | None
    details: str | None
    ip_address: str | None
    created_at: str

    model_config = {"from_attributes": True}
```

- [ ] **Step 9: Create `backend/app/schemas/__init__.py`**

```python
# backend/app/schemas/__init__.py
from .common import ErrorResponse, HealthResponse, PaginatedResponse
from .auth import LoginRequest, RegisterRequest, TokenResponse, RefreshTokenRequest
from .user import UserResponse, UserUpdate
from .watchlist import WatchlistCreate, WatchlistResponse
from .alert import (
    AlertConditionCreate,
    AlertCreate,
    AlertResponse,
    NotificationDeliveryResponse,
    TriggeredAlertResponse,
)
from .stock import (
    OHLCVResponse,
    StockInfoResponse,
    IndicatorResponse,
    FundamentalsResponse,
    DividendResponse,
)
from .analysis import SignalResponse, SignalDetailResponse
from .admin import InviteCodeCreate, InviteCodeResponse, AuditLogResponse

__all__ = [
    "ErrorResponse",
    "HealthResponse",
    "PaginatedResponse",
    "LoginRequest",
    "RegisterRequest",
    "TokenResponse",
    "RefreshTokenRequest",
    "UserResponse",
    "UserUpdate",
    "WatchlistCreate",
    "WatchlistResponse",
    "AlertConditionCreate",
    "AlertCreate",
    "AlertResponse",
    "NotificationDeliveryResponse",
    "TriggeredAlertResponse",
    "OHLCVResponse",
    "StockInfoResponse",
    "IndicatorResponse",
    "FundamentalsResponse",
    "DividendResponse",
    "SignalResponse",
    "SignalDetailResponse",
    "InviteCodeCreate",
    "InviteCodeResponse",
    "AuditLogResponse",
]
```

- [ ] **Step 10: Replace `backend/app/schemas.py` with backward-compatible re-export**

```python
# backend/app/schemas.py
from .schemas import (
    ErrorResponse,
    HealthResponse,
    PaginatedResponse,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    RefreshTokenRequest,
    UserResponse,
    UserUpdate,
    WatchlistCreate,
    WatchlistResponse,
    AlertConditionCreate,
    AlertCreate,
    AlertResponse,
    NotificationDeliveryResponse,
    TriggeredAlertResponse,
    OHLCVResponse,
    StockInfoResponse,
    IndicatorResponse,
    FundamentalsResponse,
    DividendResponse,
    SignalResponse,
    SignalDetailResponse,
    InviteCodeCreate,
    InviteCodeResponse,
    AuditLogResponse,
)

__all__ = [
    "ErrorResponse",
    "HealthResponse",
    "PaginatedResponse",
    "LoginRequest",
    "RegisterRequest",
    "TokenResponse",
    "RefreshTokenRequest",
    "UserResponse",
    "UserUpdate",
    "WatchlistCreate",
    "WatchlistResponse",
    "AlertConditionCreate",
    "AlertCreate",
    "AlertResponse",
    "NotificationDeliveryResponse",
    "TriggeredAlertResponse",
    "OHLCVResponse",
    "StockInfoResponse",
    "IndicatorResponse",
    "FundamentalsResponse",
    "DividendResponse",
    "SignalResponse",
    "SignalDetailResponse",
    "InviteCodeCreate",
    "InviteCodeResponse",
    "AuditLogResponse",
]
```

- [ ] **Step 11: Run tests to verify no breaking changes**

Run: `pytest backend/tests/ -v --tb=short -x`
Expected: All tests pass

- [ ] **Step 12: Commit**

```bash
git add backend/app/schemas/ backend/app/schemas.py
git commit -m "refactor: split schemas.py into domain modules"
```

---

### Task 3: Extract Duplicate Cleanup Helpers

**Files:**
- Create: `backend/app/services/cleanup.py`
- Modify: `backend/app/routes/stocks.py` (after split in Task 4)
- Modify: `backend/app/routes/analysis.py`

**Interfaces:**
- Produces: `cleanup.py` with `_clean()`, `_clean_list()` functions
- Consumes: None

- [ ] **Step 1: Create `backend/app/services/cleanup.py`**

```python
# backend/app/services/cleanup.py
from pandas import DataFrame


def _clean(value) -> float | None:
    if value is None:
        return None
    try:
        result = float(value)
        return None if np.isnan(result) else result
    except (ValueError, TypeError):
        return None


def _clean_list(values: list) -> list[float | None]:
    return [_clean(v) for v in values]
```

Note: Add `import numpy as np` at top (or use `math.isnan` with float check)

- [ ] **Step 2: Update `routes/analysis.py` to import from cleanup.py**

Replace local `_clean` and `_clean_list` definitions with:
```python
from app.services.cleanup import _clean, _clean_list
```

- [ ] **Step 3: Update `routes/stocks.py` to import from cleanup.py** (after Task 4 split)

- [ ] **Step 4: Run tests**

Run: `pytest backend/tests/ -v --tb=short -x`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/cleanup.py backend/app/routes/analysis.py
git commit -m "refactor: extract duplicate _clean functions to shared module"
```

---

### Task 4: Split routes/stocks.py into Focused Route Modules

**Files:**
- Create: `backend/app/routes/stock_info.py`
- Create: `backend/app/routes/search.py`
- Create: `backend/app/routes/news.py`
- Modify: `backend/app/routes/stocks.py` (reduce to OHLCV + indicators only)
- Modify: `backend/app/routes/__init__.py` (add re-exports)

**Interfaces:**
- Produces: `routes/stock_info.py`, `routes/search.py`, `routes/news.py`
- Consumes: `schemas/stock.py`, `services/cleanup.py`

**Approach:** Move specific concerns out of stocks.py while preserving API endpoints.

- [ ] **Step 1: Create `backend/app/routes/stock_info.py`** with `/stock/{symbol}/info`, `/stock/{symbol}/fundamentals`, `/stock/{symbol}/dividends` endpoints
- [ ] **Step 2: Create `backend/app/routes/search.py`** with `/stock/search` endpoint
- [ ] **Step 3: Create `backend/app/routes/news.py`** with `/stock/{symbol}/news` endpoint
- [ ] **Step 4: Reduce `routes/stocks.py`** to OHLCV and indicator endpoints only
- [ ] **Step 5: Update `routes/__init__.py`** to re-export from all new modules
- [ ] **Step 6: Run tests and commit**

---

### Task 5: Extract Cron Routes from main.py

**Files:**
- Create: `backend/app/routes/cron.py`
- Modify: `backend/app/main.py` (remove cron route registration)

**Interfaces:**
- Produces: `routes/cron.py` with `/cron/check-alerts` and `/cron/ingest` endpoints
- Consumes: `services/alert_checker.py`, `services/ingestion.py`

- [ ] **Step 1: Create `backend/app/routes/cron.py`**

```python
# backend/app/routes/cron.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.alert_checker import check_all_alerts
from app.services.ingestion import nightly_ingestion

router = APIRouter(prefix="/cron", tags=["cron"])


@router.post("/check-alerts")
async def cron_check_alerts(db: AsyncSession = Depends(get_db)):
    await check_all_alerts(db)
    return {"status": "ok"}


@router.post("/ingest")
async def cron_ingest(db: AsyncSession = Depends(get_db)):
    await nightly_ingestion(db)
    return {"status": "ok"}
```

- [ ] **Step 2: Update `backend/app/main.py`** to import and register cron router

```python
from app.routes.cron import router as cron_router
# ... in app construction:
app.include_router(cron_router)
```

- [ ] **Step 3: Run tests and commit**

---

### Task 6: Decompose alert_checker.py

**Files:**
- Create: `backend/app/services/notification/__init__.py`
- Create: `backend/app/services/notification/dispatcher.py`
- Create: `backend/app/services/notification/discord.py`
- Create: `backend/app/services/notification/email.py`
- Modify: `backend/app/services/alert_checker.py` (reduce to evaluation only)

**Approach:** Extract notification dispatch into channel-specific modules.

- [ ] **Step 1: Create `backend/app/services/notification/dispatcher.py`** with `NotificationDispatcher` class
- [ ] **Step 2: Create `backend/app/services/notification/discord.py`** with `DiscordChannel`
- [ ] **Step 3: Create `backend/app/services/notification/email.py`** with `EmailChannel`
- [ ] **Step 4: Reduce `alert_checker.py`** to evaluation logic only
- [ ] **Step 5: Run tests and commit**

---

## Migration Order

| Order | Task | Rationale |
|-------|------|-----------|
| 1 | Task 1: Split models.py | Foundation - no dependencies |
| 2 | Task 2: Split schemas.py | Foundation - no dependencies |
| 3 | Task 3: Extract cleanup helpers | Reduces coupling before route split |
| 4 | Task 4: Split routes/stocks.py | Uses Task 3 cleanup helpers |
| 5 | Task 5: Extract cron routes | Uses Tasks 1-4 services |
| 6 | Task 6: Decompose alert_checker.py | Most complex - do last |

---

## Verification Commands

After each task:
```bash
pytest backend/tests/ -v --tb=short
```

After all tasks:
```bash
pytest backend/tests/ -v
python -m py_compile backend/app/models.py backend/app/schemas.py
ruff check backend/app/
tsc --noEmit --project frontend/
```

---

## Rollback Plan

If any task causes issues:
```bash
git checkout HEAD~1 -- backend/app/
git stash
```

Each task is independently commit-able. Revert by checking out the previous commit for affected files only.

---

**Plan complete.** Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
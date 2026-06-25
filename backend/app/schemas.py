from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime
from typing import Optional


# ─── Auth schemas ───
class UserRegister(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        if not v.replace("_", "").isalnum():
            raise ValueError("Username must be alphanumeric (underscores ok)")
        return v.lower()


class UserLogin(BaseModel):
    email_or_username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    is_active: bool
    is_admin: bool = False
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Stock schemas ───
class StockDataResponse(BaseModel):
    symbol: str
    period: str
    cached_at: str = ""
    timestamp: list[str]
    open: list[float | None]
    high: list[float | None]
    low: list[float | None]
    close: list[float | None]
    volume: list[int | None]


class IndicatorsResponse(BaseModel):
    symbol: str
    period: str
    cached_at: str = ""
    timestamp: list[str]
    sma20: list[float | None]
    sma50: list[float | None]
    sma200: list[float | None]
    ema12: list[float | None]
    ema26: list[float | None]
    rsi: list[float | None]
    macd: list[float | None]
    macd_signal: list[float | None]
    macd_hist: list[float | None]
    bb_upper: list[float | None]
    bb_middle: list[float | None]
    bb_lower: list[float | None]
    atr: list[float | None]


class StockInfoResponse(BaseModel):
    symbol: str
    cached_at: str = ""
    short_name: str
    long_name: Optional[str]
    sector: Optional[str]
    industry: Optional[str]
    price: float
    currency: Optional[str]
    market_cap: Optional[int]
    sharesOutstanding: Optional[int]
    trailing_pe: Optional[float]
    forward_pe: Optional[float]
    dividend_yield: Optional[float]
    avg_volume: Optional[int]
    beta: Optional[float]
    week_52_high: Optional[float]
    week_52_low: Optional[float]


class CompareRequest(BaseModel):
    symbols: list[str] = Field(..., min_length=2, max_length=5)
    period: str = "1mo"


class CompareStockData(BaseModel):
    symbol: str
    timestamp: list[str]
    close: list[float | None]
    volume: list[int | None]


class CompareResponse(BaseModel):
    stocks: list[CompareStockData]


# ─── Alert schemas ───
class AlertCreate(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=20)
    symbol_name: Optional[str] = Field(None, max_length=200)
    condition_type: str = Field(
        ..., pattern="^(above|below|pct_change_up|pct_change_down)$"
    )
    threshold: float = Field(
        ..., description="Price threshold or percentage change threshold"
    )
    period: str = Field(default="1h", pattern="^(5m|15m|30m|1h|4h|1d)$")

    @field_validator("symbol")
    @classmethod
    def symbol_upper(cls, v: str) -> str:
        return v.upper()


class AlertUpdate(BaseModel):
    symbol: Optional[str] = Field(None, min_length=1, max_length=20)
    condition_type: Optional[str] = Field(
        None, pattern="^(above|below|pct_change_up|pct_change_down)$"
    )
    threshold: Optional[float] = None
    period: Optional[str] = Field(None, pattern="^(5m|15m|30m|1h|4h|1d)$")
    enabled: Optional[bool] = None


class AlertResponse(BaseModel):
    id: int
    user_id: str
    symbol: str
    symbol_name: Optional[str] = None
    condition_type: str
    threshold: float
    period: str
    enabled: bool
    cooldown_until: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TriggeredAlertResponse(BaseModel):
    id: int
    alert_id: Optional[int]
    user_id: str
    symbol: str
    symbol_name: Optional[str] = None
    condition_type: str
    trigger_price: float
    threshold_value: float
    triggered_at: datetime
    notified: bool
    read: bool

    class Config:
        from_attributes = True


class NotificationSettingsResponse(BaseModel):
    user_id: str
    discord_webhook_url: Optional[str] = None
    email_address: Optional[str] = None
    email_enabled: bool
    discord_enabled: bool
    default_period: str
    timezone: str
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class NotificationSettingsUpdate(BaseModel):
    discord_webhook_url: Optional[str] = None
    email_address: Optional[EmailStr] = None
    email_enabled: bool = False
    discord_enabled: bool = True
    default_period: str = Field(default="1h", pattern="^(5m|15m|30m|1h|4h|1d)$")
    timezone: str = "UTC"


# ─── Invite code schemas ───
class InviteCodeCreate(BaseModel):
    expires_in_days: int = Field(default=7, ge=1, le=365)


class InviteCodeResponse(BaseModel):
    id: int
    code: str
    created_by: str
    used_by: Optional[str] = None
    used_at: Optional[datetime] = None
    expires_at: datetime
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InviteCodeListResponse(BaseModel):
    codes: list[InviteCodeResponse]
    total: int


class WatchlistCreate(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=20)


class WatchlistResponse(BaseModel):
    id: int
    user_id: str
    symbol: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

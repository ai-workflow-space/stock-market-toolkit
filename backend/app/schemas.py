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
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ─── Stock schemas ───
class StockDataResponse(BaseModel):
    symbol: str
    period: str
    timestamp: list[str]
    open: list[float | None]
    high: list[float | None]
    low: list[float | None]
    close: list[float | None]
    volume: list[int | None]

class IndicatorsResponse(BaseModel):
    symbol: str
    period: str
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

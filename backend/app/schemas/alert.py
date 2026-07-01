from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime
from typing import Optional


class AlertConditionCreate(BaseModel):
    metric: str = Field(..., pattern="^(price|rsi|macd_hist|signal|pct_change)$")
    operator: str = Field(..., pattern="^(gt|lt|crosses_above|eq)$")
    value: float


class AlertConditionResponse(BaseModel):
    id: int
    alert_id: int
    metric: str
    operator: str
    value: float

    class Config:
        from_attributes = True


class AlertCreate(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=20)
    symbol_name: Optional[str] = Field(None, max_length=200)
    condition_type: Optional[str] = Field(
        None, pattern="^(above|below|pct_change_up|pct_change_down)$"
    )
    threshold: Optional[float] = Field(
        None, description="Price threshold or percentage change threshold"
    )
    period: str = Field(default="1h", pattern="^(5m|15m|30m|1h|4h|1d)$")
    combinator: str = Field(default="all", pattern="^(all|any)$")
    conditions: list[AlertConditionCreate] = []

    @field_validator("symbol")
    @classmethod
    def symbol_upper(cls, v: str) -> str:
        return v.upper()


class AlertUpdate(BaseModel):
    symbol: Optional[str] = Field(None, min_length=1, max_length=20)
    condition_type: Optional[str] = Field(
        None, pattern="^(above|below|pct_change_up|pct_change_down|multi)$"
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
    combinator: Optional[str] = "all"
    conditions: list[AlertConditionResponse] = []
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
    email_subject: Optional[str] = None
    email_body: Optional[str] = None

    class Config:
        from_attributes = True


class NotificationSettingsUpdate(BaseModel):
    discord_webhook_url: Optional[str] = None
    email_address: Optional[EmailStr] = None
    email_enabled: bool = False
    discord_enabled: bool = True
    default_period: str = Field(default="1h", pattern="^(5m|15m|30m|1h|4h|1d)$")
    timezone: str = "UTC"
    email_subject: Optional[str] = Field(default=None, max_length=255)
    email_body: Optional[str] = None


class NotificationDeliveryResponse(BaseModel):
    id: int
    triggered_alert_id: Optional[int]
    user_id: str
    channel: str  # discord | email | webhook
    status: str  # success | failed
    http_status: Optional[int]
    error: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class DiscordTestRequest(BaseModel):
    webhook_url: str = Field(..., min_length=1)

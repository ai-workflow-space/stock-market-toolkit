from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class WatchlistCreate(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=20)


class WatchlistResponse(BaseModel):
    id: int
    user_id: str
    symbol: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

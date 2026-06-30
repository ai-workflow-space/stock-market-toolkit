from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class JobRunResponse(BaseModel):
    id: int
    job_type: str
    status: str
    symbols_processed: int = 0
    total_symbols: int = 0
    errors: int = 0
    error_details: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class IngestStatusResponse(BaseModel):
    last_run: Optional[JobRunResponse] = None
    is_running: bool = False

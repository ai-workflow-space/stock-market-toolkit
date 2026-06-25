"""
Stock Market Toolkit — FastAPI Backend (Production)
"""

from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from sqlalchemy import select
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging

from app import __version__
from app.config import get_settings
from app.routes import (
    auth,
    stocks,
    alerts,
    mcp,
    analysis,
    admin,
    watchlist,
    fundamentals,
)

settings = get_settings()
log = logging.getLogger(__name__)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Running database migrations...")
    from alembic import command
    from alembic.config import Config

    # Run Alembic in-process (no dependency on the `alembic` binary being on
    # PATH or on the working directory). A failed migration must abort startup
    # rather than let the app boot against a missing/half-applied schema.
    backend_dir = Path(__file__).parent.parent
    alembic_cfg = Config(str(backend_dir / "alembic.ini"))
    try:
        command.upgrade(alembic_cfg, "head")
    except Exception:
        log.exception("Alembic migration failed; aborting startup")
        raise
    log.info("Migrations complete. Stock Market Toolkit API started.")
    yield
    log.info("Shutting down Stock Market Toolkit API...")


app = FastAPI(
    title="Stock Market Toolkit API",
    description="Production stock market analysis API with user authentication",
    version=__version__,
    docs_url="/docs",
    redoc_url="/redoc",
    redirect_slashes=False,
    lifespan=lifespan,
)

# ─── Middleware ───
# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limit exceeded handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── Routes ───
app.include_router(auth.router)
app.include_router(stocks.router)
app.include_router(alerts.router)
app.include_router(mcp.router)
app.include_router(analysis.router)
app.include_router(watchlist.router)
app.include_router(admin.router)
app.include_router(fundamentals.router)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "stock-market-toolkit-api",
        "version": __version__,
    }


@app.get("/")
async def root():
    return {
        "name": "Stock Market Toolkit API",
        "version": __version__,
        "docs": "/docs",
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    log.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


@app.post("/cron/check-alerts")
async def cron_check_alerts():
    """Cron endpoint to check all price alerts. Called every 15 minutes by external scheduler."""
    from app.services.alert_checker import check_alerts

    await check_alerts()
    return {"status": "ok", "message": "Alerts checked"}


@app.post("/cron/ingest")
async def cron_ingest():
    """Cron endpoint to trigger nightly fundamentals ingestion."""
    from app.database import AsyncSessionLocal
    from app.models import JobRun

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(JobRun)
            .where(JobRun.job_type == "nightly_ingest", JobRun.status == "running")
            .limit(1)
        )
        if result.scalar_one_or_none():
            return {"status": "skipped", "message": "Ingestion already running"}

        job = JobRun(
            job_type="nightly_ingest",
            status="running",
            total_symbols=0,
        )
        db.add(job)
        await db.commit()
        job_run_id = job.id

    from app.services.ingestion import run_nightly_ingest

    processed = await run_nightly_ingest(job_run_id=job_run_id)
    return {"status": "ok", "symbols_processed": processed}


@app.get("/cron/ingest/status")
async def cron_ingest_status():
    """Return status of the last nightly ingestion run."""
    from app.database import AsyncSessionLocal
    from app.services.ingestion import get_latest_job_run

    async with AsyncSessionLocal() as db:
        last_run = await get_latest_job_run(db)

    if last_run is None:
        return {"last_run": None, "is_running": False}

    return {
        "last_run": {
            "id": last_run.id,
            "job_type": last_run.job_type,
            "status": last_run.status,
            "symbols_processed": last_run.symbols_processed or 0,
            "total_symbols": last_run.total_symbols or 0,
            "errors": last_run.errors or 0,
            "error_details": last_run.error_details,
            "started_at": (
                last_run.started_at.isoformat() if last_run.started_at else None
            ),
            "completed_at": (
                last_run.completed_at.isoformat() if last_run.completed_at else None
            ),
        },
        "is_running": last_run.status == "running" if last_run else False,
    }

"""
Stock Market Toolkit — FastAPI Backend (Production)
"""

from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging

from app import __version__
from app.config import get_settings
from app.routes import auth, stocks, alerts, mcp, analysis, admin, watchlist

settings = get_settings()
log = logging.getLogger(__name__)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Running database migrations...")
    import subprocess

    result = subprocess.run(
        ["alembic", "upgrade", "head"],
        cwd=Path(__file__).parent.parent,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        log.warning(f"Alembic migration warning: {result.stderr.strip()}")
    else:
        log.info("Migrations complete.")
    log.info("Stock Market Toolkit API started.")
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

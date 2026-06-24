from fastapi import APIRouter

router = APIRouter(prefix="/api/mcp", tags=["mcp"])


@router.get("/health")
async def mcp_health():
    return {"status": "ok", "service": "mcp"}


@router.get("/yf-health")
async def yf_health():
    """Check if yfinance is functional by fetching a test ticker."""
    import yfinance as yf

    try:
        ticker = yf.Ticker("AAPL")
        ticker.fast_info  # lightweight attribute access
        return {"status": "ok", "service": "yfinance", "message": "yfinance is working"}
    except Exception as e:
        return {"status": "error", "service": "yfinance", "message": str(e)}, 503


@router.get("/status")
async def mcp_status():
    return {"status": "ready", "service": "mcp"}

from fastapi import APIRouter

router = APIRouter(prefix="/mcp", tags=["mcp"])


@router.get("/health")
async def mcp_health():
    """Health check endpoint for MCP service."""
    return {"status": "ok", "service": "mcp"}


@router.get("/status")
async def mcp_status():
    """Status endpoint for MCP service."""
    return {"status": "ready", "service": "mcp"}
import time
import structlog
from typing import Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

EXCLUDED_PATHS = frozenset({
    "/health",
    "/api/admin/logs",
    "/api/admin/audit-logs",
    "/api/admin/access-logs",
})

log = structlog.get_logger(__name__)


def _try_get_user_id(request: Request) -> Optional[str]:
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        return None
    token = auth[7:]
    try:
        from jose import jwt
        from app.config import get_settings
        settings = get_settings()
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        return payload.get("sub")
    except Exception:
        return None


def _get_client_ip(request: Request) -> Optional[str]:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


class AccessLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if path in EXCLUDED_PATHS:
            return await call_next(request)

        start = time.monotonic()
        response = await call_next(request)
        elapsed_ms = round((time.monotonic() - start) * 1000)

        user_id = _try_get_user_id(request)
        request_id = getattr(request.state, "request_id", None)

        log.info(
            "access",
            type="access",
            ip=_get_client_ip(request),
            method=request.method,
            path=path,
            status=response.status_code,
            ms=elapsed_ms,
            request_id=request_id,
            user_id=user_id,
        )

        return response

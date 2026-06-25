"""Circuit breaker for provider failover with configurable thresholds."""

import time


class CircuitBreaker:
    """Tracks failures and opens the circuit to prevent cascading retries.

    After *max_failures* consecutive failures the circuit opens and stays
    open for *cooldown_seconds*.  Once the cooldown elapses the next call
    enters a half-open state: one probe request is allowed.  If it succeeds
    the circuit closes; if it fails the circuit re-opens for another
    cooldown period.
    """

    def __init__(self, max_failures: int = 3, cooldown_seconds: float = 60.0) -> None:
        self._max_failures = max_failures
        self._cooldown_seconds = cooldown_seconds
        self._failure_count = 0
        self._last_failure_time: float | None = None
        self._state: str = "closed"

    # ── Public interface ──────────────────────────────────────────────

    @property
    def state(self) -> str:
        return self._state

    @property
    def failure_count(self) -> int:
        return self._failure_count

    def is_open(self) -> bool:
        """Return True if the circuit should reject requests."""
        if self._state == "closed":
            return False
        if self._state == "open":
            if self._last_failure_time is not None and (
                time.time() - self._last_failure_time >= self._cooldown_seconds
            ):
                self._state = "half-open"
                return False
            return True
        return False  # half-open — allow one probe

    def record_failure(self) -> None:
        self._failure_count += 1
        self._last_failure_time = time.time()
        if self._failure_count >= self._max_failures:
            self._state = "open"

    def record_success(self) -> None:
        self._failure_count = 0
        self._last_failure_time = None
        self._state = "closed"

    def reset(self) -> None:
        self._failure_count = 0
        self._last_failure_time = None
        self._state = "closed"

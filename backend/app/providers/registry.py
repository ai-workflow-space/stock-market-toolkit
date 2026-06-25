"""Provider chain registry — maps chain names to ordered provider lists."""

from typing import Sequence

# Each entry is an ordered list of provider *name* attributes (matching
# the ``.name`` on provider instances).  The first name is the primary;
# subsequent names are fallbacks tried in order when the primary fails.
PROVIDER_CHAINS: dict[str, Sequence[str]] = {
    "default": ["yfinance"],
    "with_fallback": ["yfinance"],
}


def get_chain(name: str = "default") -> Sequence[str]:
    """Return the ordered provider list for *name*."""
    return PROVIDER_CHAINS.get(name, PROVIDER_CHAINS["default"])

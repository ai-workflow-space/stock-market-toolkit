"""
Market hours utility — timezone-aware open/closed checks for US and Taiwan equity markets.
Uses ZoneInfo (Python 3.9+ stdlib). No pytz, no pandas_market_calendars.
"""

from datetime import datetime
from zoneinfo import ZoneInfo

# US federal holidays for 2026 — hard-coded as (month, day) tuples.
# Note: floating holidays (MLK Day, Presidents' Day, Memorial Day, Labor Day,
# Columbus Day) are computed for 2026 only. In production these would be
# calculated dynamically; the hand-rolled table keeps this step self-contained.
_US_HOLIDAYS_2026 = {
    (1, 1): "New Year's Day",
    (1, 19): "Martin Luther King Jr. Day",  # 3rd Mon Jan
    (2, 16): "Presidents' Day",  # 3rd Mon Feb
    (5, 25): "Memorial Day",  # last Mon May
    (6, 19): "Juneteenth",
    (7, 3): "Independence Day (observed)",  # Jul 4 falls on Saturday in 2026
    (9, 7): "Labor Day",  # 1st Mon Sep
    (10, 12): "Columbus Day",  # 2nd Mon Oct
    (11, 11): "Veterans Day",
    (12, 25): "Christmas Day",
}


def _is_us_holiday(dt: datetime) -> bool:
    """Return True if the given datetime (in America/New_York) is a US market holiday."""
    return (dt.month, dt.day) in _US_HOLIDAYS_2026


def _us_market_open(dt: datetime) -> bool:
    """
    Return True if US equity markets are open at the given UTC datetime.
    US hours: Mon-Fri, 09:30–16:05 ET (includes 5-min post-close buffer).
    """
    ny = dt.astimezone(ZoneInfo("America/New_York"))
    weekday = ny.weekday()

    # Weekend
    if weekday >= 5:
        return False

    # Holiday
    if _is_us_holiday(ny):
        return False

    # Time check: 09:30–16:05 ET
    hour, minute = ny.hour, ny.minute
    if hour < 9 or hour > 16:
        return False
    if hour == 9 and minute < 30:
        return False
    if hour == 16 and minute > 5:
        return False

    return True


def _tw_market_open(dt: datetime) -> bool:
    """
    Return True if Taiwan equity markets are open at the given UTC datetime.
    TW hours: Mon-Fri, 09:00–13:35 TPE (includes 5-min post-close buffer).
    """
    tw = dt.astimezone(ZoneInfo("Asia/Taipei"))
    weekday = tw.weekday()

    # Weekend (Taiwan exchanges are closed Sat/Sun)
    if weekday >= 5:
        return False

    # Time check: 09:00–13:35 TPE
    hour, minute = tw.hour, tw.minute
    if hour < 9 or hour > 13:
        return False
    if hour == 9 and minute < 0:
        return False
    if hour == 13 and minute > 35:
        return False

    return True


def is_market_open(symbol: str, now_utc: datetime) -> bool:
    """
    Return True if the symbol's primary exchange is open at now_utc (UTC).

    Routing:
    - Symbols ending in .TW or .TWO  → Taiwan exchange → _tw_market_open()
    - All other symbols             → US exchange     → _us_market_open()
    """
    sym = symbol.upper()
    if sym.endswith(".TW") or sym.endswith(".TWO"):
        return _tw_market_open(now_utc)
    return _us_market_open(now_utc)
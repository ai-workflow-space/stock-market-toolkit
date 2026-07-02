"""Unit tests for market_hours — GitHub #243."""

from datetime import datetime, timezone


from app.services.market_hours import is_market_open


# ---------------------------------------------------------------------------
# US market
# ---------------------------------------------------------------------------

class TestUSMarket:
    def test_open_during_us_session(self):
        """2026-03-02 14:30 UTC is a Monday; US markets are open (09:30–16:05 ET)."""
        dt = datetime(2026, 3, 2, 14, 30, tzinfo=timezone.utc)
        assert is_market_open("AAPL", dt) is True

    def test_closed_after_us_close(self):
        """2026-03-02 21:00 UTC is Mon; US markets close at 16:05 ET = 21:05 UTC → 21:00 is just before."""
        # Actually 16:05 ET = 21:05 UTC, so 21:00 UTC is still open with 5-min buffer.
        # Let's use 21:06 UTC which is past the buffer.
        dt = datetime(2026, 3, 2, 21, 6, tzinfo=timezone.utc)
        assert is_market_open("AAPL", dt) is False

    def test_closed_on_new_year_holiday(self):
        """2026-01-01 is a US market holiday."""
        dt = datetime(2026, 1, 1, 14, 30, tzinfo=timezone.utc)  # would be open mid-session
        assert is_market_open("AAPL", dt) is False

    def test_closed_on_christmas(self):
        """2026-12-25 is a US market holiday."""
        dt = datetime(2026, 12, 25, 14, 30, tzinfo=timezone.utc)  # would be open mid-session
        assert is_market_open("AAPL", dt) is False

    def test_routes_aapl_to_us(self):
        """Plain symbol routes to US market."""
        dt = datetime(2026, 3, 2, 14, 30, tzinfo=timezone.utc)
        # US: 14:30 UTC = 09:30 ET (market open)
        assert is_market_open("AAPL", dt) is True
        # TW would be closed at this UTC time (01:30 TPE)
        assert is_market_open("AAPL", dt) is True  # confirmed US path

    def test_post_close_buffer_us(self):
        """16:05 ET = 21:05 UTC still counts as open (5-min buffer)."""
        # 21:05 UTC = 16:05 ET — should still be open
        dt = datetime(2026, 3, 2, 21, 5, tzinfo=timezone.utc)
        assert is_market_open("AAPL", dt) is True
        # 21:06 UTC = 16:06 ET — just past buffer, should be closed
        dt2 = datetime(2026, 3, 2, 21, 6, tzinfo=timezone.utc)
        assert is_market_open("AAPL", dt2) is False

    def test_dst_starts_2026(self):
        """2026-03-08: DST starts in US on Sunday. Use Mon Mar 9 to verify the
        EDT offset (14:30 UTC = 10:30 EDT) is correctly within market hours."""
        # Sunday Mar 8 is the DST transition — markets are closed anyway (weekday=6)
        dt_sunday = datetime(2026, 3, 8, 12, 0, tzinfo=timezone.utc)
        assert is_market_open("AAPL", dt_sunday) is False  # Sunday, always closed

        # Monday Mar 9 — DST is in effect (EDT, UTC-4)
        # 14:30 UTC = 10:30 EDT → within 09:30–16:05
        dt_mon = datetime(2026, 3, 9, 14, 30, tzinfo=timezone.utc)
        assert is_market_open("AAPL", dt_mon) is True

    def test_dst_ends_2026(self):
        """2026-11-01: DST ends in US on Sunday. Use Mon Nov 2 to verify the
        EST offset (14:30 UTC = 09:30 EST) is correctly at market open."""
        # Sunday Nov 1 — markets closed
        dt_sunday = datetime(2026, 11, 1, 12, 0, tzinfo=timezone.utc)
        assert is_market_open("AAPL", dt_sunday) is False

        # Monday Nov 2 — DST has ended, EST in effect (UTC-5)
        # 14:30 UTC = 09:30 EST = market open exactly
        dt_mon = datetime(2026, 11, 2, 14, 30, tzinfo=timezone.utc)
        assert is_market_open("AAPL", dt_mon) is True

    def test_weekend_closed_us(self):
        """US market is closed on weekends."""
        # Saturday
        dt = datetime(2026, 3, 7, 14, 30, tzinfo=timezone.utc)
        assert is_market_open("AAPL", dt) is False
        # Sunday
        dt2 = datetime(2026, 3, 8, 14, 30, tzinfo=timezone.utc)
        assert is_market_open("AAPL", dt2) is False


# ---------------------------------------------------------------------------
# Taiwan market
# ---------------------------------------------------------------------------

class TestTaiwanMarket:
    def test_open_during_tw_session(self):
        """2026-03-02 01:30 UTC is a Monday; TW markets are open (09:00–13:35 TPE)."""
        dt = datetime(2026, 3, 2, 1, 30, tzinfo=timezone.utc)
        assert is_market_open("2330.TW", dt) is True

    def test_closed_after_tw_close(self):
        """2026-03-02 05:00 UTC is Mon; TW markets close at 13:35 TPE = 05:35 UTC → 05:00 is before."""
        # Actually 13:35 TPE = 05:35 UTC, so 05:00 UTC is still open.
        # 05:36 UTC = 13:36 TPE → just past close
        dt = datetime(2026, 3, 2, 5, 36, tzinfo=timezone.utc)
        assert is_market_open("2330.TW", dt) is False

    def test_tw_suffix_routes_to_taiwan(self):
        """Symbol with .TW suffix routes to Taiwan exchange."""
        dt = datetime(2026, 3, 2, 1, 30, tzinfo=timezone.utc)  # TW open, US closed
        assert is_market_open("2330.TW", dt) is True
        # Same time US would also be open (if it were a weekday at a different time)
        # But here TW is open while US is also open — this proves routing

    def test_two_suffix_routes_to_taiwan(self):
        """Symbol with .TWO suffix routes to Taiwan exchange."""
        dt = datetime(2026, 3, 2, 1, 30, tzinfo=timezone.utc)
        assert is_market_open("2330.TWO", dt) is True

    def test_post_close_buffer_tw(self):
        """13:35 TPE = 05:35 UTC still counts as open (5-min buffer)."""
        # 05:35 UTC = 13:35 TPE → open (boundary)
        dt = datetime(2026, 3, 2, 5, 35, tzinfo=timezone.utc)
        assert is_market_open("2330.TW", dt) is True
        # 05:36 UTC = 13:36 TPE → just past buffer, closed
        dt2 = datetime(2026, 3, 2, 5, 36, tzinfo=timezone.utc)
        assert is_market_open("2330.TW", dt2) is False

    def test_weekend_closed_tw(self):
        """Taiwan market is closed on weekends."""
        # Saturday
        dt = datetime(2026, 3, 7, 1, 30, tzinfo=timezone.utc)
        assert is_market_open("2330.TW", dt) is False
        # Sunday
        dt2 = datetime(2026, 3, 8, 1, 30, tzinfo=timezone.utc)
        assert is_market_open("2330.TW", dt2) is False


# ---------------------------------------------------------------------------
# Routing logic
# ---------------------------------------------------------------------------

class TestRouting:
    def test_tw_suffix_routes_to_tw(self):
        dt = datetime(2026, 3, 2, 5, 0, tzinfo=timezone.utc)  # TW: 13:00 TPE, open; US: 00:00 ET, closed
        assert is_market_open("2330.TW", dt) is True  # TW route

    def test_two_suffix_routes_to_tw(self):
        dt = datetime(2026, 3, 2, 5, 0, tzinfo=timezone.utc)
        assert is_market_open("2330.TWO", dt) is True

    def test_plain_symbol_routes_to_us(self):
        # Pick a time when US is open but TW is closed
        dt = datetime(2026, 3, 2, 14, 30, tzinfo=timezone.utc)  # US 09:30 ET open; TW 21:30 TPE closed
        assert is_market_open("AAPL", dt) is True

    def test_symbol_uppercase_normalized(self):
        """Routing is case-insensitive."""
        dt_open = datetime(2026, 3, 2, 14, 30, tzinfo=timezone.utc)
        dt_closed = datetime(2026, 3, 2, 21, 6, tzinfo=timezone.utc)
        assert is_market_open("aapl", dt_open) is True
        assert is_market_open("aapl", dt_closed) is False
        assert is_market_open("2330.tw", datetime(2026, 3, 2, 1, 30, tzinfo=timezone.utc)) is True
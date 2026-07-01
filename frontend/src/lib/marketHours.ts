/**
 * Market hours utility — mirrors backend/app/services/market_hours.py.
 * Timezone-aware open/closed checks for US and Taiwan equity markets.
 * Uses the Intl.Segmenter-aware Date API (built-in, no external deps).
 */

/** US federal holidays for 2026 — hard-coded (month, day) → name. */
const US_HOLIDAYS_2026: Record<number, string> = {
  101: "New Year's Day",
  119: "Martin Luther King Jr. Day",
  216: "Presidents' Day",
  525: "Memorial Day",
  619: "Juneteenth",
  703: "Independence Day (observed)",
  907: "Labor Day",
  1012: "Columbus Day",
  1111: "Veterans Day",
  1225: "Christmas Day",
};

/** Returns true if the given UTC ms timestamp falls on a US market holiday (America/New_York). */
function isUsHoliday(utcMs: number): boolean {
  const nyDate = new Date(utcDateUtcMs(utcMs, "America/New_York"));
  const key = (nyDate.getMonth() + 1) * 100 + nyDate.getDate();
  return key in US_HOLIDAYS_2026;
}

/**
 * Convert a UTC ms timestamp to a local-wallclock Date for the given IANA timezone.
 * This is needed because TS Date only works in local/OS timezone.
 */
function utcDateUtcMs(utcMs: number, timezone: string): number {
  // Format in UTC, parse in the target timezone — works because we control the IANA name.
  // We use a helper that formats as YYYY-MM-DDTHH:mm in UTC then reads it as local in the tz.
  // Fallback: manually compute by iterating offset.
  const d = new Date(utcMs);
  // Create a formatter for the target timezone and extract the local date components.
  // Use Intl.DateTimeFormat for reliable wallclock conversion.
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const get = (unit: string) => parseInt(parts.find(p => p.type === unit)?.value ?? "0", 10);
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");
  const second = get("second");
  const local = Date.UTC(year, month - 1, day, hour, minute, second);
  return local;
}

/** Returns true if US equity markets (NYSE/NASDAQ) are open at the given UTC ms timestamp. */
function usMarketOpen(utcMs: number): boolean {
  const nyDate = new Date(utcDateUtcMs(utcMs, "America/New_York"));
  const weekday = nyDate.getDay();

  // Weekend
  if (weekday === 0 || weekday === 6) return false;

  // Holiday
  if (isUsHoliday(utcMs)) return false;

  // Time check: 09:30–16:05 ET
  const hour = nyDate.getHours();
  const minute = nyDate.getMinutes();
  if (hour < 9 || hour > 16) return false;
  if (hour === 9 && minute < 30) return false;
  if (hour === 16 && minute > 5) return false;

  return true;
}

/** Returns true if Taiwan equity markets (TWSE) are open at the given UTC ms timestamp. */
function twMarketOpen(utcMs: number): boolean {
  const twDate = new Date(utcDateUtcMs(utcMs, "Asia/Taipei"));
  const weekday = twDate.getDay();

  // Weekend
  if (weekday === 0 || weekday === 6) return false;

  // Time check: 09:00–13:35 TPE
  const hour = twDate.getHours();
  const minute = twDate.getMinutes();
  if (hour < 9 || hour > 13) return false;
  if (hour === 9 && minute < 0) return false;
  if (hour === 13 && minute > 35) return false;

  return true;
}

/**
 * Returns true if the symbol's primary exchange is open right now (UTC).
 * Routing:
 *   - Symbols ending in .TW or .TWO  → Taiwan exchange (TWSE)
 *   - All other symbols             → US exchange (NYSE/NASDAQ)
 */
export function isMarketOpen(symbol: string): boolean {
  const sym = symbol.toUpperCase();
  const nowUtcMs = Date.now();
  if (sym.endsWith(".TW") || sym.endsWith(".TWO")) {
    return twMarketOpen(nowUtcMs);
  }
  return usMarketOpen(nowUtcMs);
}

/**
 * Returns "open" | "closed" based on current market state.
 */
export type MarketStatus = "open" | "closed";

export function getMarketStatus(symbol: string): MarketStatus {
  return isMarketOpen(symbol) ? "open" : "closed";
}
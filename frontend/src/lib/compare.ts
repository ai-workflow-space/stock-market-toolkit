import type { StockData, Indicators } from "@/types";

export type SeriesRow = Record<string, string | number>;
export type SmaKey = "sma20" | "sma50" | "sma200";

/** Date label for row `i`, taken from the first ticker's timeline. */
const labelAt = (data: StockData[], i: number): string =>
  data[0]?.timestamp[i]
    ? new Date(data[0].timestamp[i]).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";

const maxLen = (data: StockData[]): number =>
  data.length ? Math.max(...data.map((s) => s.close.length)) : 0;

/** One row per timestamp: `{ date, [symbol]: close }`. Date is set on EVERY row. */
export function buildSeries(data: StockData[]): SeriesRow[] {
  return Array.from({ length: maxLen(data) }, (_, i) => {
    const row: SeriesRow = { date: labelAt(data, i) };
    data.forEach((s) => { row[s.symbol] = s.close[i]; });
    return row;
  });
}

/** Same as buildSeries but each ticker rebased to 100 at its first close. */
export function buildNormalizedSeries(data: StockData[]): SeriesRow[] {
  return Array.from({ length: maxLen(data) }, (_, i) => {
    const row: SeriesRow = { date: labelAt(data, i) };
    data.forEach((s) => {
      const base = s.close[0] || 1;
      row[s.symbol] = (s.close[i] / base) * 100;
    });
    return row;
  });
}

/** Close price per ticker plus `${symbol}_${smaKey}` overlay columns. */
export function buildSmaSeries(
  data: StockData[],
  indicatorsData: Record<string, Indicators>,
  keys: SmaKey[],
): SeriesRow[] {
  return Array.from({ length: maxLen(data) }, (_, i) => {
    const row: SeriesRow = { date: labelAt(data, i) };
    data.forEach((s) => {
      row[s.symbol] = s.close[i];
      keys.forEach((key) => {
        const v = indicatorsData[s.symbol]?.[key]?.[i];
        if (v != null) row[`${s.symbol}_${key}`] = v;
      });
    });
    return row;
  });
}

export interface Performance {
  symbol: string;
  pctChange: number;
  color: string;
}

export function performance(data: StockData[], colors: string[]): Performance[] {
  return data.map((s, i) => ({
    symbol: s.symbol,
    pctChange: s.close[0] ? ((s.close[s.close.length - 1] - s.close[0]) / s.close[0]) * 100 : 0,
    color: colors[i % colors.length],
  }));
}

export function summary(perf: Performance[]): { best: Performance; worst: Performance; avg: number } {
  const sorted = [...perf].sort((a, b) => b.pctChange - a.pctChange);
  const avg = perf.reduce((sum, p) => sum + p.pctChange, 0) / (perf.length || 1);
  return { best: sorted[0], worst: sorted[sorted.length - 1], avg };
}

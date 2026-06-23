import { describe, it, expect } from "vitest";
import { buildSeries, buildNormalizedSeries, performance, summary } from "./compare";
import type { StockData } from "@/types";

const mk = (symbol: string, closes: number[]): StockData => ({
  symbol,
  period: "1mo",
  timestamp: closes.map((_, i) => new Date(2024, 0, i + 1).toISOString()),
  open: closes,
  high: closes,
  low: closes,
  close: closes,
  volume: closes.map(() => 1),
});

describe("compare math", () => {
  it("sets a non-empty date on every row (regression: date only on row 0)", () => {
    const rows = buildSeries([mk("AAA", [10, 11, 12]), mk("BBB", [20, 21, 22])]);
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => typeof r.date === "string" && (r.date as string).length > 0)).toBe(true);
    expect(rows[1].AAA).toBe(11);
    expect(rows[1].BBB).toBe(21);
  });

  it("normalizes to base 100", () => {
    const rows = buildNormalizedSeries([mk("AAA", [10, 20])]);
    expect(rows[0].AAA).toBeCloseTo(100);
    expect(rows[1].AAA).toBeCloseTo(200);
  });

  it("computes pct change and summary", () => {
    const perf = performance([mk("AAA", [10, 20]), mk("BBB", [10, 5])], ["#1", "#2"]);
    expect(perf[0].pctChange).toBeCloseTo(100);
    expect(perf[1].pctChange).toBeCloseTo(-50);
    const s = summary(perf);
    expect(s.best.symbol).toBe("AAA");
    expect(s.worst.symbol).toBe("BBB");
    expect(s.avg).toBeCloseTo(25);
  });
});

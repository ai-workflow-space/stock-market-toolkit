import { describe, it, expect } from "vitest";
import { fmt, pct, volFmt, compactUsd } from "./format";

describe("format helpers", () => {
  it("fmt renders 2dp and dash for nullish", () => {
    expect(fmt(1234.5)).toBe("1,234.50");
    expect(fmt(null)).toBe("—");
    expect(fmt(undefined)).toBe("—");
  });
  it("pct adds sign and dash for nullish", () => {
    expect(pct(2.4)).toBe("+2.40%");
    expect(pct(-1.1)).toBe("-1.10%");
    expect(pct(null)).toBe("—");
  });
  it("volFmt abbreviates", () => {
    expect(volFmt(2_500_000_000)).toBe("2.50B");
    expect(volFmt(48_200_000)).toBe("48.20M");
    expect(volFmt(5_400)).toBe("5K");
    expect(volFmt(null)).toBe("—");
  });
  it("compactUsd abbreviates trillions/billions", () => {
    expect(compactUsd(3_210_000_000_000)).toBe("$3.21T");
    expect(compactUsd(8_900_000_000)).toBe("$8.90B");
    expect(compactUsd(null)).toBe("—");
  });
});

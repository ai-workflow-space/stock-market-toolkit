import { describe, it, expect } from "vitest";

// Use Vite's glob to read the source at build time — avoids fs/path imports
const signalsSource = import.meta.glob<string>("./SignalsPage.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
})["./SignalsPage.tsx"]!;

describe("SignalsPage API response handling (Fix 4)", () => {
  it("uses Array.isArray guard before accessing .signals", () => {
    // The fix must replace the bare cast  (await res.json()) as AnalysisResponse[]
    // with an Array.isArray() check that normalises both response shapes.
    expect(signalsSource).toContain("Array.isArray");
  });

  it("does NOT rely on a bare TypeScript cast for the response", () => {
    // The old buggy pattern:   const data = (await res.json()) as AnalysisResponse[];
    // This is dangerous because a TS cast is erased at runtime.
    // After the fix, the raw value is captured and normalised.
    const bareCastPattern = /await res\.json\(\)\)?\s+as\s+AnalysisResponse\[\]/;
    expect(bareCastPattern.test(signalsSource)).toBe(false);
  });

  it("accesses .signals.map() instead of .map() on the raw data", () => {
    // Old:  data.map(...)   where data could be an object
    // Fix:  data.signals.map(...)
    expect(signalsSource).toContain("data.signals.map");
  });
});
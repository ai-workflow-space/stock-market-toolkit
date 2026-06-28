import { describe, it, expect, beforeEach, vi } from "vitest";
import { saveLayout, loadLayout, defaultLayout, reconcileLayout, LAYOUT_VERSION } from "./dashboard-layout";

const KEY = "stock-toolkit-dash-layout";

function createStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = String(v); },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { store = {}; },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length; },
  } as Storage;
}

beforeEach(() => { vi.stubGlobal("localStorage", createStorage()); });

describe("dashboard layout persistence", () => {
  it("returns null when nothing stored", () => {
    expect(loadLayout()).toBeNull();
  });
  it("round-trips a saved layout", () => {
    saveLayout([{ i: "price", x: 0, y: 0, w: 12, h: 3 }]);
    expect(loadLayout()).toEqual([{ i: "price", x: 0, y: 0, w: 12, h: 3 }]);
  });
  it("returns null on version mismatch", () => {
    localStorage.setItem(KEY, JSON.stringify({ version: LAYOUT_VERSION + 1, items: [] }));
    expect(loadLayout()).toBeNull();
  });
  it("returns null on corrupt json", () => {
    localStorage.setItem(KEY, "{not json");
    expect(loadLayout()).toBeNull();
  });
});

describe("defaultLayout", () => {
  it("always includes price, info, table", () => {
    const ids = defaultLayout(new Set()).map((l) => l.i);
    expect(ids).toEqual(expect.arrayContaining(["price", "info", "table"]));
    expect(ids).not.toContain("rsi");
  });
  it("adds rsi and macd when active", () => {
    const ids = defaultLayout(new Set(["rsi", "macd"])).map((l) => l.i);
    expect(ids).toContain("rsi");
    expect(ids).toContain("macd");
  });

  it("omits optional cards by default but adds them when present", () => {
    expect(defaultLayout(new Set()).map((l) => l.i)).not.toContain("news");
    const ids = defaultLayout(new Set(), new Set(["fundamentals", "dividends", "news"])).map((l) => l.i);
    expect(ids).toEqual(expect.arrayContaining(["fundamentals", "dividends", "news"]));
  });

  it("places optional cards below the info/table block without collision", () => {
    const layout = defaultLayout(new Set(["rsi", "macd"]), new Set(["fundamentals", "dividends", "news"]));
    const byId = Object.fromEntries(layout.map((l) => [l.i, l]));
    const infoBottom = byId.info.y + byId.info.h;
    for (const id of ["fundamentals", "dividends", "news"]) {
      expect(byId[id].y).toBeGreaterThanOrEqual(infoBottom);
    }
    // the three cards sit side by side on the same row
    expect(byId.fundamentals.y).toBe(byId.dividends.y);
    expect(byId.dividends.y).toBe(byId.news.y);
    expect(byId.fundamentals.x).not.toBe(byId.dividends.x);
  });
});

describe("reconcileLayout", () => {
  it("honors a saved layout verbatim when the widget set matches", () => {
    const saved = defaultLayout(new Set(["rsi", "macd"])).map((l) =>
      l.i === "price" ? { ...l, x: 0, y: 0, w: 8, h: 4 } : l,
    );
    const result = reconcileLayout(saved, new Set(["rsi", "macd"]));
    expect(result.find((l) => l.i === "price")).toEqual({ i: "price", x: 0, y: 0, w: 8, h: 4, minW: 6 });
  });

  it("re-stacks to collision-free positions but keeps sizes when the set changes", () => {
    // saved while indicators were OFF (info/table sit on the price row's next row)
    const saved = defaultLayout(new Set()).map((l) => (l.i === "table" ? { ...l, h: 9 } : l));
    const result = reconcileLayout(saved, new Set(["rsi", "macd"]));
    const byId = Object.fromEntries(result.map((l) => [l.i, l]));
    expect(Object.keys(byId).sort()).toEqual(["info", "macd", "price", "rsi", "table"]);
    // info/table must drop below the indicator row, not collide with it
    expect(byId.info.y).toBeGreaterThanOrEqual(byId.rsi.y + byId.rsi.h);
    expect(byId.table.y).toBeGreaterThanOrEqual(byId.macd.y + byId.macd.h);
    // user-customized size is preserved
    expect(byId.table.h).toBe(9);
  });
});

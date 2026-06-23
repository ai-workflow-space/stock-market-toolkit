import { describe, it, expect, beforeEach, vi } from "vitest";
import { saveLayout, loadLayout, defaultLayout, LAYOUT_VERSION } from "./dashboard-layout";

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
});

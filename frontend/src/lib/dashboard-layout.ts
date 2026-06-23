import type { LayoutItem } from "react-grid-layout";

const KEY = "stock-toolkit-dash-layout";
export const LAYOUT_VERSION = 1;

/** Default grid placement for the editable dashboard, mirroring the static grid order. */
export function defaultLayout(active: Set<string>): LayoutItem[] {
  let y = 0;
  const layout: LayoutItem[] = [];
  layout.push({ i: "price", x: 0, y, w: 12, h: 3, minW: 6 });
  y += 3;
  if (active.has("rsi")) layout.push({ i: "rsi", x: 0, y, w: 6, h: 1, minW: 4 });
  if (active.has("macd")) layout.push({ i: "macd", x: active.has("rsi") ? 6 : 0, y, w: 6, h: 1, minW: 4 });
  if (active.has("rsi") || active.has("macd")) y += 1;
  layout.push({ i: "info", x: 0, y, w: 4, h: 10, minW: 3 });
  layout.push({ i: "table", x: 4, y, w: 8, h: 6, minW: 4 });
  return layout;
}

/**
 * Reconcile a saved layout with the currently-visible widgets. When the saved
 * widget set matches exactly, the saved layout is honored verbatim. When it
 * differs (e.g. an indicator was toggled), user sizes are preserved but each
 * widget's position is taken from the collision-free default — so a stale saved
 * position can never seed an overlap.
 */
export function reconcileLayout(stored: LayoutItem[], active: Set<string>): LayoutItem[] {
  const base = defaultLayout(active);
  const storedIds = new Set(stored.map((l) => l.i));
  const sameSet = base.length === stored.length && base.every((b) => storedIds.has(b.i));
  return base.map((b) => {
    const s = stored.find((l) => l.i === b.i);
    if (sameSet && s) return s;
    return s ? { ...b, w: s.w, h: s.h } : b;
  });
}

export function saveLayout(items: readonly LayoutItem[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: LAYOUT_VERSION, items }));
  } catch {
    /* ignore quota / serialization errors */
  }
}

export function loadLayout(): LayoutItem[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { version?: number; items?: LayoutItem[] };
    if (parsed.version !== LAYOUT_VERSION || !Array.isArray(parsed.items)) return null;
    return parsed.items;
  } catch {
    return null;
  }
}

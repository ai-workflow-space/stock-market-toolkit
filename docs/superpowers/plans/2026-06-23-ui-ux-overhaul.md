# UI/UX Overhaul & Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the brittle, inconsistent frontend UI with a modern-fintech design system: unified tokens, one shadcn/ui component vocabulary, an overflow-free responsive dashboard (fixed grid + opt-in edit mode), and a committed design spec — while refactoring `App.tsx` and fixing real bugs.

**Architecture:** Single source of design tokens in `index.css` + `tailwind.config.js`. The 995-line `App.tsx` is decomposed into `components/layout/`, `components/dashboard/`, and `pages/`. The dashboard renders a static Tailwind `grid-cols-12` by default (content-driven heights, no `react-grid-layout`); an "Edit layout" toggle lazy-loads `react-grid-layout` and persists a versioned layout to `localStorage`. Pure logic (formatting, compare math, layout persistence) is extracted to `lib/` with vitest unit tests.

**Tech Stack:** React 19.2, TypeScript ~6.0, Vite 8, Tailwind 3.4.19, shadcn/ui (Radix), Recharts 3.8, react-grid-layout ^2.2.3, react-router-dom 7, vitest (added).

## Global Constraints

- React 19 + TypeScript; Vite build is `tsc -b && vite build`; lint is `eslint .`. Every task must keep both green.
- Path alias `@/*` → `src/*` (configured in `vite.config.ts` and `tsconfig.app.json`). Use `@/` imports for new modules.
- shadcn/ui is the ONLY component vocabulary. No new hand-rolled component CSS classes. No inline `style={{}}` for layout/spacing/color (only genuinely dynamic values like computed chart pixel dims or Recharts series stroke colors).
- All color/spacing/type/radius come from tokens. Spacing on the Tailwind 4px scale. No ad-hoc rem (`0.35rem`, `0.72rem`) and no hardcoded hex in components.
- Price/percentage deltas use semantic `up`/`down`/`neutral` tokens — never raw `green-500`/`red-500`.
- Themes: light + dark, **dark is the default**. Theme is applied via `data-theme` on `<html>` (existing `ThemeContext`). `tailwind.config.js darkMode` is `["class", '[data-theme="dark"]']`.
- Fonts: `Inter` (UI) + `JetBrains Mono` (numerics, with `tabular-nums`).
- Page content max-width: `1440px`, centered, responsive horizontal padding.
- Dashboard cards: content-driven heights. No hardcoded pixel `min-height` on cards.
- Frequent commits — one per task. Conventional Commit messages, ending with the `Co-Authored-By` trailer.

---

## File structure (target)

```
frontend/src/
  lib/
    utils.ts              (exists — cn())
    format.ts             NEW  fmt/pct/volFmt/compactUsd + tests
    compare.ts            NEW  performance + chart-series builders (date bug fixed) + tests
    dashboard-layout.ts   NEW  default layout + versioned localStorage persistence + tests
  components/
    ui/                   shadcn primitives (add: dropdown-menu, tooltip, skeleton,
                          toggle-group, command, popover, sonner)
    layout/
      AppShell.tsx        NEW  <Navbar/> + max-w container <main> + <Footer/>
      Navbar.tsx          NEW  logo, route links, global search entry, theme toggle, user menu
      Footer.tsx          NEW  version/sha/build-time
    common/
      ChartCard.tsx       NEW  Card wrapper: title + optional toolbar + body
      StatCard.tsx        NEW  label + mono value + optional delta (up/down)
      ToggleBar.tsx       NEW  shadcn ToggleGroup wrapper for timeframe/indicator pills
      SymbolSearch.tsx    NEW  Command+Popover ticker search (replaces hand-rolled dropdown)
    dashboard/
      PriceChart.tsx      NEW  (extracted, tokenized)
      RsiChart.tsx        NEW
      MacdChart.tsx       NEW
      StockInfoCard.tsx   NEW  (StatCard grid; label + day-range fixes)
      HistoryTable.tsx    NEW  (extracted DataTable)
      DashboardGrid.tsx   NEW  static responsive grid (default)
      EditableGrid.tsx    NEW  lazy react-grid-layout (edit mode only)
    SignalCard.tsx        (exists — tokenize)
  pages/
    DashboardPage.tsx     NEW  main analysis view (extracted from App.tsx Dashboard())
    ComparePage.tsx       NEW  (extracted from App.tsx ComparePage())
    SignalsPage.tsx       RENAMED from current pages/DashboardPage.tsx (it is the signals view)
    AlertsPage.tsx        (exists — tokenize)
    SettingsPage.tsx      (exists — tokenize)
    LoginPage.tsx         (exists — tokenize)
    RegisterPage.tsx      (exists — tokenize)
    StyleGuidePage.tsx    NEW  living showcase of tokens + components
  App.tsx                 routing + providers ONLY
docs/DESIGN_SYSTEM.md     NEW  the developer-facing spec deliverable
```

---

## Task 1: Design tokens, Tailwind theme, and fonts

**Files:**
- Modify: `frontend/index.html` (add font `<link>`s)
- Modify: `frontend/src/index.css:1-82` (replace `@import` + both token blocks with a single token source)
- Modify: `frontend/tailwind.config.js` (add `up/down/neutral` colors + `fontFamily`)

**Interfaces:**
- Produces: CSS variables `--background --foreground --card --card-foreground --popover --popover-foreground --primary --primary-foreground --secondary --secondary-foreground --muted --muted-foreground --accent --accent-foreground --destructive --destructive-foreground --border --input --ring --radius --up --up-foreground --down --down-foreground --neutral`; Tailwind utilities `bg-up text-up bg-down text-down text-neutral font-sans font-mono`.

- [ ] **Step 1: Replace font loading in `index.html`** — add inside `<head>` before the icon link:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
```

- [ ] **Step 2: Replace `index.css` lines 1-82** (the `@import`, the dark `:root`, the `[data-theme="light"]`, and the duplicate hex `:root` block) with the single token source below. Keep `@tailwind base/components/utilities`. Delete the hex set (`--bg/--surface/--card-bg/--border-color/--text/--text-dim/--primary-color/--accent-color/--success/--danger/--warn`).

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: 224 71% 4%;
  --foreground: 210 20% 98%;
  --card: 224 39% 8%;
  --card-foreground: 210 20% 98%;
  --popover: 224 39% 8%;
  --popover-foreground: 210 20% 98%;
  --primary: 217 91% 60%;
  --primary-foreground: 210 40% 98%;
  --secondary: 223 30% 14%;
  --secondary-foreground: 210 20% 98%;
  --muted: 223 30% 14%;
  --muted-foreground: 215 20% 65%;
  --accent: 223 30% 16%;
  --accent-foreground: 210 20% 98%;
  --destructive: 0 72% 51%;
  --destructive-foreground: 210 40% 98%;
  --border: 223 30% 16%;
  --input: 223 30% 16%;
  --ring: 217 91% 60%;
  --radius: 0.625rem;
  --up: 142 71% 45%;
  --up-foreground: 0 0% 100%;
  --down: 0 72% 55%;
  --down-foreground: 0 0% 100%;
  --neutral: 215 20% 65%;
}

[data-theme="light"] {
  --background: 0 0% 100%;
  --foreground: 224 71% 4%;
  --card: 0 0% 100%;
  --card-foreground: 224 71% 4%;
  --popover: 0 0% 100%;
  --popover-foreground: 224 71% 4%;
  --primary: 217 91% 60%;
  --primary-foreground: 0 0% 100%;
  --secondary: 220 14% 96%;
  --secondary-foreground: 224 71% 11%;
  --muted: 220 14% 96%;
  --muted-foreground: 220 9% 46%;
  --accent: 220 14% 96%;
  --accent-foreground: 224 71% 11%;
  --destructive: 0 72% 45%;
  --destructive-foreground: 0 0% 100%;
  --border: 220 13% 91%;
  --input: 220 13% 91%;
  --ring: 217 91% 60%;
  --up: 142 71% 38%;
  --up-foreground: 0 0% 100%;
  --down: 0 72% 48%;
  --down-foreground: 0 0% 100%;
  --neutral: 220 9% 46%;
}

* { border-color: hsl(var(--border)); }
html { font-size: 16px; }
body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  font-feature-settings: "cv11", "ss01";
}
```

(Everything below line 82 — the legacy component classes — is pruned later in Task 14. Leave it for now so the app keeps building.)

- [ ] **Step 3: Extend `tailwind.config.js`** — inside `theme.extend.colors` add after the `card` block:

```js
        up: { DEFAULT: "hsl(var(--up))", foreground: "hsl(var(--up-foreground))" },
        down: { DEFAULT: "hsl(var(--down))", foreground: "hsl(var(--down-foreground))" },
        neutral: "hsl(var(--neutral))",
```

And add a `fontFamily` key inside `theme.extend`:

```js
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
```

- [ ] **Step 4: Verify build + lint**

Run: `cd frontend && npx tsc -b && npx eslint . && npm run build`
Expected: all succeed (app still renders with legacy classes intact).

- [ ] **Step 5: Commit**

```bash
git add frontend/index.html frontend/src/index.css frontend/tailwind.config.js
git commit -m "feat(ui): unify design tokens, add fintech palette + JetBrains Mono"
```

---

## Task 2: Add vitest + extract format utilities (TDD)

**Files:**
- Modify: `frontend/package.json` (devDep `vitest`, script `"test": "vitest run"`)
- Create: `frontend/vitest.config.ts`
- Create: `frontend/src/lib/format.ts`
- Test: `frontend/src/lib/format.test.ts`

**Interfaces:**
- Produces: `fmt(n): string`, `pct(n): string`, `volFmt(n): string`, `compactUsd(n): string` — all accept `number | null | undefined`, return `"—"` for nullish.

- [ ] **Step 1: Add vitest** — add to `devDependencies`: `"vitest": "^3.2.4"`; add to `scripts`: `"test": "vitest run"`. Then `cd frontend && npm install`.

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
```

- [ ] **Step 3: Write the failing test** `src/lib/format.test.ts`

```ts
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
```

- [ ] **Step 4: Run test, verify it fails**

Run: `cd frontend && npx vitest run src/lib/format.test.ts`
Expected: FAIL — `Failed to resolve import "./format"`.

- [ ] **Step 5: Implement `src/lib/format.ts`**

```ts
export const fmt = (n: number | null | undefined): string =>
  n == null ? "—" : n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const pct = (n: number | null | undefined): string =>
  n == null ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

export const volFmt = (n: number | null | undefined): string =>
  n == null ? "—"
    : n >= 1e9 ? `${(n / 1e9).toFixed(2)}B`
    : n >= 1e6 ? `${(n / 1e6).toFixed(2)}M`
    : `${(n / 1e3).toFixed(0)}K`;

export const compactUsd = (n: number | null | undefined): string =>
  n == null ? "—"
    : n >= 1e12 ? `$${(n / 1e12).toFixed(2)}T`
    : n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B`
    : `$${(n / 1e6).toFixed(2)}M`;
```

- [ ] **Step 6: Run test, verify pass**

Run: `cd frontend && npx vitest run src/lib/format.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vitest.config.ts frontend/src/lib/format.ts frontend/src/lib/format.test.ts
git commit -m "test(ui): add vitest and extract tested format helpers to lib/format"
```

---

## Task 3: Add missing shadcn/ui primitives

**Files:**
- Create: `frontend/src/components/ui/{dropdown-menu,tooltip,skeleton,toggle-group,toggle,command,popover,sonner}.tsx`
- Modify: `frontend/src/components/ui/index.ts` (export new primitives + `Dialog` which is currently unexported)

**Interfaces:**
- Produces: `DropdownMenu*`, `Tooltip*`, `Skeleton`, `ToggleGroup`, `ToggleGroupItem`, `Command*`, `Popover*`, `Toaster`, `toast` exported from `@/components/ui/*`.

- [ ] **Step 1: Add the primitives.** Prefer the shadcn skill/CLI if available (`npx shadcn@latest add dropdown-menu tooltip skeleton toggle-group command popover sonner`). If the CLI cannot run, hand-author each from the shadcn registry (Radix-based, using `cn()` from `@/lib/utils`). This pulls Radix deps `@radix-ui/react-dropdown-menu @radix-ui/react-tooltip @radix-ui/react-toggle-group @radix-ui/react-popover`, plus `cmdk` and `sonner`. Run `npm install` for any added deps.

- [ ] **Step 2: Update the barrel** `src/components/ui/index.ts` — append:

```ts
export { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";
export { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./dropdown-menu";
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";
export { Skeleton } from "./skeleton";
export { ToggleGroup, ToggleGroupItem } from "./toggle-group";
export { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./command";
export { Popover, PopoverContent, PopoverTrigger } from "./popover";
export { Toaster, toast } from "./sonner";
```

- [ ] **Step 3: Verify build + lint**

Run: `cd frontend && npx tsc -b && npx eslint . && npm run build`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ui frontend/package.json frontend/package-lock.json
git commit -m "feat(ui): add dropdown-menu, tooltip, skeleton, toggle-group, command, popover, sonner"
```

---

## Task 4: App shell — Navbar, Footer, AppShell, dark default

**Files:**
- Create: `frontend/src/components/layout/Navbar.tsx`, `Footer.tsx`, `AppShell.tsx`
- Modify: `frontend/src/context/ThemeContext.tsx:18-22` (default to dark)
- Modify: `frontend/src/App.tsx` (use `AppShell` wrapper in routes — full rewrite happens in Task 13; here just import/define shell)

**Interfaces:**
- Consumes: `useAuth()` (`{ user, logout }`), `useTheme()` (`{ theme, toggleTheme }`) from existing hooks.
- Produces: `AppShell({ children })` rendering `<Navbar/>`, `<main className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 py-6">{children}</main>`, `<Footer/>`. `Navbar` with logo (keep existing inline SVG mark), `Link`s to `/ /signals /compare /alerts /settings` styled via shadcn `Button variant="ghost"`/`NavLink active`, a `Tooltip`-wrapped theme toggle button (`Sun`/`Moon` from `lucide-react`), and a user `DropdownMenu` (username + Logout).

- [ ] **Step 1: Default theme to dark** — replace `ThemeContext.tsx` lines 18-22 body:

```ts
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
    return "dark";
  });
```

- [ ] **Step 2: Create `Footer.tsx`** — port `App.tsx:963-974` to tokenized classes:

```tsx
const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? "1.0.0";
export default function Footer() {
  const sha = (import.meta.env.VITE_GIT_SHA as string) || "local";
  const buildTime = (import.meta.env.VITE_BUILD_TIME as string) || "";
  return (
    <footer className="mx-auto flex w-full max-w-[1440px] items-center gap-3 px-4 sm:px-6 py-4 text-xs text-muted-foreground">
      <span>v{APP_VERSION}</span>
      {sha && <span className="font-mono">@{sha}</span>}
      {buildTime && <span>built {buildTime}</span>}
    </footer>
  );
}
```

- [ ] **Step 3: Create `Navbar.tsx`** — top bar using `NavLink` for active state, ghost buttons, `DropdownMenu` user menu, `Tooltip` theme toggle. Use `border-b border-border bg-background/80 backdrop-blur` sticky header inside a `max-w-[1440px]` inner row. No inline styles except the brand SVG. Export default.

- [ ] **Step 4: Create `AppShell.tsx`**

```tsx
import Navbar from "./Navbar";
import Footer from "./Footer";
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 sm:px-6 py-6">{children}</main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 5: Verify build + lint** (Navbar referenced once App.tsx updated in Task 13; for now ensure files typecheck via a temporary import in App or skip wiring). Run: `cd frontend && npx tsc -b && npx eslint .` Expected: success.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/layout frontend/src/context/ThemeContext.tsx
git commit -m "feat(ui): add AppShell/Navbar/Footer layout components, default to dark theme"
```

---

## Task 5: Shared presentation primitives — ChartCard, StatCard, ToggleBar

**Files:**
- Create: `frontend/src/components/common/ChartCard.tsx`, `StatCard.tsx`, `ToggleBar.tsx`

**Interfaces:**
- Produces:
  - `ChartCard({ title, subtitle?, toolbar?, children, className? })` — shadcn `Card` with header row (`title` left, `toolbar` right) and a `CardContent` body. No fixed height.
  - `StatCard({ label, value, delta?, tone? })` — `tone: "up" | "down" | "neutral"`; `value` rendered in `font-mono tabular-nums`; delta colored via `text-up`/`text-down`.
  - `ToggleBar<T>({ options, value, onChange, multiple? })` — wraps shadcn `ToggleGroup`; `options: {label: string; value: T}[]`.

- [ ] **Step 1: Create `StatCard.tsx`**

```tsx
import { cn } from "@/lib/utils";
export default function StatCard({ label, value, delta, tone = "neutral" }:
  { label: string; value: string; delta?: string; tone?: "up" | "down" | "neutral" }) {
  const toneCls = tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-foreground";
  return (
    <div className="rounded-md bg-secondary/50 p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-sm font-medium tabular-nums">{value}</div>
      {delta && <div className={cn("mt-0.5 font-mono text-xs tabular-nums", toneCls)}>{delta}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Create `ChartCard.tsx`** — `Card` + flex header (`title` as `text-sm font-medium text-muted-foreground`, optional `toolbar`) + `CardContent className="pt-0"`. Accept `className` passthrough via `cn()`.

- [ ] **Step 3: Create `ToggleBar.tsx`** — generic wrapper over `ToggleGroup` (`type={multiple ? "multiple" : "single"}`), each option a `ToggleGroupItem` sized `sm`. Used by timeframe + indicators.

- [ ] **Step 4: Verify** Run: `cd frontend && npx tsc -b && npx eslint .` Expected: success.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/common
git commit -m "feat(ui): add ChartCard, StatCard, ToggleBar shared primitives"
```

---

## Task 6: Extract & tokenize dashboard chart/data components (fix label + delta bugs)

**Files:**
- Create: `frontend/src/components/dashboard/PriceChart.tsx`, `RsiChart.tsx`, `MacdChart.tsx`, `StockInfoCard.tsx`, `HistoryTable.tsx`

**Interfaces:**
- Consumes: `StockData`, `Indicators`, `StockInfo` from `@/types`; `fmt/pct/volFmt/compactUsd` from `@/lib/format`; `StatCard` from `@/components/common/StatCard`; `ChartCard`.
- Produces (signatures preserved from `App.tsx`):
  - `PriceChart({ data: StockData; indicators: Indicators; showBB: boolean; active?: Set<string> })`
  - `RsiChart({ data: {date:string}[]; rsi: (number|null)[]; active?: Set<string> })`
  - `MacdChart({ data: {date:string}[]; macd; signal; hist; active? })`
  - `StockInfoCard({ info: StockInfo; stock: StockData })`
  - `HistoryTable({ stock: StockData })`

- [ ] **Step 1: Port `PriceChart`/`RsiChart`/`MacdChart`** from `App.tsx:201-292` verbatim for the Recharts logic, with these substitutions: Recharts axis/grid/tooltip colors move from hardcoded hex to reading CSS vars at runtime via a tiny helper (`getCssVar('--muted-foreground')`) OR keep series stroke hex (allowed — series colors are data encodings). Tooltip container: replace inline-styled div with a tokenized `className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md"`. Numeric values inside tooltips use `font-mono`. Import `fmt` from `@/lib/format` (delete local copies).

- [ ] **Step 2: Port `StockInfoCard`** from `App.tsx:295-343` into a `StatCard` grid (`grid grid-cols-2 gap-2`). Fix bugs: (a) relabel "Day High"/"Day Low" to "Period High"/"Period Low" (they aggregate the whole series, not a day); (b) compute `tone` for Day Change from sign and pass to `StatCard` instead of inline hex color; (c) use `compactUsd` for market cap. Header price delta uses `text-up`/`text-down`.

- [ ] **Step 3: Port `HistoryTable`** from `App.tsx:345-375` — wrap in `ChartCard`, table uses `font-mono tabular-nums`, close cell uses `text-primary`, replace per-cell inline padding styles with Tailwind classes. Keep `.slice(0,30)`.

- [ ] **Step 4: Verify** Run: `cd frontend && npx tsc -b && npx eslint .` Expected: success.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/dashboard
git commit -m "feat(ui): extract+tokenize dashboard charts, info card, history table; fix day/period labels"
```

---

## Task 7: DashboardGrid — static responsive layout (default, no react-grid-layout)

**Files:**
- Create: `frontend/src/components/dashboard/DashboardGrid.tsx`

**Interfaces:**
- Consumes: the Task 6 components + `active: Set<string>` indicator set.
- Produces: `DashboardGrid({ stock, indicators, info, active })` — a `div className="grid grid-cols-12 gap-4"` with: price `col-span-12`; RSI `col-span-12 lg:col-span-6` (only if `active.has("rsi")`); MACD `col-span-12 lg:col-span-6` (only if `active.has("macd")`); StockInfoCard `col-span-12 lg:col-span-4`; HistoryTable `col-span-12 lg:col-span-8`. Each cell wraps its component in `ChartCard` with the correct title. No pixel heights anywhere.

- [ ] **Step 1: Implement `DashboardGrid.tsx`** per the interface above. Charts keep their own fixed *chart-body* heights (Recharts `height={300}`/`{120}`) inside flexible cards.

- [ ] **Step 2: Verify** Run: `cd frontend && npx tsc -b && npx eslint .` Expected: success.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/dashboard/DashboardGrid.tsx
git commit -m "feat(ui): add static responsive DashboardGrid (content-driven heights)"
```

---

## Task 8: Layout persistence + EditableGrid (lazy react-grid-layout)

**Files:**
- Create: `frontend/src/lib/dashboard-layout.ts`
- Test: `frontend/src/lib/dashboard-layout.test.ts`
- Create: `frontend/src/components/dashboard/EditableGrid.tsx`

**Interfaces:**
- Produces:
  - `defaultLayout(active: Set<string>): LayoutItem[]` — same allocation as legacy `App.tsx:437-459` but with `react-grid-layout` types.
  - `LAYOUT_VERSION = 1`; `saveLayout(items: LayoutItem[]): void`; `loadLayout(): LayoutItem[] | null` — persists `{version, items}` to `localStorage["stock-toolkit-dash-layout"]`, returns `null` on missing/parse-error/version-mismatch.
  - `EditableGrid({ stock, indicators, info, active })` — default export; renders the legacy `GridLayout` with `useContainerWidth`, seeded from `loadLayout() ?? defaultLayout(active)`, calling `saveLayout` on `onLayoutChange`.

- [ ] **Step 1: Write failing test** `dashboard-layout.test.ts`

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { saveLayout, loadLayout, LAYOUT_VERSION } from "./dashboard-layout";

const KEY = "stock-toolkit-dash-layout";
beforeEach(() => { globalThis.localStorage?.clear?.(); });

describe("dashboard layout persistence", () => {
  it("returns null when nothing stored", () => { expect(loadLayout()).toBeNull(); });
  it("round-trips saved layout", () => {
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
```

- [ ] **Step 2: Configure jsdom for this test** — set `vitest.config.ts` `test.environment` to `"jsdom"` and add devDep `jsdom`; run `npm install`. (Reason: `localStorage` needed.) Re-run Task 2 format test to confirm still green under jsdom.

- [ ] **Step 3: Run test, verify fail** Run: `cd frontend && npx vitest run src/lib/dashboard-layout.test.ts` Expected: FAIL (`Failed to resolve import "./dashboard-layout"`).

- [ ] **Step 4: Implement `dashboard-layout.ts`**

```ts
import type { LayoutItem } from "react-grid-layout";

const KEY = "stock-toolkit-dash-layout";
export const LAYOUT_VERSION = 1;

export function defaultLayout(active: Set<string>): LayoutItem[] {
  let y = 0;
  const layout: LayoutItem[] = [];
  layout.push({ i: "price", x: 0, y, w: 12, h: 3, minW: 6 }); y += 3;
  if (active.has("rsi")) layout.push({ i: "rsi", x: 0, y, w: 6, h: 1, minW: 4 });
  if (active.has("macd")) layout.push({ i: "macd", x: active.has("rsi") ? 6 : 0, y, w: 6, h: 1, minW: 4 });
  if (active.has("rsi") || active.has("macd")) y += 1;
  layout.push({ i: "info", x: 0, y, w: 4, h: 10, minW: 3 });
  layout.push({ i: "table", x: 4, y, w: 8, h: 6, minW: 4 });
  return layout;
}

export function saveLayout(items: LayoutItem[]): void {
  try { localStorage.setItem(KEY, JSON.stringify({ version: LAYOUT_VERSION, items })); } catch { /* ignore */ }
}

export function loadLayout(): LayoutItem[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { version?: number; items?: LayoutItem[] };
    if (parsed.version !== LAYOUT_VERSION || !Array.isArray(parsed.items)) return null;
    return parsed.items;
  } catch { return null; }
}
```

- [ ] **Step 5: Run test, verify pass** Run: `cd frontend && npx vitest run src/lib/dashboard-layout.test.ts` Expected: PASS (4 tests).

- [ ] **Step 6: Implement `EditableGrid.tsx`** — port the legacy `GridLayout` block (`App.tsx:476-510`) using the same `gridConfig/dragConfig/resizeConfig` API and `useContainerWidth`, seeded from `loadLayout() ?? defaultLayout(active)`, `onLayoutChange={saveLayout}`. Wrap each child in `ChartCard`. Default export. Imports `react-grid-layout` + its CSS at module top (so it is only pulled when this module is lazily loaded).

- [ ] **Step 7: Verify** Run: `cd frontend && npx tsc -b && npx eslint . && npm run build` Expected: success.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/lib/dashboard-layout.ts frontend/src/lib/dashboard-layout.test.ts frontend/src/components/dashboard/EditableGrid.tsx frontend/vitest.config.ts frontend/package.json frontend/package-lock.json
git commit -m "feat(ui): versioned dashboard layout persistence + lazy EditableGrid (edit mode)"
```

---

## Task 9: DashboardPage (main analysis view) + SymbolSearch + edit toggle

**Files:**
- Create: `frontend/src/components/common/SymbolSearch.tsx`
- Create: `frontend/src/pages/DashboardPage.tsx` (the analysis view — NOT the signals one)

**Interfaces:**
- Consumes: `getStock/getIndicators/getStockInfo/searchSymbols` from `@/api/stockApi`; `DashboardGrid`; `React.lazy(() => import("@/components/dashboard/EditableGrid"))`; `ToggleBar`; `SymbolSearch`.
- Produces: `DashboardPage()` default export. State ported from `App.tsx:378-516` Dashboard(): `symbol/period/stock/indicators/info/error/activeInds`. **Fix the dead-loading bug**: introduce real `loading` state set around `load()`; SearchBar/analyze button reflects it; show `Skeleton` cards while loading. Add `editMode` boolean (default false) with an "Edit layout" toggle button (`LayoutGrid` icon) in the controls row; when true, render `<Suspense fallback={<Skeleton/>}><EditableGrid .../></Suspense>`, else `<DashboardGrid .../>`.

- [ ] **Step 1: Create `SymbolSearch.tsx`** — replaces the hand-rolled absolute dropdown (`App.tsx:69-167`). Use shadcn `Popover` + `Command`: `CommandInput` (debounced 300ms calling `searchSymbols`), `CommandList`/`CommandItem` results (symbol/name/exchange), `onSelect` → `onSearch(symbol)`. Props: `{ onSearch: (s: string) => void; loading?: boolean }`. Radix handles outside-click + viewport positioning (removes the `expectingShowRef` race hack).

- [ ] **Step 2: Create `DashboardPage.tsx`** — port Dashboard() logic; replace `SearchBar`/`TimeframeSelector`/`IndicatorToggles` with `SymbolSearch` + `ToggleBar` (timeframe single-select from `TIMEFRAMES`; indicators multi-select). Real loading state. Render `DashboardGrid` or lazy `EditableGrid` by `editMode`. Error shown via tokenized banner (`rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-3 py-2`).

- [ ] **Step 3: Verify** Run: `cd frontend && npx tsc -b && npx eslint .` Expected: success.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/DashboardPage.tsx frontend/src/components/common/SymbolSearch.tsx
git commit -m "feat(ui): new DashboardPage with SymbolSearch, edit-mode toggle, real loading state"
```

---

## Task 10: ComparePage extraction + fix date bug (TDD on compare math)

**Files:**
- Create: `frontend/src/lib/compare.ts`
- Test: `frontend/src/lib/compare.test.ts`
- Create: `frontend/src/pages/ComparePage.tsx`

**Interfaces:**
- Produces:
  - `buildSeries(data: StockData[]): { date: string; [sym: string]: string | number }[]` — date set on EVERY row from `data[0]` (fixes the `i === 0` bug at `App.tsx:680`).
  - `buildNormalizedSeries(data: StockData[]): ...` (base-100).
  - `performance(data: StockData[], colors: string[]): { symbol; pctChange; color }[]` + `summary(perf)` → `{ best, worst, avg }`.
- Consumes (ComparePage): `compareStocks/getIndicators/searchSymbols`, `ToggleBar`, `ChartCard`, `StatCard`, `SymbolSearch`-style tag input.

- [ ] **Step 1: Write failing test** `compare.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { buildSeries, performance, summary } from "./compare";
import type { StockData } from "@/types";

const mk = (symbol: string, closes: number[]): StockData => ({
  symbol, period: "1mo",
  timestamp: closes.map((_, i) => new Date(2024, 0, i + 1).toISOString()),
  open: closes, high: closes, low: closes, close: closes, volume: closes.map(() => 1),
});

describe("compare math", () => {
  it("sets a non-empty date on every row (regression: date only on row 0)", () => {
    const rows = buildSeries([mk("AAA", [10, 11, 12]), mk("BBB", [20, 21, 22])]);
    expect(rows).toHaveLength(3);
    expect(rows.every(r => typeof r.date === "string" && r.date.length > 0)).toBe(true);
  });
  it("computes pct change and summary", () => {
    const perf = performance([mk("AAA", [10, 20]), mk("BBB", [10, 5])], ["#1", "#2"]);
    expect(perf[0].pctChange).toBeCloseTo(100);
    const s = summary(perf);
    expect(s.best.symbol).toBe("AAA");
    expect(s.worst.symbol).toBe("BBB");
    expect(s.avg).toBeCloseTo(25);
  });
});
```

- [ ] **Step 2: Run test, verify fail** Run: `cd frontend && npx vitest run src/lib/compare.test.ts` Expected: FAIL (unresolved import).

- [ ] **Step 3: Implement `compare.ts`** — port from `App.tsx:661-713`, with the date fix: compute `const dateAt = (i) => new Date(data[0].timestamp[i]).toLocaleDateString("en-US",{month:"short",day:"numeric"})` and set `row.date = dateAt(i)` once per row (outside the per-symbol loop). Implement `buildNormalizedSeries`, `performance`, `summary`.

- [ ] **Step 4: Run test, verify pass** Run: `cd frontend && npx vitest run src/lib/compare.test.ts` Expected: PASS.

- [ ] **Step 5: Create `ComparePage.tsx`** — port `App.tsx:519-961`, using `compare.ts` for all series/perf math, `StatCard` for best/worst/avg, `ChartCard` for the price + SMA-overlay charts, `ToggleBar` for SMA + Normalized toggles, tokenized ticker tags + buttons (replace inline-styled `.compare-ticker-tag`, `.search-btn` hex). Keep `exportCSV` (it is correct enough; optionally align its row gating with `buildSeries`). Remove emoji from perf cards (use `lucide-react` `Trophy`/`TrendingDown`/`BarChart3`).

- [ ] **Step 6: Verify** Run: `cd frontend && npx tsc -b && npx eslint .` Expected: success.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/lib/compare.ts frontend/src/lib/compare.test.ts frontend/src/pages/ComparePage.tsx
git commit -m "feat(ui): extract ComparePage, fix compare date-axis bug, tokenize"
```

---

## Task 11: Rename signals page → SignalsPage + tokenize

**Files:**
- Rename: `frontend/src/pages/DashboardPage.tsx` → `frontend/src/pages/SignalsPage.tsx` (use `git mv`)
- Modify: the renamed file (component name `SignalsPage`, tokenize)
- Modify: `frontend/src/components/SignalCard.tsx` (tokenize)

- [ ] **Step 1: `git mv frontend/src/pages/DashboardPage.tsx frontend/src/pages/SignalsPage.tsx`** then rename the component `DashboardPage` → `SignalsPage` and its default export.

- [ ] **Step 2: Tokenize** — replace the three summary cards (`SignalsPage.tsx:172-185`) with `StatCard` (tone up/down/neutral); remove inline `borderLeft` hex and `text-green-500/text-red-500` → `text-up/text-down`; replace `.signals-grid` with `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4`; replace `.page/.container/.loading-screen/.spinner` with `Skeleton` grid. Use `toast` for dismiss feedback. Title "Trading Signals" via `text-2xl font-semibold`.

- [ ] **Step 3: Tokenize `SignalCard.tsx`** — ensure direction colors map to `up/down/neutral` tokens and strength bar uses tokens; no hardcoded hex.

- [ ] **Step 4: Verify** Run: `cd frontend && npx tsc -b && npx eslint .` Expected: success.

- [ ] **Step 5: Commit**

```bash
git add -A frontend/src/pages frontend/src/components/SignalCard.tsx
git commit -m "refactor(ui): rename signals page to SignalsPage, tokenize signals UI"
```

---

## Task 12: Tokenize Alerts, Settings, Login, Register

**Files:**
- Modify: `frontend/src/pages/AlertsPage.tsx`, `SettingsPage.tsx`, `LoginPage.tsx`, `RegisterPage.tsx`

- [ ] **Step 1: Audit each page** for `.page/.container/.auth-*/.form-*` custom classes and inline hex; replace with shadcn `Card`/`Input`/`Label`/`Button`/`Tabs`/`Switch` + Tailwind tokens. Keep behavior identical. Auth pages: center a `max-w-sm` `Card`.

- [ ] **Step 2: Verify** Run: `cd frontend && npx tsc -b && npx eslint .` Expected: success.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/AlertsPage.tsx frontend/src/pages/SettingsPage.tsx frontend/src/pages/LoginPage.tsx frontend/src/pages/RegisterPage.tsx
git commit -m "refactor(ui): tokenize alerts, settings, login, register pages"
```

---

## Task 13: Slim App.tsx to routing + providers; wire AppShell + Toaster

**Files:**
- Modify: `frontend/src/App.tsx` (delete all extracted components; keep only `ProtectedRoute`, routes, providers)

**Interfaces:**
- Consumes: `DashboardPage`, `ComparePage`, `SignalsPage`, `AlertsPage`, `SettingsPage`, `LoginPage`, `RegisterPage`, `AppShell`, `Toaster`.

- [ ] **Step 1: Rewrite `App.tsx`** to ~45 lines: imports + `ProtectedRoute` + `BrowserRouter > AuthProvider > ThemeProvider > (TooltipProvider) > Routes`. Each protected route renders `<AppShell><XPage/></AppShell>`. Route map: `/` → `DashboardPage`, `/signals` → `SignalsPage`, `/compare` → `ComparePage`, `/alerts` → `AlertsPage`, `/settings` → `SettingsPage`. Mount `<Toaster />` once. Remove the now-dead `react-grid-layout` top-level import and its CSS imports (they now live only in `EditableGrid.tsx`).

- [ ] **Step 2: Verify** Run: `cd frontend && npx tsc -b && npx eslint . && npm run build` Expected: success; bundle no longer eagerly includes react-grid-layout in the main chunk (it is in a lazy chunk).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "refactor(ui): reduce App.tsx to routing + providers, mount AppShell + Toaster"
```

---

## Task 14: Prune legacy CSS

**Files:**
- Modify: `frontend/src/index.css` (remove dead component classes below the token block)
- Delete: `frontend/src/App.css` (confirmed unused — only legacy/empty rules)

- [ ] **Step 1: Confirm `App.css` is not imported** Run: `cd frontend && grep -rn "App.css" src` Expected: no results (it is not imported in `main.tsx`/`App.tsx`). Then `git rm frontend/src/App.css`.

- [ ] **Step 2: Grep each legacy class for live usage before deleting.** For every selector remaining in `index.css` below the token block (`.navbar .nav-* .search-* .tf-btn .ind-btn .card .info-* .signals-grid .compare-* .data-table .table-wrapper .page .container .page-header .grid-measure .error-banner .loading-screen .spinner .app-footer .footer-*` etc.) run e.g. `grep -rn "signals-grid" src`. Delete any class with zero remaining references. Keep only: `@tailwind` layers, the token blocks, the `*`/`html`/`body` base rules, `.spinner`/`.loading-screen` IF still referenced (replace with `Skeleton` first), and any genuinely global rule. Target: `index.css` well under 150 lines.

- [ ] **Step 3: Verify** Run: `cd frontend && npx tsc -b && npx eslint . && npm run build` Expected: success, no visual regressions from missing classes (all replaced by Tailwind).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/index.css && git rm frontend/src/App.css
git commit -m "chore(ui): remove dead legacy CSS and unused App.css"
```

---

## Task 15: /styleguide living showcase route

**Files:**
- Create: `frontend/src/pages/StyleGuidePage.tsx`
- Modify: `frontend/src/App.tsx` (add `/styleguide` protected route)

- [ ] **Step 1: Build `StyleGuidePage`** — sections rendering: color token swatches (background/card/primary/secondary/muted/destructive/up/down/neutral, both themes via the toggle), typography scale (Inter + JetBrains Mono samples with tabular-nums), buttons (all variants/sizes), inputs/select/switch, badges, `StatCard` (up/down/neutral), `ChartCard` shell, `ToggleBar`, skeleton, toast trigger, dialog/dropdown/tooltip. Use only token classes.

- [ ] **Step 2: Add route** in `App.tsx`: `<Route path="/styleguide" element={<ProtectedRoute><AppShell><StyleGuidePage/></AppShell></ProtectedRoute>} />`.

- [ ] **Step 3: Verify** Run: `cd frontend && npx tsc -b && npx eslint . && npm run build` Expected: success.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/StyleGuidePage.tsx frontend/src/App.tsx
git commit -m "feat(ui): add /styleguide living component + token showcase"
```

---

## Task 16: docs/DESIGN_SYSTEM.md

**Files:**
- Create: `docs/DESIGN_SYSTEM.md`

- [ ] **Step 1: Write the guide** covering: principles (§5.1 of the spec); token tables with the exact values from Task 1 (color light+dark, type scale, spacing, radius); typography rules (Inter UI, JetBrains Mono numerics, tabular-nums, sentence case); color/semantic usage (`up/down/neutral` rule); component usage rules + do/don'ts (compose shadcn, no bespoke CSS, no inline style for layout/color); layout patterns (AppShell, `max-w-[1440px]`, `grid-cols-12` dashboard, ChartCard/StatCard); how to add a new shadcn component; pointer to `/styleguide`. Keep it practical, with code snippets a developer can copy.

- [ ] **Step 2: Commit**

```bash
git add docs/DESIGN_SYSTEM.md
git commit -m "docs: add DESIGN_SYSTEM.md developer guide"
```

---

## Task 17: Bug / stale-code review pass

**Files:** (determined by the review)

- [ ] **Step 1: Run a structured review** across `frontend/src` (logic bugs, dead code, unused exports/imports, type-unsafe casts, missing loading/error states, a11y gaps, leftover `react-grid-layout` references, stale env handling). Known items to confirm-and-fix if not already: dead `loading` state (fixed in Task 9), compare date bug (Task 10), Day/Period labels (Task 6), any remaining inline-hex or `.css`-class usages (`grep -rn "style={{" src` and `grep -rn "className=\"[^\"]*\\b(card|info-|nav-|search-|tf-btn|ind-btn|compare-|signals-grid)\\b" src`).
- [ ] **Step 2: Fix confirmed issues**, each with the smallest safe change. Surface anything risky/ambiguous rather than guessing.
- [ ] **Step 3: Verify** Run: `cd frontend && npx tsc -b && npx eslint . && npm run test && npm run build` Expected: all green.
- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix(ui): resolve bugs and remove stale code found in review pass"
```

---

## Task 18: Final verification

- [ ] **Step 1: Full gate** Run: `cd frontend && npx tsc -b && npx eslint . && npm run test && npm run build` Expected: all green.
- [ ] **Step 2: Visual check** — run dev server, load each route at widths 375 / 768 / 1440 / 1920 in BOTH themes. Confirm: no horizontal overflow, no widget overlap, cards align, dropdowns/popovers stay on-screen, numerics use mono/tabular, toggling indicators reflows the grid cleanly, edit-mode drag/resize works and persists across reload. Capture screenshots (dark + light dashboard).
- [ ] **Step 3: Final commit** (if any tweaks)

```bash
git add -A
git commit -m "chore(ui): final responsive + theme polish"
```

---

## Self-Review (completed by plan author)

**Spec coverage:**
- §5.2 typography → Task 1 (fonts) + Task 16 (doc) ✓
- §5.3 color tokens (single source, semantic up/down/neutral, remove dup hex) → Task 1 ✓
- §5.4 spacing/radius/elevation/motion/container max-width → Task 1 + enforced per task ✓
- §5.5 component usage (shadcn-only, ChartCard/StatCard) → Tasks 3, 5, 6–13 ✓
- §6.1 app shell → Task 4 ✓
- §6.2 dashboard fixed grid + lazy edit mode + persistence → Tasks 7, 8, 9 ✓
- §6.3 compare same system → Task 10 ✓
- §7 file structure / App.tsx split / signals rename → Tasks 6–13 ✓
- §8 styling migration (remove inline styles, dead CSS) → Tasks 6–14 ✓
- §9 deliverables (DESIGN_SYSTEM.md, /styleguide) → Tasks 15, 16 ✓
- §10 bug/stale pass → Task 17 ✓
- §11 verification (tsc/build/lint/visual/theme) → Task 18 ✓
- §12 risks (page-by-page, runnable each step; chart-in-card contract; layout version) → addressed in Tasks 7/8/13 ✓

**Placeholder scan:** No "TBD/TODO/handle edge cases" placeholders; subtle code given verbatim, mechanical migrations specified with exact source line ranges + class mappings.

**Type consistency:** Component prop signatures in Task 6 match their `App.tsx` originals; `LayoutItem` from `react-grid-layout` used in Tasks 8 consistently; `loadLayout/saveLayout/defaultLayout/LAYOUT_VERSION` names consistent across Task 8 test + impl + EditableGrid; `buildSeries/performance/summary` consistent across Task 10 test + impl + ComparePage.

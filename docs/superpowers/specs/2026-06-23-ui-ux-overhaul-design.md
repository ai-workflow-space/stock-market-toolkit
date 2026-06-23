# UI/UX Overhaul & Design System — Design Spec

- **Date:** 2026-06-23
- **Status:** Approved (brainstorming) → ready for implementation plan
- **Scope:** `frontend/` (React 19 + TypeScript + Vite + Tailwind 3 + shadcn/ui)

---

## 1. Context & problem

The frontend works but its UI/UX is inconsistent and fragile. Confirmed root causes:

1. **`react-grid-layout` with hardcoded pixel heights** — e.g. `.card:has(.info-grid) { min-height: 1174px }`, grid items sized as fixed row counts × 120px. This is the primary source of widget overlap / overflow / grid-vs-content mismatch, and git history shows ~5 prior patch attempts (`0858123`, `0544b14`, `c142ca8`, `d09fedf`, `#28`).
2. **Three competing styling systems** — inline `style={{}}` scattered through `App.tsx`, a 797-line hand-rolled `index.css` (`.card`, `.info-grid`, `.signals-grid`…), *and* shadcn/ui. Nothing is unified.
3. **`App.tsx` is a god-file** (~1,000 lines): Navbar, SearchBar, all charts, Dashboard, ComparePage, Footer all in one module.
4. **Duplicate color systems** — a shadcn HSL token set *and* a separate hex set (`--bg`, `--surface`, `--card-bg`, …) define overlapping colors independently.
5. **No design documentation** — no tokens reference, no usage rules, no spacing scale. Ad-hoc values (`0.35rem`, `0.72rem`, `0.9rem`) everywhere.
6. **Misc:** container has no `max-width`; absolute-positioned dropdowns can overflow small viewports; inconsistent spacing.

## 2. Goals

- Define a **product UI/UX design spec** in the repo that future developers follow.
- Establish **one source of design tokens** (color, type, spacing, radius, elevation) and **one component vocabulary** (shadcn/ui).
- Replace the brittle dashboard layout with a **fixed responsive grid** (content-driven heights) that eliminates overlap/overflow, with an **opt-in "edit layout" mode**.
- Refactor `App.tsx` into focused, testable modules.
- Review the codebase and fix real bugs / remove stale code.

## 3. Non-goals

- No backend / API behavior changes (FastAPI + yfinance untouched, except bug fixes if any surface).
- No new product features beyond the optional `/styleguide` route.
- No migration to a different framework, charting lib, or routing lib.
- Not switching to a sidebar nav (keeping refined top nav — see §5).

## 4. Decisions (from brainstorming)

| Decision | Choice |
| --- | --- |
| Dashboard layout model | **Fixed responsive grid by default + opt-in "Edit layout" (drag/resize) mode** |
| Aesthetic direction | **Modern fintech** (Linear / Robinhood: airy, borders-first, restrained) |
| Themes | **Light + dark, dark default** (existing `ThemeContext` retained) |
| Navigation | **Refined top nav bar** (not a sidebar) — lower risk, search-centric app |
| Numeric font | **JetBrains Mono** added for prices / tables / stats (tabular figures) |
| Component showcase | **`/styleguide` route** added as a living, self-enforcing reference |

## 5. Design system spec

This section is the source of truth for `docs/DESIGN_SYSTEM.md` (the human-facing deliverable produced during implementation).

### 5.1 Principles
1. **Content-driven sizing** — never hardcode pixel heights; cards size to their content.
2. **One component vocabulary** — every surface/button/input/badge/dialog comes from shadcn/ui. No bespoke component CSS, no inline `style={{}}` for layout/spacing/color.
3. **Tokens, not magic numbers** — color/spacing/type/radius come from named tokens.
4. **Responsive by default** — 1 col mobile → multi-col desktop via breakpoints.
5. **Calm & data-first** — borders + subtle elevation over heavy shadows; semantic finance colors used sparingly and meaningfully.

### 5.2 Typography
- **UI font:** `Inter` (already loaded; weights 300–700, primarily 400/500/600).
- **Numeric/mono font:** `JetBrains Mono` — applied to prices, OHLCV tables, stat values, axis labels. Use `font-variant-numeric: tabular-nums` so digits align.
- **Type scale (rem / px @16):** `xs 0.75/12`, `sm 0.8125/13`, `base 0.875/14`, `lg 1/16`, `xl 1.25/20`, `2xl 1.5/24`, `3xl 1.875/30`.
- **Line heights:** body 1.5; tight headings 1.2.
- **Casing:** sentence case for labels/headings; uppercase reserved only for small section eyebrows (with letter-spacing).

### 5.3 Color tokens
Single HSL token set in `index.css` (`:root` = dark default; `[data-theme="light"]` = light override). The duplicate hex set (`--bg/--surface/--card-bg/--text/...`) is **removed**; any remaining references are migrated to the tokens below.

**Dark (default):**
```
--background: 224 71% 4%;        --foreground: 210 20% 98%;
--card: 224 39% 8%;              --card-foreground: 210 20% 98%;
--popover: 224 39% 8%;           --popover-foreground: 210 20% 98%;
--primary: 217 91% 60%;          --primary-foreground: 210 40% 98%;
--secondary: 223 30% 14%;        --secondary-foreground: 210 20% 98%;
--muted: 223 30% 14%;            --muted-foreground: 215 20% 65%;
--accent: 223 30% 16%;           --accent-foreground: 210 20% 98%;
--destructive: 0 72% 51%;        --destructive-foreground: 210 40% 98%;
--border: 223 30% 16%;           --input: 223 30% 16%;            --ring: 217 91% 60%;
--radius: 0.625rem;
```
**Light:**
```
--background: 0 0% 100%;         --foreground: 224 71% 4%;
--card: 0 0% 100%;               --card-foreground: 224 71% 4%;
--popover: 0 0% 100%;            --popover-foreground: 224 71% 4%;
--primary: 217 91% 60%;          --primary-foreground: 0 0% 100%;
--secondary: 220 14% 96%;        --secondary-foreground: 224 71% 11%;
--muted: 220 14% 96%;            --muted-foreground: 220 9% 46%;
--accent: 220 14% 96%;           --accent-foreground: 224 71% 11%;
--destructive: 0 72% 45%;        --destructive-foreground: 0 0% 100%;
--border: 220 13% 91%;           --input: 220 13% 91%;            --ring: 217 91% 60%;
```
**Semantic finance tokens (both themes; tune light variants for contrast):**
```
--up: 142 71% 45%;   --up-foreground: 0 0% 100%;
--down: 0 72% 51%;   --down-foreground: 0 0% 100%;
--neutral: 215 20% 65%;
```
Exposed in Tailwind as `up` / `down` / `neutral` color utilities. **Rule:** price/percentage deltas use `up`/`down`; never raw `green-500`/`red-500`.

### 5.4 Spacing, radius, elevation, motion
- **Spacing:** Tailwind 4px scale only (`1`=4px … `4`=16px … `8`=32px). No ad-hoc rem values.
- **Radius:** `sm = radius−4px`, `md = radius−2px`, `lg = radius` (driven by `--radius`).
- **Elevation:** borders-first. One shadow token for floating surfaces (popover/dropdown/dialog). Cards use border + bg, no shadow.
- **Motion:** 150–200ms ease for hovers/transitions; respect `prefers-reduced-motion`.
- **Container:** page content max-width `1440px`, centered, responsive horizontal padding.

### 5.5 Component usage rules
- Surfaces → `Card` (+ `CardHeader/Content/Footer`). Define a `ChartCard` wrapper (title + optional toolbar + body) and a `StatCard` (label + mono value + optional delta).
- Actions → `Button` variants (`default/secondary/outline/ghost/destructive`); pill toggle groups (timeframe/indicators) → `ToggleGroup` or `Button` with `aria-pressed`.
- Inputs → `Input`/`Select`/`Switch`/`Label`. Search dropdown → shadcn `Command`/`Popover` (Radix positioning) instead of a hand-rolled absolute dropdown.
- Feedback → `Skeleton` for loading, `sonner` toasts for transient messages, `Badge` for tags/signal direction, `Tooltip` for icon-only controls.
- **Do / Don't:** Do compose from `ui/`; don't write new `.css` component classes or inline layout styles. Do use tokens; don't hardcode hex/px.

## 6. Layout architecture

### 6.1 App shell
- `AppShell` = top `Navbar` (logo + route links + global search + theme toggle + user menu via `dropdown-menu`) + `<main>` (max-width container) + `Footer` (version/SHA).
- Mobile: nav links collapse into a menu; search remains reachable.

### 6.2 Dashboard
- **Default:** static Tailwind `grid grid-cols-12` with responsive spans and **content-driven heights** (no fixed px):
  - Price chart → `col-span-12`
  - RSI / MACD → `col-span-12 lg:col-span-6` (stack on mobile)
  - Stock info → `col-span-12 lg:col-span-4`; Data table → `col-span-12 lg:col-span-8`
- Charts use Recharts `ResponsiveContainer` with sensible fixed *aspect/height per card* (chart body, not the card), so cards grow with content.
- **Edit mode:** an "Edit layout" toggle lazy-mounts `react-grid-layout` (code-split) and lets users drag/resize; layout persists to `localStorage`. Default path does **not** import `react-grid-layout`.

### 6.3 Compare page
- Same grid system + same `ChartCard`/`StatCard` components.

## 7. File / component structure (target)

```
frontend/src/
  components/
    layout/      AppShell.tsx  Navbar.tsx  Footer.tsx
    dashboard/   SearchBar.tsx  TimeframeSelector.tsx  IndicatorToggles.tsx
                 PriceChart.tsx  RSIChart.tsx  MACDChart.tsx
                 StockInfoCard.tsx  DataTable.tsx
                 ChartCard.tsx  StatCard.tsx  DashboardGrid.tsx (+ EditableGrid.tsx lazy)
    ui/          (shadcn primitives — add: dropdown-menu, tooltip, skeleton,
                  scroll-area, command, popover, sonner, toggle-group)
    SignalCard.tsx
  pages/         DashboardPage.tsx  ComparePage.tsx  SignalsPage.tsx
                 AlertsPage.tsx  SettingsPage.tsx  LoginPage.tsx  RegisterPage.tsx
                 StyleGuidePage.tsx
  App.tsx        (routing + providers only)
```
- Extract Dashboard/Compare out of `App.tsx`; `App.tsx` keeps only routing + providers.
- Note: current `pages/DashboardPage.tsx` is actually the **signals** view → rename to `SignalsPage.tsx`; route `/` → new `DashboardPage`, `/signals` → `SignalsPage`.

## 8. Styling migration
- Delete dead `App.css` and unused/obsolete classes from `index.css`; keep only Tailwind layers, token definitions, base resets, and any genuinely-global rules.
- Remove all inline `style={{}}` used for layout/spacing/color (keep only truly dynamic values, e.g. computed chart dims).
- Replace `corePlugins.preflight: false` consideration: verify base resets are intact after migration.

## 9. Deliverables
1. `docs/DESIGN_SYSTEM.md` — principles, full token tables (values from §5), typography, color/semantic usage, spacing, component usage rules + do/don'ts, layout patterns.
2. `/styleguide` route — living showcase of tokens + every component state.
3. Refactored, token-driven, overflow-free UI across all pages.

## 10. Bug / stale-code pass
Parallel review of the codebase for: logic bugs, dead/unreachable code, stale CSS, type errors, missing loading/error states, accessibility gaps, and `react-grid-layout` remnants. Fix what's clearly safe; surface anything risky before changing it.

## 11. Verification
- `tsc --noEmit` clean; `vite build` succeeds; lint clean.
- Manual/visual check at mobile (375px), tablet (768px), desktop (1440px), ultra-wide (1920px+): no overlap, no horizontal overflow, cards align, dropdowns stay on-screen.
- Theme toggle verified in both light and dark across all pages.
- `/styleguide` renders all components in both themes.

## 12. Risks & mitigations
- **Visual regressions during refactor** → migrate page-by-page; keep app runnable at each step; verify build + visual after each page.
- **Chart sizing inside flexible cards** → standardize a `ChartCard` body height contract; test with indicators on/off.
- **Edit-mode persistence/versioning** → store a layout schema version in `localStorage`; fall back to default on mismatch.

## 13. Out of scope
- Backend changes, new data sources, new product features, auth changes, framework/lib swaps.

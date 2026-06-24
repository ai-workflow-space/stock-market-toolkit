# UI/UX Refactoring Plan

> **Tracking issue:** #20  
> **Design system:** [design-system.md](./design-system.md) · [ui-components.md](./ui-components.md)

---

## Current Problems

| # | Problem | Severity |
|---|---------|----------|
| 1 | `App.tsx` is a 993-line god-component — all components defined inline | High |
| 2 | No component library — every UI element is hand-rolled CSS | High |
| 3 | Zero accessibility — no ARIA, no keyboard nav, no focus rings | High |
| 4 | `react-grid-layout` overflow bug: `.container` max-width causes horizontal scroll | High |
| 5 | Login/Register use dated layout (split hero + card approach not consistent) | Medium |
| 6 | Alerts page uses custom tab implementation instead of proper accessible tabs | Medium |
| 7 | Stock info card is information overload — 16 metrics in 2-column grid | Medium |
| 8 | No loading skeletons — async content shows blank space | Medium |
| 9 | Charts use inline styles instead of design tokens | Low |
| 10 | `docs/architecture.md` component tree is stale | Low |

---

## Phases

### Phase 0 — Design System Foundation ✅
**Status:** Complete  
**Deliverables:**
- [x] `docs/design-system.md` — tokens, typography, spacing, motion, theme, a11y, file conventions
- [x] `docs/ui-components.md` — component inventory, states, usage examples
- [x] `docs/ui-ux-plan.md` — this document

---

### Phase 1 — Tooling & Architecture
**Goal:** Set up Tailwind CSS + shadcn/ui + restructure App.tsx  
**Branch:** `feat/ui-tooling`

| # | Task | Notes |
|---|------|-------|
| 1.1 | Install Tailwind CSS v4 + configure with design token CSS vars | Use `@tailwindcss/vite` or classic PostCSS setup |
| 1.2 | Run `npx shadcn@latest init` — configure `components.json` | Set path to `src/components/ui`, base color `--color-primary` |
| 1.3 | Add shadcn primitives: `button input card badge dialog select tabs tooltip separator skeleton` | Run per component |
| 1.4 | Extract inline components from `App.tsx` into `src/components/domain/` | Each to its own file + subfolder |
| 1.5 | Move page-level logic out of `App.tsx` — `App.tsx` becomes pure router | Dashboard → `pages/DashboardPage.tsx`, etc. |
| 1.6 | Fix `react-grid-layout` overflow bug: remove `max-width` from `.container` in `index.css` | Quick win, confirmed fix from prior session |

**Acceptance criteria:**
- `npm run build` passes with no errors
- All existing pages render identically after migration
- No CSS class name collisions between old and new

---

### Phase 2 — Core UI Refactor
**Goal:** Rebuild all pages using shadcn + domain components  
**Branch:** `feat/ui-pages`

| # | Task | Notes |
|---|------|-------|
| 2.1 | Rebuild **Login / Register** pages | shadcn `Card` + `Form` + `Input` + `Button`; single-column centered layout |
| 2.2 | Rebuild **Dashboard** page | shadcn `Card` for chart containers; fix StockInfoCard layout (reduce to 8 key metrics + "show more") |
| 2.3 | Rebuild **Alerts** page | shadcn `Tabs` (Active / Triggered / All); `AlertCard` domain component |
| 2.4 | Rebuild **Settings** page | shadcn `Card`, `Switch`, `Select`; theme toggle wired to `ThemeContext` |
| 2.5 | Replace custom chart tooltips with accessible equivalents | Use shadcn `Tooltip` or Recharts' built-in with ARIA |
| 2.6 | Add **loading skeletons** to all async content | Use shadcn `Skeleton`; never show blank space |
| 2.7 | Add **error states** to all async components | Error message + retry button |

**Acceptance criteria:**
- All pages pass WCAG 2.1 AA color contrast check
- Keyboard-only navigation works on all pages
- Both dark and light themes render correctly on all pages

---

### Phase 3 — Polish
**Goal:** Animation, responsiveness, motion  
**Branch:** `feat/ui-polish`

| # | Task | Notes |
|---|------|-------|
| 3.1 | Add **Framer Motion** for page transitions | Fade + slide between routes |
| 3.2 | Add **chart entrance animations** | Staggered fadeIn for chart lines |
| 3.3 | Add **dropdown / modal** animations | fadeSlideIn per design-system recipe |
| 3.4 | Implement **responsive navbar** | Hamburger menu on mobile, drawer on open |
| 3.5 | Implement **responsive chart grid** | 1-col mobile, 2-col tablet, full layout desktop |
| 3.6 | Verify `prefers-reduced-motion` is honored | Disable all non-essential animations |

**Acceptance criteria:**
- Lighthouse accessibility score ≥ 90 on all pages
- Page load feels snappy (< 250ms perceived transition)
- Mobile: all pages usable at 375px width

---

### Phase 4 — Stretch
**Goal:** Advanced patterns for future development

| # | Task | Notes |
|---|------|-------|
| 4.1 | **TanStack Table** for data table — sorting, filtering, pagination | Replace simple `<table>` with full data grid |
| 4.2 | **Command palette** (Cmd+K) for symbol search | Use `cmdk` library |
| 4.3 | **Skeleton loading** for initial page loads | Suspense boundaries per route |
| 4.4 | **End-to-end tests** with Playwright | Smoke test: login → search → view chart → logout |

---

## Non-Goals (Out of Scope)

- Changing the visual design language (dark-first, blue primary is working)
- Removing `recharts` — it's a solid charting library for this use case
- Adding WebSocket/real-time data (separate architecture work)
- Rewriting the backend API shape

---

## Dependencies

- Phase 1 must be **merged before** Phase 2 can start
- Phase 2 must be **merged before** Phase 3 can start
- No phase depends on backend changes

---

## Verification Checklist (per PR)

Before opening a PR for any phase:

- [ ] `npm run build` passes
- [ ] `npm run lint` passes (or eslint disabled for generated shadcn files)
- [ ] Dark + light theme verified manually
- [ ] Keyboard navigation tested (Tab, Enter, Space, Escape)
- [ ] No hardcoded hex values in component files
- [ ] Component uses `var(--color-*)` tokens only
- [ ] No `any` types in component props
- [ ] Loading + error states implemented
- [ ] ARIA labels present on icon-only buttons
- [ ] `docs/architecture.md` updated if component tree changed
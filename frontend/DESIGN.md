# Stock Toolkit — UI/UX Design Spec

> Documented 2026-06-22. Update this file before any UI change. No emoji in nav or page elements — use SVG/text labels only.

---

## 1. Design Language

**Aesthetic:** Dark financial dashboard. Inspired by Bloomberg Terminal meets modern SaaS (Linear, Vercel). Professional, data-dense, no decoration for its own sake.

**Color Palette:**
```
--bg-base:       #0f172a   /* page background */
--bg-surface:    #1e293b   /* cards, panels */
--bg-elevated:   #334155   /* dropdowns, hover */
--border:        #334155   /* dividers, outlines */
--text-primary:  #e2e8f0   /* headings, values */
--text-muted:    #64748b   /* labels, metadata */
--accent-blue:   #3b82f6   /* primary actions, links, price */
--accent-green:  #22c55e   /* positive change, success */
--accent-red:    #ef4444   /* negative change, error */
--accent-yellow: #f59e0b   /* SMA20, warnings */
--accent-purple: #8b5cf6   /* EMA12, MACD */
--accent-teal:   #10b981   /* SMA50 */
```

**Typography:**
- Font: `Inter` (Google Fonts) with `-apple-system, BlinkMacSystemFont, sans-serif` fallback
- Monospace numbers: `font-variant-numeric: tabular-nums` for aligned prices
- Scale: 0.75rem (xs), 0.85rem (sm), 0.9rem (base), 1rem (md), 1.25rem (lg), 1.5rem (xl)
- Weight: 400 normal, 500 medium (labels), 600 semibold (values), 700 bold (headings)

**Spacing:** 4px base unit. Components use 0.5rem (8px), 0.75rem (12px), 1rem (16px), 1.5rem (24px), 2rem (32px).

**Border Radius:** 6px (buttons, inputs), 8px (cards), 10px (modals, dropdowns).

**Spacing Scale** (4px base unit — from design-system skill):

| Token | Value | Use |
|-------|-------|-----|
| `--space-1` | 4px | Tight gaps |
| `--space-2` | 8px | Icon padding, small gaps |
| `--space-3` | 12px | Dropdown item padding |
| `--space-4` | 16px | Standard padding, input padding |
| `--space-5` | 20px | Card padding |
| `--space-6` | 24px | Section gaps |
| `--space-8` | 32px | Large section gaps |

---

## 2. Layout System

**Page Shell:**
```
<nav className="navbar">  ← fixed top, 56px height
  <div className="container">  ← max-width 1280px, centered, px-4
    <main className="page">   ← py-6, min-height calc(100vh - 56px)
```

**Container:** `max-width: 1280px; margin: 0 auto; padding: 0 1rem`

**Grid:** CSS Grid for chart layouts. Charts use `display: grid; gap: 1rem`. Charts grid: `grid-template-columns: repeat(auto-fit, minmax(300px, 1fr))`.

---

## 3. Navigation

**Top Bar (`.navbar`):**
- Logo: `📈 Stock Toolkit` — clickable, links to `/`
- Nav links: `Dashboard` (→ `/`), `Compare` (→ `/compare`)
- Right side: username + Logout button
- Background: `--bg-surface`, border-bottom: 1px solid `--border`
- Height: 56px, padding: 0 1rem
- No bell icon. No notification indicators in nav.

**Nav link style:**
- Default: `--text-muted`, no underline
- Active: `--text-primary`, font-weight 500
- Hover: `--text-primary`

---

## 4. Color System (Tailwind-equivalent CSS vars)

Use these CSS variables in all component styles. Do NOT use raw hex values in components.

```css
/* Backgrounds */
bg-base      → #0f172a
bg-surface   → #1e293b
bg-elevated  → #334155

/* Text */
text-primary → #e2e8f0
text-muted   → #64748b

/* Semantic */
color-buy    → #22c55e  (positive)
color-sell   → #ef4444  (negative)
color-accent → #3b82f6  (primary actions, links)

/* Borders */
border-default → #334155
border-focus   → #3b82f6
```

---

## 5. Component Library

### 5.1 Button (`.search-btn` / `.btn`)
```css
background: #3b82f6; color: #fff; border: none;
padding: 0.5rem 1rem; border-radius: 6px;
font-size: 0.875rem; font-weight: 500; cursor: pointer;
transition: background 0.15s;
```
- Disabled: `opacity: 0.5; cursor: not-allowed`
- Secondary: `background: #334155; color: #e2e8f0`
- Hover: `background: #2563eb`
- Active: `background: #1d4ed8`

### 5.2 Input (`.search-input`)
```css
background: #0f172a; border: 1px solid #334155;
color: #e2e8f0; padding: 0.5rem 0.75rem;
border-radius: 6px; font-size: 0.875rem;
outline: none; transition: border-color 0.15s;
```
- Focus: `border-color: #3b82f6`
- Placeholder: `color: #475569`

### 5.3 Card (`.card`)
```css
background: #1e293b; border: 1px solid #334155;
border-radius: 8px; padding: 1rem;
```
- Title: `.card-title` — `color: #e2e8f0; font-size: 0.9rem; font-weight: 600; margin-bottom: 0.75rem`

### 5.4 Dropdown / Search Results Panel (`.search-dropdown`)
Based on shadcn/ui Popover + design-system component specs.

```css
position: absolute; top: calc(100% + 4px); left: 0; right: 0;
background: #1e293b; border: 1px solid #334155;
border-radius: 8px; z-index: 50;
box-shadow: 0 4px 16px rgba(0,0,0,0.4);
overflow: hidden;
```

**Item (`.search-dropdown-item`):**
```css
display: flex; align-items: center; gap: 0.75rem;
padding: 0.6rem 0.875rem;
border-bottom: 1px solid #0f172a;
cursor: pointer;
transition: background 0.1s;
```
- Hover: `background: #334155`
- Active/focus: `background: #334155; outline: 2px solid #3b82f6; outline-offset: -2px`
- Last item: `border-bottom: none`
- Keyboard navigation (arrow keys + enter) must be supported

**Dropdown item content layout:**
```
[ symbol (blue, bold) | name (muted, truncate) | exchange (dim, right-aligned) ]
```
- Symbol: `.dropdown-symbol` — `color: #3b82f6; font-weight: 600; font-size: 0.875rem; min-width: 60px`
- Name: `.dropdown-name` — `color: #94a3b8; font-size: 0.8rem; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap`
- Exchange: `.dropdown-exchange` — `color: #475569; font-size: 0.72rem; text-align: right`

**Max height:** `max-height: 320px; overflow-y: auto` — scroll for long lists.

**States to handle:**
- Empty results: show "No results for '{query}'" with muted text
- Loading: show "Searching…" centered, muted
- Error: show "Search failed" with retry option

### 5.6 Ticker Chip (`.ticker-chip`)
Used in Compare page for one-by-one added tickers.
```css
display: inline-flex; align-items: center; gap: 0.35rem;
background: #334155; color: #e2e8f0;
padding: 0.3rem 0.6rem; border-radius: 20px;
font-size: 0.8rem; font-weight: 500;
```
- Remove button (×): `background: none; border: none; color: #64748b; cursor: pointer; padding: 0 2px; font-size: 1rem; line-height: 1`
- Hover remove: `color: #ef4444`

### 5.7 Info Card (`.info-card`)
```css
background: #1e293b; border: 1px solid #334155;
border-radius: 8px; padding: 1rem;
```
- Header: flex, space-between. Symbol: `font-size: 1.25rem; font-weight: 700; color: #e2e8f0`. Price: `font-size: 1.5rem; font-weight: 700`
- Grid: `display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem`
- Label: `color: #64748b; font-size: 0.75rem; margin-bottom: 0.2rem`
- Value: `color: #e2e8f0; font-size: 0.875rem; font-weight: 600`

### 5.8 Timeframe Bar (`.timeframe-bar`)
```css
display: flex; gap: 0.25rem; background: #0f172a;
padding: 0.25rem; border-radius: 8px;
```
- Button: `padding: 0.35rem 0.75rem; border-radius: 6px; font-size: 0.8rem; border: none; background: transparent; color: #64748b; cursor: pointer`
- Active: `background: #3b82f6; color: #fff; font-weight: 500`

### 5.9 Indicator Bar (`.indicator-bar`)
```css
display: flex; gap: 0.35rem; flex-wrap: wrap;
```
- Button style similar to timeframe, smaller font (0.75rem)

### 5.10 News Item (`.news-item`)
```css
display: block; padding: 0.75rem;
background: #0f172a; border-radius: 8px;
text-decoration: none; transition: background 0.15s;
```
- Hover: `background: #1e293b`
- Title: `color: #e2e8f0; font-size: 0.9rem; font-weight: 500; margin-bottom: 0.25rem`
- Meta: `color: #64748b; font-size: 0.78rem`

---

## 6. Pages

### 6.1 Dashboard (route: `/`)
**Layout:**
```
<Navbar />
<SearchBar />           ← full width, with dropdown
<TimeframeSelector />   ← inline with SearchBar
<IndicatorToggles />    ← below
<ChartsGrid>            ← 2-col grid on desktop
  <PriceChart />        ← spans full width
  <RSIChart />          ← half width
  <MACDChart />         ← half width
<StockInfoCard />       ← 2-col grid
<DataTable />           ← full width
<NewsPanel />           ← below table
```

### 6.2 Compare (route: `/compare`)
**Before submission:**
```
<Navbar />
<h2>Compare Stocks</h2>
<TickerChipsRow>         ← chips with × buttons (if any added)
<AddTickerSearchInput>   ← inline search with dropdown, "+ Add" button
<form>                   ← comma-separated input + timeframe + Compare button
```

**After submission:** comparison chart + stock summary cards.

### 6.3 Alerts (route: `/alerts`) — DO NOT add bell icon to navbar
The Alerts page should be accessible via the Compare link or a dedicated nav link.
If adding an Alerts nav item: use text label `Alerts` not a bell emoji.
Alert count badge (unread count): red circle, white number, positioned top-right of the nav link.

---

## 7. Error & Loading States

**Error banner (`.error-banner`):**
```css
background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444;
color: #ef4444; padding: 0.75rem 1rem; border-radius: 8px;
font-size: 0.875rem; margin-bottom: 1rem;
```

**Loading screen:**
```css
.loading-screen { display: flex; align-items: center; justify-content: center; min-height: 200px; }
.spinner { width: 32px; height: 32px; border: 3px solid #334155; border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
```

**Empty state:** `color: #475569; font-size: 0.9rem; margin-top: 1rem; text-align: center`

---

## 8. Responsive Breakpoints

```css
/* Mobile first */
@media (min-width: 640px)  { /* sm */ }
@media (min-width: 768px)  { /* md */ }
@media (min-width: 1024px) { /* lg — default dashboard layout */ }
@media (min-width: 1280px) { /* xl — max container */ }
```

- Charts: single column on mobile, 2-col on md+
- Info card grid: 2-col on mobile, 3-col on lg+
- Compare page chips: wrap on mobile

---

## 9. Icon & Emoji Policy

**RULE: No emoji in UI elements.** All visual indicators must use:
- Text labels: `▲` / `▼` for price direction (use CSS `color` for green/red)
- SVG icons for: search (🔍 → SVG magnifier), logout (→ SVG arrow-right-from-bracket), add (→ SVG plus)
- Or: use CSS-based indicators with proper `aria-label` for accessibility

**Allowed emoji in non-UI contexts:**
- Navbar logo: `📈` is acceptable as a brand mark (not an interactive element)
- Section titles: no emoji — use text labels

---

## 10. Accessibility

- All interactive elements must have `aria-label` if they contain only icons
- Color is never the only indicator of meaning (always pair with text/symbol)
- Focus states: `outline: 2px solid #3b82f6; outline-offset: 2px`
- Form labels associated with inputs
- Contrast ratio: minimum 4.5:1 for text

---

## 11. CSS File Structure

All styles live in `frontend/src/index.css` (imported by `main.tsx`). No inline styles except for dynamic values (price colors, etc.).

**CSS custom properties** (define at top of index.css):
```css
:root {
  --bg-base: #0f172a;
  --bg-surface: #1e293b;
  --bg-elevated: #334155;
  --border: #334155;
  --text-primary: #e2e8f0;
  --text-muted: #64748b;
  --color-accent: #3b82f6;
  --color-positive: #22c55e;
  --color-negative: #ef4444;
}
```

---

## 12. What This Prevents

| Problem | Prevention |
|---------|-----------|
| Nav bar accumulates emoji icons (🔔, 🔴, etc.) | This spec: text labels only, no emoji in nav |
| Styles break on mobile | Responsive breakpoints in §8 |
| Color inconsistencies | CSS variables in §11 — use vars, not hex |
| Dropdown styling drifts | Component specs in §5.4, §5.5 |
| New pages added without matching design | Every page described in §6 |
| Accessibility ignored | §10 mandates aria-labels, focus states |
| News panel looks different from other cards | §5.10 defines exact news item styles |

---

*When changing anything in the UI: read this doc first. Update it after.*

## Design System Reference

Based on [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (94.8k stars) design-system + ui-styling skills:

- **Token architecture:** 3-layer (primitive → semantic → component) — see §11 CSS variables
- **Component specs:** Button/Input/Card states — see §5 component library
- **Spacing scale:** 4px base — see §1 Spacing Scale
- **Dropdown/Combobox:** shadcn/ui Popover pattern, keyboard-navigable — see §5.4
- **Future components:** Prefer shadcn/ui primitives (Radix UI) over custom implementations
  - https://ui.shadcn.com — component library with dark mode support
  - Install via: `npx shadcn@latest add popover combobox dialog`

---
_This document is the source of truth. It is referenced by `.opencode/SYSTEM_PROMPT.md` and loaded on every OpenCode dispatch. When updating this document, also update the symlink in `.opencode/`._
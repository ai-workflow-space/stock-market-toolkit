# UI Component Reference

> **Status:** v0.2.0 — Components to be built. Follow the [Design System](./design-system.md) tokens and rules.

## Table of Contents

1. [Overview](#1-overview)
2. [shadcn/ui Primitives](#2-shadcnui-primitives)
3. [Domain Components](#3-domain-components)
4. [Component States](#4-component-states)
5. [Usage Examples](#5-usage-examples)

---

## 1. Overview

### Source of Truth
- **shadcn/ui** — copy-paste components installed via `npx shadcn@latest add <component>`. Source is owned by the project (not a library dependency).
- **Domain components** — composed in `src/components/domain/`, built on top of shadcn primitives + design tokens.

### Adding a shadcn Component

```bash
cd frontend
npx shadcn@latest add button input card badge dialog select tabs tooltip separator skeleton
```

Then move generated files from `frontend/src/components/ui/` into the project's conventions.

---

## 2. shadcn/ui Primitives

The following components form the foundation. **Always prefer these over custom implementations.**

### 2.1 Button

**Variants:**

| Variant | Use |
|---------|-----|
| `default` | Primary actions (submit, confirm) |
| `secondary` | Secondary actions (cancel, back) |
| `destructive` | Delete, remove, dangerous actions |
| `outline` | Alternativeto default, less visual weight |
| `ghost` | Low-emphasis actions in dense UIs |
| `link` | Inline text links |

**Sizes:** `sm` (h-8), `default` (h-10), `lg` (h-12)

**Rules:**
- Every form submission must be a `<button type="submit">`
- Icon-only buttons **must** have `aria-label`
- Loading state uses a `<span className="animate-spin">` inside the button, with `disabled` and `aria-disabled`

**Token mapping (Tailwind):**
```tsx
<Button className="bg-[var(--color-primary)] text-white hover:opacity-90 rounded-[var(--radius-md)]">
  Analyze
</Button>
```

### 2.2 Input

**Rules:**
- Always pair with a `<label>` — never rely on `placeholder` as the only label
- Error state: red border `border-[var(--color-danger)]` + error message below
- Disabled: `opacity-50 cursor-not-allowed`

### 2.3 Card

**Composition:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Stock Overview</CardTitle>
    <CardDescription>AAPL — 1MO</CardDescription>
  </CardHeader>
  <CardContent>
    {/* chart/content */}
  </CardContent>
</Card>
```

**Styling:** Card background uses `var(--color-card)`, border uses `var(--color-border)`, radius uses `var(--radius-lg)`.

### 2.4 Badge

**Variants:** `default`, `secondary`, `success`, `destructive`, `outline`

**Use cases in this app:**
- Price change badges: green (`success`) for positive, red (`destructive`) for negative
- Indicator active state: `default` (primary blue)
- Alert type: `secondary`

### 2.5 Dialog / Modal

**Used for:** Confirmations, detailed stock info overlays, alert creation/editing.

**Rules:**
- Always trap focus inside the dialog
- Close on `Escape` key
- `aria-modal="true"` and `role="dialog"`
- Backdrop: `bg-black/50` with `backdrop-blur-sm`

### 2.6 Select

**Used for:** Timeframe selection, indicator selection, sort order.

**Rules:**
- Same accessibility as native `<select>` — keyboard navigable
- `aria-label` if no visible label

### 2.7 Tabs

**Used for:** Alerts page (Active / Triggered / All), Settings sections.

**Rules:**
- Tab list uses `role="tablist"`, tabs use `role="tab"`, panels use `role="tabpanel"`
- Arrow key navigation between tabs
- Active tab visually distinct (primary color indicator)

### 2.8 Tooltip

**Used for:** Chart tooltips (already Recharts handles this), icon button labels, abbreviation explanations.

**Rules:**
- Delay: 400ms before show, 0ms hide
- `aria-describedby` on the trigger element

### 2.9 Separator

**Used for:** Dividing sections within cards, between nav items.

```tsx
<Separator className="bg-[var(--color-border)]" />
```

### 2.10 Skeleton

**Used for:** Loading states of all async content.

```tsx
<Skeleton className="h-4 w-3/4 bg-[var(--color-surface)]" />
```

---

## 3. Domain Components

These are business-specific components built on top of the primitives.

### 3.1 SearchBar

**Location:** `src/components/domain/SearchBar/`

**Props:**
```tsx
interface SearchBarProps {
  onSearch: (symbol: string) => void;
  loading?: boolean;
}
```

**Behavior:**
- Debounced 300ms before API call
- Dropdown shows up to 8 results (symbol, name, exchange)
- Keyboard: Arrow keys navigate results, Enter selects, Escape closes
- Empty query (<3 chars): no API call, no dropdown
- Loading state: shows "Searching…" in dropdown

**States:** default, typing, loading, results-shown, error

### 3.2 StockChartCard

**Location:** `src/components/domain/StockChartCard/`

**Props:**
```tsx
interface StockChartCardProps {
  stock: StockData;
  indicators: Indicators;
  activeIndicators: Set<string>;
  showBB: boolean;
}
```

**Contains:** `Card` wrapper + title bar + `PriceChart` + sub-chart (RSI / MACD)

**States:** loading (skeleton), error (error banner), data (charts rendered)

### 3.3 StockInfoCard

**Location:** `src/components/domain/StockInfoCard/`

**Props:**
```tsx
interface StockInfoCardProps {
  info: StockInfo;
  stock: StockData;
}
```

**Display:** Symbol, name, current price, day change (colored), 2-column grid of metrics.

**Rules:**
- 2-column auto-fill grid with `minmax(160px, 1fr)`
- Each metric item: label (uppercase, `--text-xs`) + value (regular, `--text-base`, font-weight 600)

### 3.4 TimeframeSelector

**Location:** `src/components/domain/TimeframeSelector/`

**Props:**
```tsx
interface TimeframeSelectorProps {
  value: string;
  onChange: (timeframe: string) => void;
}
```

**Variants:** Implemented as a segmented button group (see Tabs pattern).

### 3.5 IndicatorToggle

**Location:** `src/components/domain/IndicatorToggle/`

**Props:**
```tsx
interface IndicatorToggleProps {
  active: Set<string>;
  onToggle: (key: string) => void;
}
```

**Display:** Row of toggle buttons (like the existing `IndicatorToggles` component). Uses `Badge` or `Button variant="outline"` style.

### 3.6 PriceChangeBadge

**Location:** `src/components/domain/PriceChangeBadge/`

**Props:**
```tsx
interface PriceChangeBadgeProps {
  value: number;       // absolute change
  percent: number;     // percentage change
}
```

**Display:** Colored badge with ▲/▼ arrow, absolute value, percentage. Green for positive, red for negative.

### 3.7 DataTable

**Location:** `src/components/domain/DataTable/`

**Props:**
```tsx
interface DataTableProps {
  stock: StockData;
  maxRows?: number;    // default: 30
}
```

**Display:** OHLCV data table with sortable columns. Most recent 30 rows shown by default.

**Rules:**
- Sort by clicking column headers
- Alternating row backgrounds for readability
- Price column (Close) highlighted with `--color-primary`

### 3.8 AlertCard

**Location:** `src/components/domain/AlertCard/`

**Props:**
```tsx
interface AlertCardProps {
  alert: Alert;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}
```

**Display:** Alert type badge, symbol, condition description, target price, status indicator.

**States:** active (green), triggered (yellow), paused (gray)

### 3.9 NavBar

**Location:** `src/components/domain/NavBar/`

**Display:** Logo + nav links + user menu + theme toggle + logout

**Rules:**
- Sticky top, `z-index: 100`
- Active nav link highlighted with `--color-primary`
- Mobile: collapses to hamburger menu (drawer)

---

## 4. Component States

Every component must handle all applicable states:

| State | How to represent |
|-------|-----------------|
| **Default** | Normal resting state |
| **Hover** | Subtle background change, 100ms transition |
| **Active / Pressed** | Slightly darker/pressed look |
| **Focused** | 2px `--color-primary` ring, 2px offset |
| **Disabled** | `opacity-50`, `cursor-not-allowed`, `aria-disabled="true"` |
| **Loading** | `<Skeleton>` or spinner, `aria-busy="true"` on container |
| **Error** | Red border, error icon + message below |
| **Empty** | Placeholder message or empty state illustration |

---

## 5. Usage Examples

### Form with validation (Login)

```tsx
<Card className="w-full max-w-[420px] mx-auto">
  <CardHeader>
    <CardTitle>Sign in</CardTitle>
    <CardDescription>Access your account</CardDescription>
  </CardHeader>
  <CardContent>
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-[var(--text-sm)] font-medium">
          Email
        </label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
        />
        {errors.email && (
          <p id="email-error" role="alert" className="text-[var(--color-danger)] text-xs">
            {errors.email.message}
          </p>
        )}
      </div>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
        Sign in
      </Button>
    </form>
  </CardContent>
</Card>
```

### Alert Card

```tsx
<Card>
  <CardHeader className="flex-row items-center justify-between">
    <div className="flex items-center gap-3">
      <Badge variant={alert.active ? "success" : "secondary"}>
        {alert.active ? "Active" : "Triggered"}
      </Badge>
      <span className="font-mono font-semibold">{alert.symbol}</span>
    </div>
    <div className="flex gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onToggle(alert.id)}
        aria-label={alert.active ? "Pause alert" : "Activate alert"}
      >
        {alert.active ? <PauseIcon /> : <PlayIcon />}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(alert.id)}
        aria-label="Delete alert"
        className="text-[var(--color-danger)]"
      >
        <TrashIcon />
      </Button>
    </div>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-[var(--color-text-dim)]">
      {alert.condition} at ${alert.targetPrice}
    </p>
  </CardContent>
</Card>
```

### Search Dropdown

```tsx
<div role="listbox" aria-label="Symbol search results">
  {results.map(r => (
    <button
      key={r.symbol}
      role="option"
      aria-selected={selected === r.symbol}
      className="flex items-center gap-3 w-full px-3 py-2 hover:bg-[var(--color-surface)] transition-colors"
    >
      <span className="font-mono font-semibold">{r.symbol}</span>
      <span className="text-[var(--color-text-dim)] text-sm truncate">{r.name}</span>
      {r.exchange && (
        <Badge variant="outline" className="ml-auto shrink-0">{r.exchange}</Badge>
      )}
    </button>
  ))}
</div>
```
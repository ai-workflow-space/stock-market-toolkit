# Stock Toolkit — Design System

The product UI/UX baseline for the `frontend/` app. Follow this when building or
changing any UI. A live, interactive version of everything below renders at the
**`/styleguide`** route — open it while you work.

Stack: React 19 + TypeScript + Vite, Tailwind CSS 3 + **shadcn/ui** (Radix), Recharts.

---

## 1. Principles

1. **Content-driven sizing.** Never hardcode pixel heights on cards/containers. Let
   content determine height. (The old dashboard's `min-height: 1174px` is exactly what
   we don't do.) Charts may set a fixed *chart-body* height inside a flexible card.
2. **One component vocabulary.** Every surface, button, input, badge, dialog, toast,
   tooltip comes from `@/components/ui/*` (shadcn). Don't hand-roll component CSS.
3. **Tokens, not magic numbers.** Colors, spacing, radius, and type come from tokens.
   No hardcoded hex in components; no ad-hoc `rem` spacing.
4. **Responsive by default.** Design mobile-first; reflow with Tailwind breakpoints.
5. **Calm & data-first.** Borders and subtle elevation over heavy shadows. Generous
   whitespace. Semantic finance color used sparingly and meaningfully.

---

## 2. Color tokens

Defined as HSL channels in [`src/index.css`](../frontend/src/index.css) under
`@layer base`. `:root` is the **dark** theme (default); `[data-theme="light"]`
overrides for light. Applied to `<html>` by `ThemeContext`. Consume via Tailwind
utilities (`bg-card`, `text-muted-foreground`, …) — **never** `hsl(var(--…))` inline
and **never** raw Tailwind palette colors like `bg-blue-500`.

| Token | Dark | Light | Use |
| --- | --- | --- | --- |
| `background` / `foreground` | `224 71% 4%` / `210 20% 98%` | `0 0% 100%` / `224 71% 4%` | Page bg / primary text |
| `card` / `card-foreground` | `224 39% 8%` | `0 0% 100%` | Card surface |
| `popover` | `224 39% 8%` | `0 0% 100%` | Popover/dropdown/tooltip surface |
| `primary` | `217 91% 60%` | `217 91% 60%` | Brand accent, primary actions |
| `secondary` | `223 30% 14%` | `220 14% 96%` | Secondary surfaces/buttons |
| `muted` / `muted-foreground` | `223 30% 14%` / `215 20% 65%` | `220 14% 96%` / `220 9% 46%` | Subtle bg / secondary text |
| `accent` | `223 30% 16%` | `220 14% 96%` | Hover surfaces |
| `destructive` | `0 72% 51%` | `0 72% 45%` | Errors, destructive actions |
| `border` / `input` / `ring` | `223 30% 16%` | `220 13% 91%` | Borders, inputs, focus ring |

> **Hover vs. selected — don't reuse `accent` for "selected".** In the dark theme
> `accent`, `border`, and `input` are the *same* value (`223 30% 16%`), so a control
> filled with `bg-accent` is indistinguishable from its own border. `accent` is for
> transient **hover** only. For a persistent **selected/active** state (e.g. a chosen
> toggle), use `primary` (`bg-primary text-primary-foreground`) so the state reads
> clearly in both themes.

**Semantic finance tokens** — for price/percentage direction only:

| Token | Dark | Light | Tailwind |
| --- | --- | --- | --- |
| `up` | `142 71% 45%` | `142 71% 38%` | `text-up` `bg-up` |
| `down` | `0 72% 55%` | `0 72% 48%` | `text-down` `bg-down` |
| `neutral` | `215 20% 65%` | `220 9% 46%` | `text-neutral` |

> **Rule:** a positive delta is `text-up`, a negative delta is `text-down`. Never
> `text-green-500` / `text-red-500`.

`--radius` is `0.625rem`; Tailwind `rounded-lg/md/sm` derive from it.

---

## 3. Typography

- **UI font:** `Inter` (loaded in [`index.html`](../frontend/index.html)).
- **Numeric font:** `JetBrains Mono` via `font-mono`. Use it + `tabular-nums` for all
  prices, percentages, volumes, and table figures so digits align.
- **Scale (Tailwind):** `text-xs 12` · `sm 14` · `base 16` · `lg 18` · `xl 20` ·
  `2xl 24` · `3xl 30`. UI body text is typically `text-sm`; page titles `text-2xl`.
- **Weights:** 400 normal, 500/600 for emphasis. Avoid heavier.
- **Casing:** sentence case for labels, buttons, headings. Reserve uppercase for small
  eyebrow labels (`text-xs uppercase tracking-wide text-muted-foreground`).

```tsx
<span className="font-mono tabular-nums">{`$${fmt(price)}`}</span>
```

Number formatting helpers live in [`src/lib/format.ts`](../frontend/src/lib/format.ts):
`fmt` (2dp), `pct` (signed %), `volFmt` (K/M/B), `compactUsd` (M/B/T). Use them — don't
re-implement `toLocaleString`.

---

## 4. Spacing, layout & elevation

- **Spacing:** Tailwind 4px scale (`gap-2` = 8px, `gap-4` = 16px, `p-4` = 16px). No
  ad-hoc rem. Stack with `flex flex-col gap-*`, **not** `space-y-*`.
- **App shell:** every authed page renders inside
  [`AppShell`](../frontend/src/components/layout/AppShell.tsx): sticky `Navbar`,
  a `max-w-[1440px]` centered `<main>` with responsive padding, and `Footer`.
- **Dashboard grid:** a static `grid grid-cols-12 gap-4`; widgets use responsive spans
  (`col-span-12 lg:col-span-6`) and content-driven heights. An opt-in "Edit layout"
  toggle lazy-loads a draggable grid
  ([`EditableGrid`](../frontend/src/components/dashboard/EditableGrid.tsx)).
- **Elevation:** prefer borders. Cards use border + `bg-card`, no shadow. Only floating
  surfaces (popover/dropdown/dialog/toast) carry a shadow (shadcn handles it).
- **Sizing:** use `size-*` when width == height (`size-4`, not `w-4 h-4`).

---

## 5. Components

Import from the barrel: `import { Button, Card, Badge } from "@/components/ui";`
(or the specific file). Shared app primitives live in `@/components/common`.

### shadcn primitives (`@/components/ui`)
`Button` `Card` `Input` `Label` `Select` `Switch` `Tabs` `Badge` `Dialog`
`DropdownMenu` `Tooltip` `Skeleton` `ToggleGroup` `Command` `Popover` `Separator`
`Toaster` + `toast`.

### App primitives (`@/components/common`)
- **`ChartCard`** — `Card` wrapper with a title/subtitle + optional toolbar and a body.
  Use for any titled panel (charts, tables).
- **`StatCard`** — labelled metric: uppercase label, mono value, optional delta. `tone`
  (`up`/`down`/`neutral`) colors the value/delta.
- **`ToggleBar` / `MultiToggleBar`** — pill toggle groups over `ToggleGroup` for
  single- and multi-select (timeframe, indicators, SMA overlays). The selected
  item uses the `primary` token (`data-[state=on]:bg-primary`), not `accent`, so
  the active option is unmistakable in dark mode.
- **`SymbolSearch`** — Radix `Popover` + `Command` ticker combobox (no viewport overflow).

### Rules (do / don't)
- **Do** compose from existing components. **Don't** write a styled `div` when a
  component exists: callouts→`Alert` pattern, loading→`Skeleton`, toasts→`toast()`,
  dividers→`Separator`, tags→`Badge`.
- **Do** use button variants (`default` `secondary` `outline` `ghost` `destructive`
  `link`) and sizes (`default` `sm` `lg` `icon`). Icons go inside the button; the
  variant sizes them — don't add `size-4`.
- **Don't** override component colors/typography via `className`; `className` is for
  layout only.
- **Don't** set manual `z-index` on overlays; Radix manages stacking.
- Icon set: [`lucide-react`](https://lucide.dev). Charts: Recharts; grid/axis colors
  come from [`useChartTheme`](../frontend/src/hooks/useChartTheme.ts) (theme-aware).

---

## 6. Theming

Light + dark, **dark default**. Toggle via the navbar button (persists to
`localStorage`, applied as `data-theme` on `<html>`). Everything themes automatically
through tokens — if you used tokens, you get both themes for free. Test both.

> **Preflight is off — controls inherit `color`.** Tailwind preflight is disabled
> (`corePlugins.preflight=false` in [`tailwind.config.js`](../frontend/tailwind.config.js)),
> so the base layer in [`index.css`](../frontend/src/index.css) re-adds the parts of it
> that matter:
> - `a` → `color: inherit; text-decoration: inherit`. Without it every `<a>` (nav items,
>   brand link) renders as a raw underlined-blue UA hyperlink. Links **opt in** to their
>   look: the `Button` `link` variant, or `text-primary underline-offset-4 hover:underline`
>   for inline text. Nav items are styled as buttons, not links.
> - `button, input, select, textarea` → `color: inherit; font-family: inherit`. Without
>   it, native controls fall back to the UA `ButtonText` colour (dark, unreadable on the
>   dark theme) for any control that doesn't set an explicit `text-*` class — i.e. the
>   `outline`/`ghost` button variants, unselected `ToggleBar` items, and inactive
>   `Tabs` triggers. **Takeaway:** a control that should read in a non-default colour must
>   set `text-foreground` / `text-muted-foreground` / `text-*-foreground` itself; never
>   rely on the UA default.

---

## 7. Adding a shadcn component

The CLI is configured (`components.json`, and the root `tsconfig.json` carries the `@`
path alias the CLI reads). Run from `frontend/`:

```bash
npx shadcn@latest add <component>
```

Then export it from [`src/components/ui/index.ts`](../frontend/src/components/ui/index.ts).
Review the generated file: replace any `next-themes`/Next-isms (this is a Vite SPA — see
`sonner.tsx`, which uses our `useTheme`), and add a file-level
`/* eslint-disable react-refresh/only-export-components */` if it exports a `*Variants`
constant alongside the component.

---

## 8. Quality gate

Before committing UI work, all must pass from `frontend/`:

```bash
npx tsc -b      # types
npx eslint .    # lint (incl. react-hooks rules)
npm run test    # vitest (pure logic in lib/)
npm run build   # production build
```

Then eyeball `/styleguide` and the changed pages in **both** themes at mobile and
desktop widths — no overflow, no overlap, numerics in mono/tabular.

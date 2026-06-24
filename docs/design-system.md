# Design System

> **Status:** v0.2.0 — Initial standard. All new UI work must follow this document.

## Table of Contents

1. [Principles](#1-principles)
2. [Design Tokens](#2-design-tokens)
3. [Typography](#3-typography)
4. [Spacing & Layout](#4-spacing--layout)
5. [Motion & Animation](#5-motion--animation)
6. [Dark / Light Theme](#6-dark--light-theme)
7. [Component Architecture](#7-component-architecture)
8. [Accessibility](#8-accessibility)
9. [File & Folder Conventions](#9-file--folder-conventions)

---

## 1. Principles

| Principle | Application |
|-----------|-------------|
| **Tokens first** | Every visual value (color, spacing, shadow, radius) is a CSS custom property. No magic numbers. |
| **Semantic naming** | Tokens are named by *purpose*, not value. `--color-primary`, not `--blue-500`. |
| **Composable components** | Small, single-responsibility components. No god-components. |
| **Accessible by default** | WCAG 2.1 AA minimum. Color contrast ≥ 4.5:1 for body text. |
| **Dark-first** | Primary design target is dark mode (finance/trading apps favor dark UIs). Light mode is a full alternative, not an afterthought. |

---

## 2. Design Tokens

All tokens live in `:root` and `[data-theme="light"]` in `frontend/src/index.css`. Never hardcode a hex value in component code — always reference a token.

### 2.1 Color Palette

```
--color-bg          Background (page canvas)
--color-surface     Elevated surface (cards, dropdowns)
--color-card        Card background (same as surface, aliased for semantic clarity)
--color-border      Borders and dividers
--color-text        Primary text
--color-text-dim    Secondary / muted text
--color-primary     Interactive accent (buttons, links, focus rings)
--color-accent      Secondary accent (indicator tags, chart overlays)
--color-success     Positive change, buy signals, confirmations
--color-danger      Negative change, sell signals, errors, destructive actions
--color-warn        Caution, neutral signals, warnings
```

#### Dark theme values (default)
```css
--color-bg:        #0a0e17
--color-surface:   #111827
--color-card:      #1a2235
--color-border:    #1e293b
--color-text:      #f1f5f9
--color-text-dim:  #64748b
--color-primary:   #3b82f6
--color-accent:    #6366f1
--color-success:   #22c55e
--color-danger:    #ef4444
--color-warn:      #f59e0b
```

#### Light theme values
```css
--color-bg:        #f8fafc
--color-surface:   #ffffff
--color-card:      #ffffff
--color-border:    #e2e8f0
--color-text:      #0f172a
--color-text-dim:  #64748b
--color-primary:   #3b82f6
--color-accent:    #6366f1
--color-success:   #16a34a
--color-danger:    #dc2626
--color-warn:      #d97706
```

### 2.2 Border Radius

```
--radius-sm:   4px   /* Badges, small tags */
--radius-md:   8px   /* Inputs, buttons, small cards */
--radius-lg:   12px  /* Cards, panels */
--radius-xl:   16px  /* Modals, auth cards */
--radius-full: 9999px /* Pills, avatars */
```

### 2.3 Shadows / Elevation

```
--shadow-sm:   0 1px 2px rgba(0,0,0,0.3)
--shadow-md:   0 4px 12px rgba(0,0,0,0.4)
--shadow-lg:   0 8px 24px rgba(0,0,0,0.5)
--shadow-xl:   0 25px 50px rgba(0,0,0,0.5)  /* Auth cards */
```

### 2.4 Focus Ring

```css
/* Every interactive element must have a visible focus ring */
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

---

## 3. Typography

### Font Family
**Inter** (Google Fonts) — loaded via `index.css`.

```
font-family: 'Inter', system-ui, -apple-system, sans-serif;
```

### Type Scale

| Token | Size | Weight | Use |
|-------|------|--------|-----|
| `--text-xs` | 0.72rem / 11.5px | 400 | Labels, axis ticks, table meta |
| `--text-sm` | 0.8rem / 12.8px | 400–500 | Badges, subtitles, nav links |
| `--text-base` | 0.9rem / 14.4px | 400 | Body text, form inputs |
| `--text-md` | 1rem / 16px | 500 | Subheadings, card titles |
| `--text-lg` | 1.25rem / 20px | 600 | Page headings |
| `--text-xl` | 1.5rem / 24px | 700 | Display (auth titles) |
| `--text-2xl` | 1.875rem / 30px | 700 | Hero headings |

### Line Heights
- Body: `1.5`
- Headings: `1.2`
- Tight (labels): `1.0`

### Letter Spacing
- Uppercase labels: `0.05em` (e.g. `text-transform: uppercase; letter-spacing: 0.05em`)
- Tighter for large display: `−0.02em`

### Usage Rules
- Always use `--text-*` tokens or Tailwind `text-*` classes mapped to them — never hardcode `font-size: 14px`
- Headings use `--text-lg`+ and are bold (600–700)
- Body and secondary text use `--text-base` / `--text-sm`

---

## 4. Spacing & Layout

### Base Unit
**4px** — all spacing is a multiple of 4.

```
--space-1:  4px
--space-2:  8px
--space-3:  12px
--space-4:  16px
--space-6:  24px
--space-8:  32px
--space-12: 48px
--space-16: 64px
```

### Page Layout
- Max content width: `1280px`
- Page padding: `1.5rem` horizontal (mobile: `1rem`)
- Section gap: `2rem` vertical between major sections
- Card padding: `1.25rem` internal

### Responsive Breakpoints

| Breakpoint | Min-width | Use |
|------------|-----------|-----|
| `sm` | 640px | Large phones |
| `md` | 768px | Tablets |
| `lg` | 1024px | Laptops |
| `xl` | 1280px | Desktops |

---

## 5. Motion & Animation

### Principles
- **Purposeful** — animation communicates state change, not decoration
- **Fast by default** — 150ms for micro-interactions, 250ms for layout transitions
- **Reduced motion respected** — always honor `prefers-reduced-motion`

### Durations

```
--duration-instant:  0ms     /* State toggle, checkbox */
--duration-fast:     100ms   /* Hover states, color transitions */
--duration-normal:   150ms   /* Buttons, toggles, dropdowns */
--duration-slow:     250ms   /* Modals, drawers, page enter */
--duration-slower:   400ms   /* Chart entrance, stagger animations */
```

### Easing

```
--ease-out:     cubic-bezier(0, 0, 0.2, 1)   /* Entering elements */
--ease-in:      cubic-bezier(0.4, 0, 1, 1)   /* Leaving elements */
--ease-in-out:  cubic-bezier(0.4, 0, 0.2, 1) /* State changes */
--ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1) /* Bouncy (badges, toggles) */
```

### Usage

```css
/* Standard hover transition */
transition: background-color var(--duration-fast) var(--ease-out);

/* Page/modal enter */
animation: fadeSlideIn var(--duration-slow) var(--ease-out);

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: var(--duration-fast) !important;
  }
}
```

### Animation Recipes

| Pattern | Use | Values |
|---------|-----|--------|
| `fadeIn` | Skeletons, loading states | opacity 0→1, `--duration-slow` |
| `fadeSlideIn` | Dropdowns, modals | opacity 0→1 + translateY(-8px→0), `--duration-slow` |
| `scaleIn` | Badges, tooltips | scale(0.95)→scale(1), `--duration-normal`, `--ease-spring` |
| `spin` | Spinner | rotate(0→360), `--duration-slower`, linear |

---

## 6. Dark / Light Theme

### Implementation
The theme is toggled via a `data-theme` attribute on `<html>`:

```html
<html data-theme="dark">  <!-- default, no attribute needed -->
<html data-theme="light">
```

The existing `ThemeContext` (`frontend/src/context/ThemeContext.tsx`) toggles this attribute. All color values are scoped under `:root` (dark) and `[data-theme="light"]` (light).

### Rules
- **Never** hardcode a hex color in component JSX or CSS — always use `var(--color-*)`
- **Never** write `[data-theme="dark"]` specific rules in component files — all theme switching happens via CSS variable cascade
- Test every component in both themes before calling it done

---

## 7. Component Architecture

### Component Layers

```
shadcn/ui primitives       → base layer (Button, Input, Card, Dialog, etc.)
                           → NEVER modify shadcn source; re-run npx shadcn@latest add
                           → source lives in frontend/src/components/ui/

Domain components          → composed of shadcn primitives + design tokens
                           → lives in frontend/src/components/domain/
                           → examples: StockChartCard, SearchBar, AlertBadge

Page components            → route-level assemblies
                           → lives in frontend/src/pages/
                           → should be thin; delegate to domain components
```

### Component Rules

1. **One component per file.** File name matches component name: `SearchBar.tsx` not `Search.tsx`.
2. **Props are typed.** No `any`. Use TypeScript interfaces.
3. **No inline styles** in JSX — use Tailwind classes or CSS module class names. Exception: dynamic values computed from props (e.g. chart colors).
4. **Composition over configuration.** Prefer `<Card><CardHeader>...</CardHeader></Card>` over a `variant="header-only"` prop.
5. **Loading states.** Every async component shows a skeleton or spinner while loading — never a blank space.
6. **Error states.** Every data-fetching component shows a user-friendly error message on failure.

### Component Quality Checklist

Before marking a component complete:

- [ ] Renders correctly in dark AND light theme
- [ ] All interactive elements keyboard-navigable (Tab, Enter, Space, Escape)
- [ ] Focus ring visible on all interactive elements
- [ ] Color contrast ≥ 4.5:1 for text, ≥ 3:1 for UI components
- [ ] Loading skeleton present for async content
- [ ] Error boundary / error state handled
- [ ] No hardcoded colors or spacing values
- [ ] Props interface documented with JSDoc or TypeScript

---

## 8. Accessibility

### Requirements (WCAG 2.1 AA)

| Rule | Implementation |
|------|----------------|
| Color contrast | ≥ 4.5:1 for normal text, ≥ 3:1 for large text / UI components |
| Focus indicators | `:focus-visible` ring on every interactive element, 2px solid `--color-primary` |
| Keyboard navigation | All interactive elements reachable and operable via keyboard |
| ARIA labels | Icon-only buttons: `aria-label="..."`. Charts: `role="img"` + descriptive label |
| Screen readers | Semantic HTML: `<button>`, `<nav>`, `<main>`, `<header>` over `<div>` |
| Motion | Honor `prefers-reduced-motion: reduce` |
| Error messages | Associated to inputs via `aria-describedby` or `aria-label` |

### Patterns

```tsx
// Icon button with label
<button aria-label="Close dialog" className="...">
  <XIcon />
</button>

// Form field with error
<div>
  <input aria-describedby="email-error" ... />
  <span id="email-error" role="alert">Invalid email</span>
</div>

// Chart with accessibility
<div role="img" aria-label="AAPL stock price chart for the last month">
  <ResponsiveContainer ...>
```

---

## 9. File & Folder Conventions

### Frontend Structure

```
frontend/src/
├── components/
│   ├── ui/                 # shadcn/ui base components (Button, Card, Input…)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── ...
│   └── domain/             # Business-specific composed components
│       ├── SearchBar/
│       │   ├── SearchBar.tsx
│       │   └── SearchBar.css
│       ├── StockChartCard/
│       └── AlertBadge/
├── pages/
│   ├── DashboardPage.tsx   # Route-level, thin assembly
│   ├── AlertsPage.tsx
│   ├── SettingsPage.tsx
│   ├── LoginPage.tsx
│   └── RegisterPage.tsx
├── context/
│   ├── AuthContext.tsx
│   └── ThemeContext.tsx
├── hooks/
│   ├── useAuth.ts
│   └── useTheme.ts
├── api/
│   └── stockApi.ts
├── types/
│   └── index.ts
├── styles/
│   └── tokens.css          # Design token custom properties (imported by index.css)
├── index.css               # Global styles, font import, token definitions
└── App.tsx                 # Router only — no page/component code
```

### Naming Conventions

| Item | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `StockChartCard.tsx` |
| Hooks | camelCase, `use` prefix | `useAuth.ts` |
| Context | PascalCase | `AuthContext.tsx` |
| API modules | camelCase | `stockApi.ts` |
| CSS classes | kebab-case | `.search-dropdown` |
| TypeScript interfaces | PascalCase, `I` prefix optional | `StockData`, `ISearchResult` |
| Constants | SCREAMING_SNAKE_CASE | `TIMEFRAMES`, `MAX_VOLUME` |
| Files | kebab-case | `login-page.tsx` (pages only) |

### CSS Conventions

- **BEM-lite** for custom CSS: `.block`, `.block__element`, `.block--modifier`
- No deep nesting (>2 levels)
- Group CSS by section (matches HTML structure): `/* ─── Search ─── */`)
- Use CSS custom properties for all values; no raw hex/spacing numbers

---

## Appendix A: Color Hex Reference

### Dark (Default)

| Token | Hex |
|-------|-----|
| `--color-bg` | `#0a0e17` |
| `--color-surface` | `#111827` |
| `--color-card` | `#1a2235` |
| `--color-border` | `#1e293b` |
| `--color-text` | `#f1f5f9` |
| `--color-text-dim` | `#64748b` |
| `--color-primary` | `#3b82f6` |
| `--color-accent` | `#6366f1` |
| `--color-success` | `#22c55e` |
| `--color-danger` | `#ef4444` |
| `--color-warn` | `#f59e0b` |

### Light

| Token | Hex |
|-------|-----|
| `--color-bg` | `#f8fafc` |
| `--color-surface` | `#ffffff` |
| `--color-card` | `#ffffff` |
| `--color-border` | `#e2e8f0` |
| `--color-text` | `#0f172a` |
| `--color-text-dim` | `#64748b` |
| `--color-primary` | `#3b82f6` |
| `--color-accent` | `#6366f1` |
| `--color-success` | `#16a34a` |
| `--color-danger` | `#dc2626` |
| `--color-warn` | `#d97706` |
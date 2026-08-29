# Design System Specification

> **Version:** 1.0.0
> **Package:** `@codesweep-ai/ui`
> **Status:** Canonical. All consuming projects must converge on these values.

---

## Table of Contents

1. [Overview & Philosophy](#1-overview--philosophy)
2. [Architecture](#2-architecture)
3. [Stack](#3-stack)
4. [Design Tokens](#4-design-tokens)
5. [Branding](#5-branding)
6. [Component Catalog](#6-component-catalog)
7. [Conventions](#7-conventions)
8. [Extension Pattern](#8-extension-pattern)
9. [Agent Maintenance](#9-agent-maintenance)

---

## 1. Overview & Philosophy

### What This Is

This document is the single source of truth for the `@codesweep-ai/ui` shared component library. It defines every design token, component spec, convention, and architectural pattern that consuming projects must follow.

### Spec-Driven Approach

The specification drives the implementation, not the other way around:

1. **Spec first:** all changes start as edits to this document.
2. **Agent builds:** an LLM agent reads this spec and maintains the `@codesweep-ai/ui` package.
3. **Projects consume:** feature modules import from the shared package and extend via documented patterns.
4. **Agent validates:** the same agent audits consuming projects for drift from the spec.

### Package Model

```
@codesweep-ai/ui
├── styles/          # core.css, per-component sheets, markdown-content.css, syntax.css, print.css
├── components/      # React components (Panel, Card, SplitPane, etc.)
├── hooks/           # useTheme, usePersistedState, useResizable
├── utils/           # cn(), slug(), extractText()
└── types/           # Shared TypeScript types
```

Consuming projects install `@codesweep-ai/ui` and import what they need:

```tsx
import { Panel, Card, ThemeProvider, useTheme } from "@codesweep-ai/ui";
```

---

## 2. Architecture

### Shell + Feature Module Pattern

Every project follows a **shell + feature module** architecture. The shell provides the chrome (header, navigation, footer, theme) and each feature module plugs into it.

```
┌──────────────────────────────────────────────┐
│  Header  [logo] [nav links…] [ThemeToggle]   │
├──────────────────────────────────────────────┤
│                                              │
│              Feature Module                  │
│  (owns its own routes, panels, state)        │
│                                              │
├──────────────────────────────────────────────┤
│  Footer                                      │
└──────────────────────────────────────────────┘
```

### Standalone vs. Product Mode

Each feature module can run in two modes:

| Mode         | Shell provided by         | Navigation                |
|--------------|---------------------------|---------------------------|
| **Standalone** | The feature's own `AppShell` | Single-feature nav only   |
| **Product**    | A shared product shell      | Cross-feature nav links   |

In product mode, the shell is provided once at the top level and each feature registers its routes and nav entries.

### Feature Registration Contract

```typescript
interface FeatureModule {
  /** Unique identifier, e.g. "app-discovery" */
  id: string;
  /** Display name for nav */
  label: string;
  /** Icon component from lucide-react */
  icon: React.ComponentType<{ size?: number }>;
  /** Routes this feature provides */
  routes: RouteObject[];
  /** Optional nav sub-items */
  navItems?: { label: string; path: string }[];
}
```

### Layout Modes

Features may use different layout modes inside the shell:

| Layout  | Description                                 |
|---------|---------------------------------------------|
| `page`  | Centered max-width container with padding   |
| `full`  | Edge-to-edge, flex fill (panels + content)  |
| `split` | Two or three resizable panes                |

The Header always fills the full viewport width. It is global chrome and does not change with layout mode. Each page's content area is responsible for applying its own width constraints (for example `max-width` + `margin: 0 auto` for `page` layout, or no constraint for `full`/`split`).

### Feature Toolbar

Features that need their own controls must place them in a **feature toolbar**: a horizontal bar inside the `<main>` content area, not in the AppShell Header. Context switchers, history navigation, view toggles and filters all belong there.

The Header is **global chrome**: logo, cross-feature nav items, and ThemeToggle. It never changes based on which feature is active or what state the feature is in. Feature-level controls live below it.

```
┌─ Header (global chrome, always-dark) ──────────────────┐
│  [logo]              [Feature A] [Feature B]  [Theme]  │
├─ <main> ───────────────────────────────────────────────┤
│  ┌─ Feature toolbar (flex: 0 0 auto, border-bottom) ─┐ │
│  │  [◀] [▶]  [Context ▼]  [Search...]  [Toggle]     │ │
│  ├─ Content area (flex: 1, min-height: 0) ───────────┤ │
│  │  SplitPane / Card / Table / etc.                  │ │
│  └───────────────────────────────────────────────────┘ │
├─ Footer ───────────────────────────────────────────────┤
└────────────────────────────────────────────────────────┘
```

#### What goes where

| Location | Contains | Examples |
|----------|----------|----------|
| **Header** | App identity, cross-feature navigation, theme | Logo, "Spec Viewer" / "App Discovery" nav links, `ThemeToggle` |
| **Feature toolbar** | Feature-scoped controls that affect the content below | Collection dropdown, back/forward buttons, file tree toggle, view mode tabs, search bar |
| **Content area** | The feature's main UI | `SplitPane`, `Panel` + `Tree`, `MarkdownViewer`, `Table`, `Card` |

#### Styling

The feature toolbar uses the page background, not the always-dark header palette:

```tsx
<div className="feature-toolbar">
/* feature-toolbar: flex: 0 0 auto; display: flex; align-items: center; gap: var(--space-2);
   padding: var(--space-2) var(--space-4); border-bottom: 1px solid var(--border); background: var(--bg); */
  {/* feature-level controls here */}
</div>
```

| Property | Value | Reason |
|----------|-------|--------|
| `flex: 0 0 auto` | — | Toolbar never shrinks; content area takes remaining height |
| `border-bottom: 1px solid var(--border)` | — | Separates toolbar from content |
| `background: var(--bg)` | — | Matches page background (theme-aware), not the always-dark header |
| `padding-inline: var(--space-4)` | 16px | Matches Header horizontal padding |
| `padding-block: var(--space-2)` | 8px | Compact vertical padding |
| `gap: var(--space-2)` | 8px | Between controls |

#### Layout integration

The feature's root element must be a flex column so the toolbar and content stack correctly:

```tsx
// Inside AppShell's <main> (the shell makes it the scroller)
<div className="feature">            /* display: flex; flex-direction: column; height: 100%; min-height: 0 */
  <div className="feature-toolbar">  {/* toolbar: flex: 0 0 auto */}</div>
  <div className="feature-body">     {/* content: flex: 1; min-height: 0; overflow: hidden */}</div>
</div>
```

#### When to use

- The feature has context-switching controls (collection selector, project picker)
- The feature has navigation controls (back/forward, breadcrumb)
- The feature has view-mode toggles or filters that apply to the whole content area
- The feature has sub-tabs (tab bar below the Header)

#### When NOT to use

- The feature is a single page with no feature-level controls (just render content directly in `<main>`)
- The controls are specific to one panel (put them in that panel's `actions` slot via the `Panel` component instead)

### Authentication Contract

Features that communicate with authenticated backend services use the **AuthGate** pattern. The `AuthGate` component wraps the entire app (above `AppShell`) and gates rendering behind an API key prompt.

#### Roles

| Layer | Responsibility |
|-------|---------------|
| `AuthGate` | Prompts for key, validates via `onValidate`, stores in localStorage, provides context |
| `useAuth()` | Hook for UI components — exposes `changeKey()`, `clearKey()`, `handleAuthError()` |
| `getApiKey()` | Non-React helper for API service files — reads key from localStorage |
| Feature API service | Reads key via `getApiKey()`, adds `Authorization: Bearer` header, calls `handleAuthError()` on 401/403 |

#### Rules

1. **AuthGate wraps AppShell:** it is the outermost component in both standalone and product modes.
2. **One AuthGate per app:** never nest multiple gates.
3. **Always provide `onValidate`** in production. Validate the key against a backend health-check endpoint before storing.
4. **Feature API services use `getApiKey()`**, not `useAuth().apiKey`. API service files are plain TypeScript, not React components.
5. **Feature hooks pass `handleAuthError`** to API services so 401/403 responses reset the auth state.
6. **Never hardcode API keys** in source code or environment-variable defines baked into the bundle.

Authentication remains consumer-owned; the public package does not define an authentication pattern.

---

## 3. Stack

All new code and the shared package use this stack:

| Layer        | Technology          | Notes                          |
|--------------|---------------------|--------------------------------|
| Framework    | React 18+           | Functional components + hooks  |
| Language     | TypeScript 5+       | Strict mode                    |
| Build        | Vite 5+             | Library mode for package build |
| Styling      | Plain CSS           | `styles/core.css` plus per-component sheets; values use tokens |
| Icons        | lucide-react         | Tree-shakeable, consistent     |
| Charts       | D3.js               | For data visualizations        |
| Diagrams     | Mermaid              | For architecture diagrams      |
| Class Utils  | `cn()` (in-house)    | Conditional class names only; no class merging |
| Drag & Drop  | @dnd-kit             | For sortable trees, lists      |
| Markdown     | react-markdown       | GFM + heading slugs by default; highlighting, math, and diagrams are opt-in |

### CSS Strategy

Tokens are defined in `styles/tokens.css`; `styles/core.css` loads them with the reset and base layer. Each component has a sheet under `styles/components/`, while `styles/components.css` is the compatibility aggregate. Consumers load core plus only the sheets they render. Domain-specific styles live beside the feature that owns them (§7.8).

```css
/* core.css — imported first */
:root { --space-4: 1rem; --radius-md: 0.375rem; }

/* components/card.css — the component's own rule, tokens only */
.cs-component-card-1 { padding: var(--space-4); border-radius: var(--radius-md); }
```

### Utility: `cn()`

A dependency-free helper that joins class names conditionally (strings, arrays, and `{ className: boolean }` maps). It does **not** merge or deduplicate classes: with plain CSS there is nothing to merge.

```typescript
import { cn } from "@codesweep-ai/ui";
cn("cs-component-card-1", isMuted && "cs-component-card-2", { "is-open": open });
```

---

## 4. Design Tokens

### 4.1 Spacing

All four projects use an identical spacing scale.

| Token       | Value      | px   |
|-------------|------------|------|
| `--space-0` | `0`        | 0    |
| `--space-px` | `1px`      | 1    |
| `--space-0-5` | `0.125rem` | 2  |
| `--space-1` | `0.25rem`  | 4    |
| `--space-2` | `0.5rem`   | 8    |
| `--space-3` | `0.75rem`  | 12   |
| `--space-4` | `1rem`     | 16   |
| `--space-5` | `1.5rem`   | 24   |
| `--space-6` | `2rem`     | 32   |


### 4.2 Border Radius

All four projects use an identical radius scale.

| Token         | Value | Notes             |
|---------------|-------|-------------------|
| `--radius-xs` | `2px` | Badges, tiny chips|
| `--radius-sm` | `4px` | Buttons, inputs   |
| `--radius-md` | `6px` | Cards, panels     |
| `--radius-lg` | `8px` | Dialogs, overlays |
| `--radius-xl` | `12px`| Large containers  |

A 3/4/6/8 scale maps onto this one without a new token.

### 4.3 Typography

#### Font Sizes

| Token            | Value       | px   |
|------------------|-------------|------|
| `--font-size-xs` | `0.75rem`   | 12   |
| `--font-size-sm` | `0.875rem`  | 14   |
| `--font-size-md` | `1rem`      | 16   |
| `--font-size-lg` | `1.25rem`   | 20   |
| `--font-size-xl` | `1.5rem`    | 24   |


#### Font Weights

| Token                    | Value |
|--------------------------|-------|
| `--font-weight-regular`  | `400` |
| `--font-weight-medium`   | `500` |
| `--font-weight-semibold` | `600` |
| `--font-weight-bold`     | `700` |


#### Line Heights

| Token                    | Value |
|--------------------------|-------|
| `--line-height-tight`    | `1.2` |
| `--line-height-normal`   | `1.5` |
| `--line-height-relaxed`  | `1.7` |


#### Font Stacks

```css
--font-family-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
  Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji",
  "Segoe UI Emoji";

--font-family-mono: ui-monospace, "SF Mono", "SFMono-Regular", Menlo,
  Consolas, "Liberation Mono", "Cascadia Code", monospace;
```


### 4.4 Colors: Application Chrome

These colors are fixed (not theme-dependent).

| Token                     | Value      | Notes                            |
|---------------------------|------------|----------------------------------|
| `--color-accent`          | `#1ee0ca` dark / `#0f766e` light | The one accent in the chrome: text title, selected nav tint, focus rings |
| `--color-header-bg`       | `#171717`  | Always-dark header/footer bar    |
| `--color-header-text`     | `#fafafa`  | Header text; also the selected nav link's text |
| `--color-header-text-muted`  | `#b8b8b8` | Idle header nav links            |
| `--color-nav-hover`       | `#404040`  | Nav item hover background        |
| `--color-text-inverse`    | `#ffffff`  | Text on dark backgrounds (hovered nav link) |

The selected nav link has no token of its own: its background is `color-mix(in srgb, var(--color-accent) 22%, transparent)`.


### 4.5 Colors: Theme-Aware

These values change between dark and light themes. The theme is applied via `data-theme` attribute on `<html>`.

#### Surface & Text

| Token      | Dark            | Light           | Notes               |
|------------|-----------------|-----------------|----------------------|
| `--bg`     | `#0b0f14`       | `#f3f4f6`       | Page background (light = soft gray so white cards lift) |
| `--fg`     | `#e6edf3`       | `#1f2937`       | Primary text         |
| `--muted`  | `#9aa4af`       | `#4b5563`       | Secondary text       |
| `--color-structural` | `#6b7580` | `#7b8694` | A second structural step, one move further from the foreground than `--muted`. For recurring plumbing that must stay separable from it without competing with the categorical hues. |
| `--card`   | `#0f1620`       | `#ffffff`       | Card / panel bg      |
| `--border` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.1)` | Default border |


#### Brand Accent (Theme-Aware Variants)

| Token                            | Dark                          | Light                         |
|----------------------------------|-------------------------------|-------------------------------|
| `--color-accent`           | `#1ee0ca`                     | `#0f766e`                     |
| `--color-accent-hover`     | `rgba(30, 224, 202, 0.1)`    | `rgba(13, 148, 136, 0.12)`   |
| `--color-accent-bg`        | `rgba(30, 224, 202, 0.05)`   | `rgba(13, 148, 136, 0.08)`   |
| `--color-accent-bg-hover`  | `rgba(30, 224, 202, 0.1)`    | `rgba(13, 148, 136, 0.12)`   |
| `--color-accent-bg-strong` | `rgba(30, 224, 202, 0.15)`   | `rgba(13, 148, 136, 0.18)`   |


#### Links

| Token               | Dark       | Light      |
|----------------------|------------|------------|
| `--color-link`       | `#3b82f6`  | `#2563eb`  |
| `--color-link-hover` | `#2563eb`  | `#1d4ed8`  |


#### Status Colors

| Token                 | Dark                            | Light                           |
|-----------------------|---------------------------------|---------------------------------|
| `--color-error`       | `#f87171`                       | `#dc2626`                       |
| `--color-error-text`  | `#f87171`                       | `#b91c1c`                       |
| `--color-error-bg`    | `rgba(248, 113, 113, 0.1)`     | `rgba(220, 38, 38, 0.1)`       |
| `--color-info`        | `#60a5fa`                       | `#0369a1`                       |
| `--color-success`     | `#34d399`                       | `#047857`                       |
| `--color-success-bg`  | `rgba(52, 211, 153, 0.2)`      | `rgba(16, 185, 129, 0.2)`      |
| `--color-warning`     | `#f59e0b`                       | `#b45309`                       |
| `--color-warning-bg`  | `rgba(245, 158, 11, 0.1)`      | `rgba(210, 153, 34, 0.15)`     |
| `--color-neutral`     | `#9ca3af`                       | `#6b7280`                       |
| `--color-neutral-bg`  | `rgba(156, 163, 175, 0.2)`     | `rgba(107, 114, 128, 0.2)`     |
| `--color-highlight`   | `rgba(250, 204, 21, 0.35)`     | `rgba(250, 204, 21, 0.4)`      |

These values were standardised from an earlier palette.

#### Buttons

| Token                            | Dark                           | Light                          |
|----------------------------------|--------------------------------|--------------------------------|
| `--color-btn-primary`            | `#17c9b5`                      | `#0f766e`                      |
| `--color-btn-primary-text`       | `#000000`                      | `#ffffff`                       |
| `--color-btn-primary-hover`      | `var(--color-link-hover)`      | `var(--color-link-hover)`      |
| `--color-btn-success-text`       | `#000000`                      | `#ffffff`                      |
| `--color-btn-warning-text`       | `#000000`                      | `#ffffff`                      |
| `--color-btn-disabled-bg`        | `rgba(59, 130, 246, 0.5)`     | `rgba(37, 99, 235, 0.5)`      |
| `--color-btn-disabled-text`      | `rgba(255, 255, 255, 0.7)`    | `rgba(255, 255, 255, 0.7)`    |

The `*-text` tokens follow the same pattern: dark text on bright backgrounds (dark mode) and light text on muted backgrounds (light mode), ensuring WCAG AA contrast.

Success and warning text tokens follow the same contrast pattern as primary.

#### Subtle Backgrounds

| Token                       | Dark                           | Light                          |
|-----------------------------|--------------------------------|--------------------------------|
| `--color-bg-subtle`         | `rgba(255, 255, 255, 0.05)`   | `rgba(0, 0, 0, 0.03)`         |
| `--color-bg-muted`          | `rgba(128, 128, 128, 0.05)`   | `rgba(128, 128, 128, 0.08)`   |
| `--color-bg-muted-hover`    | `rgba(128, 128, 128, 0.1)`    | `rgba(128, 128, 128, 0.12)`   |
| `--color-row-hover`         | `rgba(255, 255, 255, 0.06)`   | `rgba(0, 0, 0, 0.04)`         |


### 4.6 Shadows

Shadows are **theme-aware**. Dark backgrounds need higher-opacity black shadows to remain visible, while light backgrounds use subtle blue-gray shadows.

| Token         | Dark                                     | Light                                   | Notes             |
|---------------|------------------------------------------|-----------------------------------------|-------------------|
| `--shadow-sm` | `0 1px 3px rgba(0, 0, 0, 0.4)`          | `0 1px 2px rgba(15, 23, 42, 0.08)`     | Cards, dropdowns  |
| `--shadow-md` | `0 2px 8px rgba(0, 0, 0, 0.5)`          | `0 2px 8px rgba(15, 23, 42, 0.12)`     | Elevated panels   |
| `--shadow-lg` | `0 8px 24px rgba(0, 0, 0, 0.6)`         | `0 8px 24px rgba(15, 23, 42, 0.18)`    | Modals, popovers  |
| `--shadow-up` | `0 -3px 6px rgba(0, 0, 0, 0.5)`         | `0 -3px 6px rgba(15, 23, 42, 0.1)`     | Footer            |

The header and footer always use `--shadow-up`, since they sit on the always-dark chrome.

### 4.7 Scrollbar

```css
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: var(--radius-sm);
}
::-webkit-scrollbar-thumb:hover {
  background: var(--muted);
}
```


### 4.8 Color Scheme

Native form controls (`<select>`, `<input>`, `<textarea>`) and scrollbars use the browser's color scheme. This must be set so native elements match the active theme:

```css
:root[data-theme="dark"] {
  color-scheme: dark;
}

:root[data-theme="light"] {
  color-scheme: light;
}
```

Without this, native `<select>` dropdowns, date pickers, and other browser-rendered controls will use the OS default (usually light), causing unreadable text in dark mode.

### 4.9 Transitions

Interactive elements share one standard transition:

```css
--transition-fast: 0.15s ease;
--transition-normal: 0.2s ease;
```

Apply to `background-color`, `color`, `border-color`, `opacity`.

Every component uses `--transition-normal` unless it says otherwise.

### 4.10 Z-Index

Stacking context tokens prevent z-index collisions across components.

| Token        | Value | Usage                                    |
|--------------|-------|------------------------------------------|
| `--z-sticky` | `10`  | Sticky section headers (SectionedTree, CheckboxGroup) |
| `--z-header` | `100` | AppShell header                          |
| `--z-modal`  | `200` | Modal overlay                            |

### 4.11 Overlay

| Token              | Value                             | Notes                           |
|--------------------|-----------------------------------|---------------------------------|
| `--color-overlay`  | `rgba(0, 0, 0, 0.5)`             | Modal backdrop                  |
| `--shadow-header`  | `0 2px 10px rgba(0, 0, 0, 0.3)`  | Always-dark header drop shadow  |

These are fixed values (not theme-dependent) since they apply to always-dark surfaces (modal backdrop, header).

### 4.11 Icon Sizes

These tokens size every lucide-react icon. Component sheets set both `width` and `height` from these tokens instead of using the numeric `size` prop.

| Token            | Value  | Usage                                    |
|------------------|--------|------------------------------------------|
| `--icon-size-xs` | `12px` | Chevrons in section headers, fold/unfold |
| `--icon-size-sm` | `14px` | Tree node icons, sort arrows, nav arrows |
| `--icon-size-md` | `16px` | Close buttons, copy/search icons         |
| `--icon-size-lg` | `18px` | Theme toggle, modal close                |

### 4.12 Categorical Palette

10 theme-aware hues for charts, legends, and grouped data, each with 4 shades (light, base, mid, dark) for sub-category breakdowns. Hues are ordered for maximum visual contrast between adjacent indices.

#### Base colors

Muted set (color review): lower-chroma than the vivid palette ramp they were derived from, for a more composed look in charts/legends. Dark stays lighter than light for contrast on its background.

| Token            | Dark (on dark bg) | Light (on light bg) | Hue     |
|------------------|-------------------|---------------------|---------|
| `--color-cat-1`  | `#6f93c9`         | `#3f6491`           | Blue    |
| `--color-cat-2`  | `#4fb3a6`         | `#2f8a80`           | Teal    |
| `--color-cat-3`  | `#d2a44e`         | `#a9772f`           | Amber   |
| `--color-cat-4`  | `#d77f8b`         | `#b15562`           | Rose    |
| `--color-cat-5`  | `#9e90cc`         | `#6c5da0`           | Violet  |
| `--color-cat-6`  | `#d89259`         | `#b06a3c`           | Orange  |
| `--color-cat-7`  | `#5fae8a`         | `#3f7d5e`           | Emerald |
| `--color-cat-8`  | `#c489c9`         | `#95548c`           | Fuchsia |
| `--color-cat-9`  | `#6ab0d4`         | `#2f78a0`           | Sky     |
| `--color-cat-10` | `#9cb866`         | `#6f8a40`           | Lime    |

#### Sub-shades

> Note: the sub-shades below still use the original vivid ramp; they were not re-muted alongside the base colors (nothing consumes them yet). When a sub-categorized chart needs them, re-tune to match the muted bases.

Each hue has three additional shades via `-light`, `-mid`, `-dark` suffixes. Dark-theme shades map to the source ramp's 300/500/600 levels; light-theme shades shift one step darker for contrast on white.

| Suffix   | Dark theme (source ramp) | Light theme (source ramp) | Purpose           |
|----------|-----------------------|------------------------|-----------------------|
| `-light` | 300 (brightest)       | base − 1 step          | Lightest sub-group    |
| *(base)* | 400 (existing)        | 500–600 (existing)     | Default / primary     |
| `-mid`   | 500                   | base + 1 step          | Deeper sub-group      |
| `-dark`  | 600                   | base + 2 steps         | Darkest sub-group     |

Blue (cat-1) declares these tokens:

| Token                  | Dark      | Light     |
|------------------------|-----------|-----------|
| `--color-cat-1-light`  | `#93c5fd` | `#60a5fa` |
| `--color-cat-1`        | `#60a5fa` | `#3b82f6` |
| `--color-cat-1-mid`    | `#3b82f6` | `#2563eb` |
| `--color-cat-1-dark`   | `#2563eb` | `#1d4ed8` |

**Usage guidelines:**
- Use `var(--color-cat-N)` for the primary category color in chart fills, legend dots, and group labels.
- Use `-light`, `-mid`, `-dark` suffixes for sub-category breakdowns (for example stacked bars, grouped segments, treemap depth).
- Assign by index order: category 1 gets `--color-cat-1`, category 2 gets `--color-cat-2`, etc.
- Do not use these for semantic meaning (error, success, warning). Use the semantic color tokens for that.
- Dark-theme base values sit at the source ramp's 400 level (lighter/pastel). Light-theme base values sit at 500–600 (darker/saturated) for contrast on white.
- Sub-shades within a hue are designed to be visually distinct from each other while remaining clearly related.
- When more than 10 categories are needed, consider grouping or using opacity variants.

### 4.13 Letter Spacing

| Token                    | Value   | Usage                                         |
|--------------------------|---------|-----------------------------------------------|
| `--letter-spacing-wide`  | `0.5px` | Uppercase labels (Panel, StatusBadge, sections)|

### 4.14 Tree Indentation

| Token                | Value    | Notes                                              |
|----------------------|----------|----------------------------------------------------|
| `--tree-indent-size` | `1rem`   | Per-level indent increment (16px)                  |
| `--tree-indent-base` | `0.5rem` | Base left/right padding for root-level nodes (8px) |

Tree rows compute indentation as `calc(depth * var(--tree-indent-size) + var(--tree-indent-base))`.

### 4.15 Code Typography

| Token                | Value  | Usage                              |
|----------------------|--------|------------------------------------|
| `--font-size-code`   | `13px` | Code block text size               |
| `--line-height-code` | `1.6`  | Code block line height             |

### 4.16 Card Content Height

| Token                   | Value   | Usage                                          |
|-------------------------|---------|-------------------------------------------------|
| `--card-content-height` | `28rem` | Default height for rich content areas inside Cards, for example a SplitPane |


### 4.17 Input Sizing

| Token              | Value   | Usage                                          |
|--------------------|---------|------------------------------------------------|
| `--input-min-width` | `150px` | Minimum width for form controls (Dropdown, etc.) |

### 4.18 Semantic Typography

Semantic font-size aliases map to the raw size tokens. Change one alias to update every instance of that text role globally.

| Token                      | Default value          | Role                                       |
|----------------------------|------------------------|--------------------------------------------|
| `--font-size-page-title`   | `var(--font-size-xl)`  | Top-level page headings (h1)               |
| `--font-size-section-title`| `var(--font-size-lg)`  | Section headings within a page (h2)        |
| `--font-size-card-header`  | `var(--font-size-sm)`  | Card header text                           |
| `--font-size-label`        | `var(--font-size-xs)`  | Uppercase panel/group labels               |
| `--font-size-body`         | `var(--font-size-sm)`  | Standard body/content text                 |
| `--font-size-caption`      | `var(--font-size-xs)`  | Small hints, counts, secondary descriptions|
| `--font-size-stat`         | `var(--font-size-xl)`  | Large stat/metric numbers in dashboards    |

**Conventions per role:**

| Role           | Font weight | Color          | Extra                     |
|----------------|-------------|----------------|---------------------------|
| Page title     | bold (700)  | `var(--fg)`    | —                         |
| Section title  | semibold (600)| `var(--fg)`  | Often has bottom border   |
| Card header    | semibold (600)| `var(--fg)`  | —                         |
| Label          | semibold (600)| `var(--muted)`| uppercase, letter-spacing |
| Body           | regular (400)| `var(--fg)`   | —                         |
| Caption        | regular (400)| `var(--muted)`| —                         |
| Stat           | bold (700)  | `var(--fg)`    | Centered, prominent       |

### 4.18 Uppercase Label Utility

The `.text-label-upper` CSS class bundles the uppercase label pattern used across Panel titles, StatusBadge, CheckboxGroup headers, SectionedTree headers, and stat labels.

```css
.text-label-upper {
  font-size: var(--font-size-label);
  font-weight: var(--font-weight-semibold);
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wide);
}
```

**Usage:** Apply the class directly. Add a semantic component class when overflow or interactive hover behavior is also needed.

**Components using this class:** Panel, StatusBadge, CheckboxGroup, SectionedTree, DashboardDemo stat labels.

### 4.19 Complete `tokens.css`

```css
/* ============================================================
   @codesweep-ai/ui — Design Tokens
   ============================================================ */

:root {
  /* --- Spacing --- */
  --space-0: 0;
  --space-px: 1px;
  --space-0-5: 0.125rem;
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2rem;

  /* --- Radii --- */
  --radius-xs: 2px;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;

  /* --- Typography --- */
  --font-family-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
    Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji",
    "Segoe UI Emoji";
  --font-family-mono: ui-monospace, "SF Mono", "SFMono-Regular", Menlo,
    Consolas, "Liberation Mono", "Cascadia Code", monospace;

  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
  --font-size-lg: 1.25rem;
  --font-size-xl: 1.5rem;

  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  --line-height-tight: 1.2;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.7;

  /* --- Shadows (dark-mode defaults) --- */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.6);
  --shadow-up: 0 -3px 6px rgba(0, 0, 0, 0.5);

  /* --- Transitions --- */
  --transition-fast: 0.15s ease;
  --transition-normal: 0.2s ease;

  /* --- Application chrome --- */
  --color-accent: #1ee0ca;
  --color-header-bg: #171717;
  --color-header-text: #fafafa;
  --color-header-text-muted: #b8b8b8;
  --color-nav-hover: #404040;
  --color-text-inverse: #ffffff;

  /* --- Dark Theme (default) --- */
  --bg: #0b0f14;
  --fg: #e6edf3;
  --muted: #9aa4af;
  --card: #0f1620;
  --border: rgba(255, 255, 255, 0.08);

  --color-accent-bg: rgba(30, 224, 202, 0.05);
  --color-accent-bg-hover: rgba(30, 224, 202, 0.1);
  --color-accent-bg-strong: rgba(30, 224, 202, 0.15);

  --color-link: #3b82f6;
  --color-link-hover: #2563eb;

  --color-error: #f87171;
  --color-error-text: #f87171;
  --color-error-bg: rgba(248, 113, 113, 0.1);
  --color-info: #60a5fa;
  --color-success: #34d399;
  --color-success-bg: rgba(52, 211, 153, 0.2);
  --color-warning: #f59e0b;
  --color-warning-bg: rgba(245, 158, 11, 0.1);
  --color-neutral: #9ca3af;
  --color-neutral-bg: rgba(156, 163, 175, 0.2);

  --color-btn-primary: #17c9b5;
  --color-btn-primary-text: #000000;
  --color-btn-success-text: #000000;
  --color-btn-warning-text: #000000;
  --color-btn-disabled-bg: rgba(59, 130, 246, 0.5);
  --color-btn-disabled-text: rgba(255, 255, 255, 0.7);

  --color-bg-subtle: rgba(255, 255, 255, 0.05);
  --color-bg-muted: rgba(128, 128, 128, 0.05);
  --color-bg-muted-hover: rgba(128, 128, 128, 0.1);
  --color-row-hover: rgba(255, 255, 255, 0.06);

  /* --- Z-index --- */
  --z-sticky: 10;
  --z-header: 100;
  --z-modal: 200;

  /* --- Overlay --- */
  --color-overlay: rgba(0, 0, 0, 0.5);

  /* --- Header shadow (always dark, not theme-dependent) --- */
  --shadow-header: 0 2px 10px rgba(0, 0, 0, 0.3);

  /* --- Letter spacing --- */
  --letter-spacing-wide: 0.5px;

  /* --- Tree indentation --- */
  --tree-indent-size: 1rem;
  --tree-indent-base: 0.5rem;

  /* --- Icon sizes --- */
  --icon-size-xs: 12px;
  --icon-size-sm: 14px;
  --icon-size-md: 16px;
  --icon-size-lg: 18px;

  /* --- Code typography --- */
  --font-size-code: 13px;
  --line-height-code: 1.6;

  /* --- Card content --- */
  --card-content-height: 28rem;
}

:root[data-theme="light"] {
  /* --- Shadows (lighter for white backgrounds) --- */
  --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.08);
  --shadow-md: 0 2px 8px rgba(15, 23, 42, 0.12);
  --shadow-lg: 0 8px 24px rgba(15, 23, 42, 0.18);
  --shadow-up: 0 -3px 6px rgba(15, 23, 42, 0.1);

  --bg: #f3f4f6;
  --fg: #1f2937;
  --muted: #4b5563;
  --card: #ffffff;
  --border: rgba(0, 0, 0, 0.1);

  --color-accent: #0f766e;
  --color-accent-bg: rgba(13, 148, 136, 0.08);
  --color-accent-bg-hover: rgba(13, 148, 136, 0.12);
  --color-accent-bg-strong: rgba(13, 148, 136, 0.18);

  --color-link: #2563eb;
  --color-link-hover: #1d4ed8;

  --color-error: #dc2626;
  --color-error-text: #b91c1c;
  --color-error-bg: rgba(220, 38, 38, 0.1);
  --color-info: #0369a1;
  --color-success: #047857;
  --color-success-bg: rgba(16, 185, 129, 0.2);
  --color-warning: #b45309;
  --color-warning-bg: rgba(210, 153, 34, 0.15);
  --color-neutral: #6b7280;
  --color-neutral-bg: rgba(107, 114, 128, 0.2);

  --color-btn-primary: #0f766e;
  --color-btn-primary-text: #ffffff;
  --color-btn-success-text: #ffffff;
  --color-btn-warning-text: #ffffff;
  --color-btn-disabled-bg: rgba(37, 99, 235, 0.5);
  --color-btn-disabled-text: rgba(255, 255, 255, 0.7);

  --color-bg-subtle: rgba(0, 0, 0, 0.03);
  --color-bg-muted: rgba(128, 128, 128, 0.08);
  --color-bg-muted-hover: rgba(128, 128, 128, 0.12);
  --color-row-hover: rgba(0, 0, 0, 0.04);
}
```

---

## 5. Branding

### 5.1 Assets

Canonical branding assets live in `assets/` at the design system root. Consuming projects copy these into their own `public/` directory, and must not be modified per-project.

| Asset          | Path                        | Format | Size     | Usage                    |
|----------------|-----------------------------| -------|----------|--------------------------|
| Logo (wordmark)| `assets/logo.png`           | PNG    | ~45 KB   | Header brand mark        |
| Favicon        | `assets/favicon.svg`        | SVG    | ~0.5 KB  | Browser tab icon         |

### 5.2 Logo

This package ships no logo. The brand mark in the `Header` is the **text title**: a tool's command name (`cs-ledger`, `cs-tracer`) rendered in `var(--color-accent)`. Tools built on the package add no image. A private brand layer may pass `logoSrc` to render its own asset instead; the `title` prop remains required (`alt` text and `aria-label`).

```tsx
<Header title="cs-myapp" />
```

### 5.3 Favicon

The favicon is a 32×32 SVG: a black circle with a brand-accent `/` slash character.

**Usage rules:**

- Place `favicon.svg` in each project's `public/` directory.
- Reference in `index.html`:
  ```html
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  ```
- The SVG uses `#1ee0ca` (brand accent) for the slash and `#000000` for the circle. These are fixed, not theme-dependent.

### 5.4 Provenance

Both assets are identical across applications A, B and C, byte for byte. The design system `assets/` directory is now the single source of truth.


---

## 6. Component Catalog

Every component below is part of `@codesweep-ai/ui`. Each component has a dedicated specification in `components/<Name>.md` with full props, visual spec, states, behavior, accessibility, and edge cases.

| Component      | `data-component`  | Description                                    | Spec                                          |
|----------------|-------------------|------------------------------------------------|-----------------------------------------------|
| Panel          | `Panel`           | Collapsible side panel with header             | [Panel.md](components/Panel.md)               |
| Card           | `Card`            | Content container with variants                | [Card.md](components/Card.md)                 |
| CardGroup      | `CardGroup`       | Maximize/minimize container for Cards          | [CardGroup.md](components/CardGroup.md)       |
| SplitPane      | `SplitPane`       | Resizable multi-pane container                 | [SplitPane.md](components/SplitPane.md)       |
| Tree           | `Tree`            | Hierarchical tree with search & selection      | [Tree.md](components/Tree.md)                 |
| SectionedTree  | `SectionedTree`   | Multi-section tree with collapsible headers    | [SectionedTree.md](components/SectionedTree.md)|
| Dropdown       | `Dropdown`        | Styled native select element                   | [Dropdown.md](components/Dropdown.md)         |
| Button         | `Button`          | Button with multiple variants & sizes          | [Button.md](components/Button.md)             |
| Table          | `Table`           | Sortable data table with hover rows            | [Table.md](components/Table.md)               |
| EventLanes     | `EventLanes`      | Canvas event timeline with shared lane axis    | [EventLanes.md](components/EventLanes.md)     |
| AppShell       | `AppShell`        | Shell + Header + Footer                        | [AppShell.md](components/AppShell.md)         |
| ThemeToggle    | `ThemeToggle`     | Theme mode cycling control                     | [ThemeToggle.md](components/ThemeToggle.md)   |
| Modal          | `Modal`           | Dialog overlay                                 | [Modal.md](components/Modal.md)               |
| StatusBadge    | `StatusBadge`     | Status indicator with colored dot              | [StatusBadge.md](components/StatusBadge.md)   |
| CodeBlock      | `CodeBlock`       | Syntax-highlighted code with copy              | [CodeBlock.md](components/CodeBlock.md)       |
| SearchInput    | `SearchInput`     | Search field with debounce                     | [SearchInput.md](components/SearchInput.md)   |
| HighlightText  | `HighlightText`   | Text with substring highlighting               | [HighlightText.md](components/HighlightText.md)|
| CheckboxGroup  | `CheckboxGroup`   | Checkbox list with filter and grouped sections | [CheckboxGroup.md](components/CheckboxGroup.md)|
| MarkdownViewer | `MarkdownViewer`  | Rich markdown renderer with outline + minimap  | [MarkdownViewer.md](components/MarkdownViewer.md) |

---

## 7. Conventions

### 7.1 Prop Naming

| Pattern              | Convention                | Example                              |
|----------------------|---------------------------|--------------------------------------|
| Boolean flags        | Adjective or `is`-prefix  | `collapsed`, `disabled`, `isOpen`    |
| Event handlers       | `on` + verb               | `onSelect`, `onCollapse`, `onResize` |
| Data props           | Noun                      | `nodes`, `columns`, `steps`          |
| Render overrides     | `render` + noun           | `renderLabel`, `renderCell`          |
| Children             | `children`                | Standard React children              |
| Class extension      | `className`               | Merged onto root element             |

### 7.2 Controlled vs. Uncontrolled

Components are **controlled by default**. The parent owns the state and passes it down.

```tsx
// Controlled (default) — parent manages expanded state
<Tree
  nodes={nodes}
  expandedIds={expandedIds}
  onToggle={(id) => setExpandedIds(toggle(expandedIds, id))}
/>
```

An **uncontrolled** convenience wrapper may be provided as a separate export (for example `UncontrolledTree`) that manages its own state internally. The uncontrolled version accepts `defaultExpandedIds` instead of `expandedIds`.

### 7.3 Persistence via `storageKey`

Components that support localStorage persistence accept an optional `storageKey` prop (`ThemeToggle` defaults to `cs-theme`; see its spec):

```tsx
<SplitPane
  panes={[
    { id: "sidebar", defaultWidth: 260, storageKey: "app-sidebar-width" },
    { id: "content" }
  ]}
/>
```

When `storageKey` is provided:
- On mount, the component reads `localStorage.getItem(storageKey)` and uses it as the initial value.
- On change, the component writes `localStorage.setItem(storageKey, value)`.
- Reads and writes are wrapped in try/catch to handle storage unavailability.
- The key format is always `"<project>-<component>-<dimension>"` (for example `"spec-viewer-file-tree-width"`).

### 7.4 Extension Slots

Components expose extension points via render props rather than deep prop drilling:

```tsx
<Panel
  title="Files"
  actions={<IconButton icon={Expand} onClick={expandAll} />}
>
  <Tree renderLabel={(node) => <CustomLabel node={node} />} />
</Panel>
```

### 7.5 className Merging

All components accept a `className` prop that is merged onto the root element using `cn()`:

```tsx
function Panel({ className, ...props }: PanelProps) {
  return <div className={cn("panel", className)} {...props} />;
}
```

This allows consumers to override or extend styles without forking the component.

### 7.6 Theme Convention

- Theme preference is stored as `"light" | "dark" | "system"`.
- Resolved theme is `"light" | "dark"`.
- Applied via `document.documentElement.setAttribute("data-theme", resolved)`.
- Storage key: `"<project>-theme"` (for example `"app-discovery-theme"`).
- System preference detected via `window.matchMedia("(prefers-color-scheme: dark)")`.
- System preference changes are tracked via `matchMedia.addEventListener("change", ...)`.
- Flash prevention: call `applyStoredTheme()` synchronously before `ReactDOM.createRoot()`.

### 7.7 URL State Sync

View-level state (active tab, selected item, current page) should be synced to URL parameters:

```typescript
// Read from URL on mount
const params = new URLSearchParams(window.location.search);
const view = params.get("view");

// Update URL on change (without navigation)
const url = new URL(window.location.href);
url.searchParams.set("view", activeView);
window.history.replaceState({}, "", url.toString());
```

**Parameter cleanup**: When navigating away from a view, remove any URL parameters that belong exclusively to that view. The URL should only contain parameters that are meaningful for the current state. For example, a `tab` parameter owned by one page must be deleted when the user switches to a different page. This applies both when handling navigation events and on initial load (in case the user arrives via a stale or manually edited URL).

### 7.8 BEM for Domain CSS

When a feature needs domain-specific CSS beyond the shared component stylesheet, use BEM naming:

```css
.filter-panel { }
.filter-panel__header { }
.filter-panel__header--collapsed { }
```

### 7.9 Event Handling

- All callbacks are prefixed with `on`: `onSelect`, `onChange`, `onCollapse`.
- Callbacks receive the minimal data needed, not raw DOM events.
- Example: `onSelect: (nodeId: string) => void` not `onClick: (e: MouseEvent) => void`.

### 7.10 (Retired) Arbitrary Values and Class Merging

This retired convention covered an older utility-class implementation. Components use plain CSS now, with no arbitrary-value syntax. The numbered placeholder remains so references to §7.11+ stay valid.

### 7.11 Scrollable Regions

`overflow-y: auto` only produces a scrollbar when the element has a **resolved bounded height**. If the element (or its flex/grid parent) has no height constraint, it grows with its content and never scrolls. This is the most common layout bug in multi-pane UIs.

**Rule:** Every element that uses `overflow-y: auto` (or `overflow-y: scroll`) must have a bounded height. That height can come from:

| Source | Example |
|--------|---------|
| Explicit height | `height: 24rem` |
| Flex child with bounded parent | Parent has `height: 100%` or an explicit height; child has `flex: 1` + `min-height: 0` |
| `max-height` | `max-height: 20rem` — use only on a single element, not when sibling columns also need to scroll |

**Single scroll owner:** Each Card (or bounded container) should have exactly **one scroll owner**: the single element whose content can exceed the available height and needs a scrollbar. Adding `overflow-y: auto` to multiple siblings creates competing scrollbars that confuse users and cause unpredictable scroll behavior.

```css
/* Flex row — bounded height */
display: flex;
height: 24rem;

/* Column A — scrollable (e.g., filter sidebar with long list) */
overflow-y: auto;

/* Column B — clips, does NOT scroll (e.g., chart area) */
overflow: hidden;
```

If both columns genuinely need independent scrolling (rare, for example two long lists side by side), that's acceptable, but the default should be: **one scrolls, the other clips**.

**Common mistake:** Putting `overflow-y: auto` on both a sidebar and a content area inside a Card. The sidebar checkbox list may need scrolling, but the content area typically fits, so giving it `overflow-y: auto` adds a second scrollbar that fights with the first.

**Another common mistake:** Putting `max-height` on one column but not the other. This clips content in the constrained column while leaving the sibling unbounded (no scroll). Always bound the shared parent instead.

**Sticky headers require a scrollable ancestor:** `position: sticky` only works inside a scrollable container. If the container isn't scrolling (because it has no bounded height), sticky headers won't stick.

### 7.12 Component Traceability (`data-component`)

Every design system component must render a `data-component` attribute on its root DOM element. This enables tracing rendered DOM elements back to their source component when inspecting in browser DevTools or reporting bugs.

```tsx
function Panel({ className, ...props }: PanelProps) {
  return <div data-component="Panel" className={cn("panel", className)} {...props} />;
}
```

**Rules:**

| Rule | Detail |
|------|--------|
| Attribute name | `data-component` |
| Value | PascalCase component name, matching the export name |
| Placement | Root DOM element of every exported component |
| Multiple roots | If a component conditionally renders different root elements (for example ThemeToggle), every path must include the attribute |
| Sub-components | Internal sub-components (for example TreeNodeRow) do NOT need `data-component` — only exported components |
| Kept in production | The attribute must NOT be stripped in production builds — it aids bug reporting |

**Result in the DOM:**

```html
<div data-component="Panel" role="group" aria-label="Explorer">
  <div data-component="SectionedTree">
    <div data-component="Tree" role="tree">
      ...
    </div>
  </div>
</div>
```

Each component's spec (in `components/<Name>.md`) documents its `data-component` value.

### 7.13 Accessibility

- All interactive elements must have `tabIndex={0}` or be native interactive elements.
- Tree structures use `role="tree"` / `role="treeitem"` with `aria-expanded`.
- Buttons include meaningful `title` or `aria-label` attributes.
- Focus styles: rely on browser defaults or add a visible focus ring.
- Keyboard support: Enter/Space to activate, Escape to dismiss overlays.

### 7.14 In-Page Navigation

Long pages with multiple sections (for example a component catalog, a settings page) should use hash-based anchor navigation so users can bookmark and share links to specific sections.

#### Structure

| Element | Implementation | Notes |
|---------|---------------|-------|
| Page root | `id="top"` on the outermost content `<div>` | Anchor target for "Back to top" links |
| Scroll container | `scroll-behavior: smooth` on the scrolling ancestor | Smooth scrolling for anchor clicks; initial page load scrolls instantly |
| Section | `id={slug(title)}` on the `<section>` element | `slug()` lowercases and replaces non-alphanumeric runs with hyphens |
| Section heading | Flex row with title + "Top ↑" anchor (`href="#top"`) | Provides a way back without scrolling manually |
| Table of Contents | Card with `<a href="#slug">` links in a multi-column grid | Placed at the top of the page, before the first section |

#### Slug Function

```typescript
function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
```

The slug drops punctuation and lower-cases the rest, so `"Panel + Tree"` becomes `panel-tree` and `"SectionedTree (flipped)"` becomes `sectionedtree-flipped`.

#### URL Lifecycle

| Event | Action |
|-------|--------|
| Click TOC link | Browser updates `window.location.hash` and smooth-scrolls to the target (native `<a href="#id">` behavior) |
| Initial page load with hash | `useEffect` reads `window.location.hash`, calls `document.getElementById(hash)?.scrollIntoView()` (instant, no smooth animation) |
| Navigate to a different page | Page-switch handler clears the hash: `url.hash = ""; history.replaceState(...)` |

This follows the same URL-state pattern as Section 7.7. Page-owned parameters are cleaned up when leaving the page.

#### Section Helper Pattern

Pages define a local `Section` component (not a design system export) that applies the convention:

```tsx
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section id={slug(title)} className="doc-section">        {/* display: grid; gap: var(--space-4) */}
      <div className="doc-section__head">                       {/* flex; space-between; border-bottom: 1px solid var(--border) */}
        <h2 className="doc-section__title">{title}</h2>        {/* font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold) */}
        <a
          href="#top"
          className="doc-section__top"                         {/* font-size: var(--font-size-xs); color: var(--muted); hover: var(--color-link) */}
        >
          Top ↑
        </a>
      </div>
      {children}
    </section>
  );
}
```

This is intentionally a local helper, not a shared component. It is too thin (no variants, no state, no `data-component`) and section heading styles vary across pages.

### 7.15 Navigation Elements

Navigation that changes the current view must use `<a>` elements with a valid `href`, not `<button>` elements. This enables right-click → "Open in new tab", middle-click, and Ctrl/Cmd+click, which are the browser navigation affordances users expect.

For SPA navigation, call `e.preventDefault()` in the click handler and update state + URL via `replaceState`. The `href` should be a valid URL that, when loaded directly, resolves to the target view.

### 7.16 Tokenization Boundary

Use this decision rule (aligned with the W3C Design Tokens specification) to determine whether a value should be a token or a named constant:

| If the value represents… | Then use… |
|---|---|
| A **design decision** that should be consistent across the product and could change during a rebrand or theme switch | A **design token** (`--color-*`, `--space-*`, etc.) |
| A **structural implementation detail** internal to a single component | A **named constant** at the top of the file |
| A value **constrained by a third-party API** that cannot accept `var()` | A **named constant**, documented as API-constrained |

#### Acceptable hardcoded value categories

The following categories are structural or API-constrained and use named constants instead of tokens:

- **SVG presentation attributes:** `strokeWidth`, `r`, `opacity`, dash patterns passed directly to `<line>`, `<circle>`, `<path>` elements. CSS custom properties cannot be used in SVG attributes (only in `style`). Colors (`stroke`, `fill`) **should** still use tokens via `var()`.
- **Canvas 2D drawing values:** Insets, minimum heights, and alpha values used in `ctx.fillRect()`, `ctx.globalAlpha`, etc. Canvas API requires numeric values. Read token-based **colors** at draw time via `getComputedStyle`. (See `MarkdownMinimap.tsx`.)
- **Charting library numeric props:** `fontSize`, `width`, `innerRadius`, `outerRadius` required by Recharts or other SVG charting libraries. These APIs accept numbers, not `var()`. Color props (`stroke`, `fill`) should use tokens. Tooltip and Legend HTML should use tokens through plain CSS classes.
- **Engineering constants:** Debounce timings, scroll detection thresholds, and numeric values used in pure JavaScript logic (`Math.min/max`, `setTimeout`, intersection observer margins). These are not visual properties and have no token equivalent.
- **Table column widths:** Fixed `width` values on `TableColumn` definitions (for example `"80px"`, `"13%"`) that are specific to each table's content and don't generalise.

> **Guideline:** If a value affects visual output (spacing, sizing, color, typography), it should be a token. If a value is constrained by a third-party API or is a pure engineering constant (no visual impact), it may be hardcoded.

#### Rules for hardcoded values

When adding hardcoded values in these categories, always:
1. Extract to a **named constant** (not inline literals)
2. Add a **brief comment** explaining why it's not a token
3. Group related constants together at the top of the file

#### Suppressing lint for exceptions

Use standard ESLint directives, not ad-hoc comments:

```tsx
// Single line:
// eslint-disable-next-line @codesweep-ai/no-hardcoded-colors -- display data for token preview
const color = "#ff0000";

// Block of lines:
/* eslint-disable @codesweep-ai/no-hardcoded-colors -- token preview fixture data */
const colors = [
  { name: "--bg", value: "#0b0f14" },
  { name: "--fg", value: "#e6edf3" },
];
/* eslint-enable @codesweep-ai/no-hardcoded-colors */

// In JSX:
{/* eslint-disable-next-line @codesweep-ai/no-unknown-token -- placeholder token name */}
<code>var(--color-cat-N)</code>
```

Always include a `--` reason explaining **why** the exception is needed.

### 7.x Print / PDF export

Product surfaces support clean printing / "Save as PDF" via the package's print stylesheet. Opt in by importing it once at the app root:

```ts
import "@codesweep-ai/ui/styles/print.css";
```

It forces light theme on paper and hides app chrome: `[data-component="Header"]`, `[data-component="Footer"]`, and anything marked `.no-print`. It also lets `.prose` and `.markdown-content` fill the page width, prevents orphaned headings and split rows, and appends link URLs after link text. Add `.no-print` to anything else a printed page shouldn't show (toolbars, filters, ephemeral state).

---

## 8. Extension Pattern

### Problem

Projects need project-specific behavior (custom tree node rendering, extra status colors, domain-specific card variants) without forking the shared components.

### Solution: Composition + className + renderProps

```tsx
// Project-specific tree with custom icons
import { Tree, type TreeNode } from "@codesweep-ai/ui";
import { Package, Code, Palette } from "lucide-react";

interface AppNode extends TreeNode {
  nodeType: "package" | "module" | "theme";
}

function AppTree({ nodes }: { nodes: AppNode[] }) {
  return (
    <Tree<AppNode>
      nodes={nodes}
      renderLabel={(node) => (
        <span className="tree-label">  {/* display: inline-flex; align-items: center; gap: var(--space-2) */}
          {node.nodeType === "package" && <Package size={14} />}
          {node.nodeType === "module" && <Code size={14} />}
          {node.nodeType === "theme" && <Palette size={14} />}
          {node.name}
        </span>
      )}
      // ...other props
    />
  );
}
```

### Adding Project-Specific Tokens

Projects can extend the token set by adding their own CSS custom properties. They must not redefine any token from Section 4, and may only add new ones:

```css
/* project-tokens.css — loaded AFTER @codesweep-ai/ui tokens */
:root {
  /* OK: new project-specific tokens */
  --color-package-root: #f5a623;
  --color-module-1: #3498db;

  /* Shared package tokens remain unchanged. */
}
```

### Adding Component Variants

If a project needs a card variant not in the spec, use `className`:

```tsx
<Card className="package-root-card">
  <h3>Package Root</h3>
</Card>
```

```css
.package-root-card { border-left: var(--space-1) solid var(--color-package-root); }
```

If the variant is needed across multiple projects, add it to this spec instead.

---

## 9. Agent Maintenance

### How the Agent Uses This Spec

An LLM agent (Claude or similar) is responsible for:

1. **Building `@codesweep-ai/ui`:** the agent reads this spec and generates/updates the component implementations.
2. **Validating consuming projects:** the agent audits each project for spec drift (wrong token values, inconsistent component APIs).
3. **Proposing spec changes:** when a project needs a new token or component, the agent proposes an addition to this spec before implementing it.

### Agent Workflow

```
1. Read DESIGN_SYSTEM_SPEC.md
2. For each component in Section 5:
   a. Check if implementation exists in @codesweep-ai/ui
   b. If not, create it matching the spec exactly
   c. If yes, diff against spec and fix any drift
3. For each consuming project:
   a. Scan CSS for hardcoded values that should use tokens
   b. Scan components for patterns that should use shared components
   c. Report findings as a drift report
```

### Drift Report Format

```markdown
## Drift Report: {project}

### Token Drift
| File | Line | Found | Expected Token |
|------|------|-------|----------------|
| src/styles/base.css | 42 | `#0b0f14` | `var(--bg)` |

### Component Drift
| File | Issue | Recommendation |
|------|-------|----------------|
| src/components/Card.tsx | Custom Card duplicates shared Card | Replace with `import { Card } from "@codesweep-ai/ui"` |

### Missing Extensions
| Pattern | Recommendation |
|---------|----------------|
| Package-root color used in 2+ projects | Add to spec Section 4 |
```

### Spec Change Protocol

1. **Identify need:** a project requires a token or component not in the spec.
2. **Check provenance:** the value must come from an existing project, not be invented.
3. **Propose addition:** add to the appropriate section with source attribution.
4. **Update implementations:** agent updates `@codesweep-ai/ui` and all consuming projects.
5. **Validate:** run drift report to confirm convergence.


## 10. Lint Enforcement

Two linters run in `npm run lint` and in CI. Stylelint guards the stylesheets; ESLint guards the TypeScript. An older utility-class-specific plugin is no longer needed because components use plain CSS.

### 10.1 Active Rules

| Rule | Tool | Catches |
|------|------|---------|
| `color-no-hex` | stylelint | Any hex colour in component sheets or the preview stylesheet — values come from tokens |
| `unit-disallowed-list: px` | stylelint | Any `px` literal outside `tokens.css` — sizes come from spacing/radius tokens |
| `react-refresh/only-export-components` | ESLint | Non-component exports that break HMR |
| `@typescript-eslint/*` (recommended) | ESLint | Type-level mistakes in components and preview |

### 10.2 Running

```bash
npm run lint          # stylelint + eslint, zero warnings allowed in CI
npm run lint:styles   # stylelint only
```

### 10.3 Future Rule Candidates

Rules under consideration for future implementation:

| Rule | Category | Description | Complexity |
|------|----------|-------------|------------|
| `no-static-inline-style` | Convention | Flag `style={{}}` when the value is static (not a JS variable). Requires distinguishing static strings from dynamic expressions in JSX. | High — needs AST analysis of JSX attribute values |
| `require-data-component` | Convention | Require every exported React component to render `data-component` on its root element. | High — needs AST traversal of component return JSX |

---

## Appendix A: Icon Reference

All icons come from `lucide-react`. Standard sizes:

| Token              | Size   | Context                                  |
|--------------------|--------|------------------------------------------|
| `--icon-size-xs`   | `12px` | Section chevrons, fold/unfold, view mode |
| `--icon-size-sm`   | `14px` | Tree nodes, sort arrows, nav arrows      |
| `--icon-size-md`   | `16px` | Close buttons, copy, search, panels      |
| `--icon-size-lg`   | `18px` | Theme toggle, modal close                |

Size icons in their component sheets with `width` and `height` set to the appropriate icon token; do not use lucide's numeric `size` prop.

### Navigation

| Icon              | Size Token         | Usage                              |
|-------------------|--------------------|------------------------------------|
| `ChevronRight`    | `--icon-size-sm`   | Collapsed tree branch, next        |
| `ChevronDown`     | `--icon-size-sm`   | Expanded tree branch, open section |
| `ChevronUp`       | `--icon-size-sm`   | Sort ascending                     |
| `ChevronLeft`     | `--icon-size-sm`   | Prev page, flipped tree            |
| `ArrowUpDown`     | `--icon-size-sm`   | Sortable column (unsorted)         |

### Actions

| Icon              | Size Token         | Usage                    |
|-------------------|--------------------|--------------------------|
| `X`               | `--icon-size-md`   | Close, dismiss, clear    |
| `Search`          | `--icon-size-md`   | Search input trigger     |
| `Copy`            | `--icon-size-md`   | Copy to clipboard        |
| `Check`           | `--icon-size-md`   | Copied confirmation      |
| `PanelLeftClose`  | `--icon-size-md`   | Collapse side panel      |
| `Maximize2`       | `--icon-size-sm`   | Maximize card            |
| `Minimize2`       | `--icon-size-sm`   | Restore card             |

### Content

| Icon              | Size Token         | Usage                    |
|-------------------|--------------------|--------------------------|
| `FileText`        | `--icon-size-sm`   | File / leaf node         |
| `Folder`          | `--icon-size-sm`   | Folder / branch node     |
| `GripVertical`    | `--icon-size-sm`   | Drag handle              |

### View Controls

| Icon              | Size Token         | Usage                    |
|-------------------|--------------------|--------------------------|
| `Sun`             | `--icon-size-lg`   | Light theme              |
| `Moon`            | `--icon-size-lg`   | Dark theme               |
| `Monitor`         | `--icon-size-lg`   | System theme             |
| `ListTree`        | `--icon-size-xs`   | Tree view mode           |
| `List`            | `--icon-size-xs`   | Flat list view mode      |
| `UnfoldVertical`  | `--icon-size-xs`   | Expand all               |
| `FoldVertical`    | `--icon-size-xs`   | Collapse all             |

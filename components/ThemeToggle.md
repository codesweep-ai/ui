---
name: ThemeToggle
status: stable
since: 1.0.0
summary: Button or radio-group control for cycling through theme modes (system, light, dark), with localStorage persistence.
keywords: [theme toggle, dark mode, light mode, color scheme, theme switcher, appearance,
           system theme, mode toggle, dark light, preferences, ui theme]
use_when:
  - Letting users switch between light, dark, and system color schemes
  - Placing a theme control in the app header or settings panel
related: [AppShell]
---

# ThemeToggle

> Button or control for cycling through theme modes (system, light, dark).

## Props

```typescript
interface ThemeToggleProps {
  /** Display style */
  variant?: "icon-cycle" | "radio-group";
  /** Additional className */
  className?: string;
  /** localStorage key the chosen mode persists under (default "cs-theme") */
  storageKey?: string;
  /** Query parameter honoured for this load only (default "theme"); false disables it */
  urlParam?: string | false;
}
```

## Visual Spec

### Variant: `icon-cycle` (default)

#### Layout
- Single `<button>` element.
- `display: inline-flex`, `align-items: center`, `justify-content: center`.

#### Styling
- Background: `none`.
- Border: `1px solid var(--border)`.
- Padding: `var(--space-2)`.
- Border-radius: `var(--radius-md)`.
- Color: `var(--color-header-text)` (since it's in the always-dark header).
- Cursor: `pointer`.

#### Icons
| Theme Mode | Icon      | Size |
|------------|-----------|------|
| System     | `Monitor` | 18px |
| Light      | `Sun`     | 18px |
| Dark       | `Moon`    | 18px |

#### Cycle Order
`system` → `light` → `dark` → `system`

### Variant: `radio-group`

#### Layout
- `display: inline-flex`, `gap: var(--space-1)`, `align-items: center`.
- Three radio-style buttons in a row.

#### Styling
- Each option: `padding: var(--space-1) var(--space-2)`, `border-radius: var(--radius-sm)`, `font-size: var(--font-size-xs)`.
- Inactive: `background: transparent`, `color: var(--muted)`.
- Active: `background: var(--color-bg-muted)`, `color: var(--fg)`.
- System option shows resolved theme: e.g., "System (Dark)".

### States
| State   | CSS (icon-cycle)                                             |
|---------|--------------------------------------------------------------|
| Default | `border: 1px solid var(--border)`, `color: var(--color-header-text)` |
| Hover   | `background: var(--color-nav-hover)`, `border-color: var(--muted)` |
| Active  | `transform: scale(0.95)`                                    |
| Focus   | `box-shadow: 0 0 0 2px var(--color-accent)`, `outline: none` |

### Responsive
- No breakpoint changes.

## Behavior

### Interactions
- **Click (icon-cycle)**: Cycles to next theme mode in order.
- **Click (radio-group)**: Sets theme to the clicked option.
- Theme is applied via `document.documentElement.setAttribute("data-theme", resolved)`.
- The chosen **mode** (never the resolved theme) persists in `localStorage` under `storageKey` (default `cs-theme`; a tool that already has a key passes its own).
- `?theme=light|dark|system` in the URL overrides the mode for that load and is not saved; pass `urlParam={false}` to opt out.
- The same behaviour is available to custom controls through `useTheme({ storageKey, urlParam })`.
- Resolved theme: if mode is "system", detect via `window.matchMedia("(prefers-color-scheme: dark)")`.

### Keyboard
| Key   | Action                       |
|-------|------------------------------|
| Enter | Activate toggle / select mode |
| Space | Activate toggle / select mode |
| Tab   | Navigate between options (radio-group) |

### Accessibility
- Icon-cycle button: `aria-label="Toggle theme. Current: {mode}"`, `title="Theme: {mode}. Click to cycle."`.
- Radio-group: `role="radiogroup"`, `aria-label="Theme"`. Each option: `role="radio"`, `aria-checked`.

## Persistence

- Theme mode is stored under `"cs-theme"` by default; pass `storageKey` for an application-specific key.
- Format: `"light" | "dark" | "system"`.
- **Read**: On mount, read stored value. If missing, default to `"system"`.
- **Write**: On every change, write new mode.
- **Flash prevention**: insert `themeBootScript({ storageKey, urlParam })` in the document head so the resolved `data-theme` is applied before React mounts.
- System preference changes tracked via `matchMedia.addEventListener("change", ...)`.

## Dependencies

- `lucide-react`: `Monitor`, `Sun`, `Moon`.
- `useTheme` hook (part of the theme system).
- `cn()` utility for className merging.

## Edge Cases

- **localStorage unavailable**: Default to `"system"`, no persistence.
- **System preference changes while app is open**: Listener updates the resolved theme live.
- **SSR / no window**: Guard `window.matchMedia` calls.

## Traceability

- Radio-group root: `[data-component="ThemeToggle"][role="radiogroup"]`.
- Icon-cycle root: `[data-component="ThemeToggle"][aria-label^="Toggle theme"]`.

## Compiling usage example

<!-- docs-compile -->
```tsx
import { ThemeToggle } from "@codesweep-ai/ui";
export function Example() { return <><ThemeToggle storageKey="tool-theme-icon" /><ThemeToggle variant="radio-group" storageKey="tool-theme-radio" /></>; }
```

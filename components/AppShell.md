---
name: AppShell
status: stable
since: 1.0.0
summary: Application shell with always-dark sticky header, scrollable content area, and optional footer; the top-level layout wrapper for every page.
keywords: [app shell, layout, header, footer, navigation, nav bar, top bar,
           app frame, page layout, sticky header, dark header, logo, nav links,
           global chrome, app wrapper, spa layout]
use_when:
  - Wrapping any full-page app view that needs a header with nav + branding
  - Any page that uses ThemeToggle or top-level navigation
  - Building the outermost layout frame of a SPA
avoid_when:
  - You only need a content card or panel without global chrome → Card or Panel
related: [ThemeToggle]
patterns: [Dashboard]
note: >
  The Header is reserved for global chrome only. Feature-specific controls
  (dropdowns, search bars, breadcrumbs) belong in a feature toolbar inside
  the <main> content area, not in the Header.
---

# AppShell

> Application shell with always-dark header, content area, and optional footer. Groups Shell, Header, and Footer.

## Props

```typescript
/* Shell */
interface AppShellProps {
  children: React.ReactNode;
  /** Additional class name merged onto the shell root */
  className?: string;
}

/* Header */
interface HeaderProps {
  /** Logo image src */
  logoSrc?: string;
  /** Application title */
  title: string;
  /** Title destination; defaults to "/". Pass null to render no title link. */
  titleHref?: string | null;   // default: null — no title link
  /** Nav links */
  navItems?: NavItem[];
  /** Right-side actions (ThemeToggle, controls) */
  actions?: React.ReactNode;
  /** Additional class name merged onto the header root */
  className?: string;
}

interface NavItem {
  label: string;
  href: string;
  active?: boolean;
  /** Optional grouping key; a separator appears when adjacent groups change. */
  group?: string;
  /** SPA navigation handler. When supplied, the Header prevents native navigation first. */
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

/* Footer */
interface FooterProps {
  children?: React.ReactNode;
  /** Additional class name merged onto the footer root */
  className?: string;
}
```

## Visual Spec

### Shell Layout
- Root: `height: 100vh`, `display: flex`, `flex-direction: column`, `overflow: hidden`.
- Background: `var(--bg)`.
- Color: `var(--fg)`.

### Main Content Area
- The shell styles its direct `<main>` child as the single scroller: `flex: 1 1 0%`, `min-height: 0`, `overflow-y: auto`. Header and Footer stay in place; only `<main>` scrolls. The shell's `height: 100vh` and `overflow: hidden` own the viewport boundary, so consumers do not need an `html` or `body` overflow override.

### Header Layout
- `display: flex`, `align-items: center`, `justify-content: space-between`.
- Inner container: full viewport width (no max-width constraint). The header is global chrome and always fills the viewport edge-to-edge. Individual pages control their own content width via layout mode (`page`, `full`, or `split`).

### Header Styling
- Background: `var(--color-header-bg)` (a theme-independent dark neutral).
- Color: `var(--color-header-text)` (a theme-independent light neutral).
- Padding: `var(--space-3) var(--space-4)`.
- Shadow: `0 2px 10px rgba(0, 0, 0, 0.3)`.
- Position: `sticky`, `top: 0`, `z-index: 100`.

### Brand mark
- `display: flex`, `align-items: center`, `gap: var(--space-2)`.
- **Text title (the convention)**: `title` renders as the brand mark. Color: `var(--color-accent)`, font-weight: `var(--font-weight-bold)`, font-size: `var(--font-size-lg)`. Tools built on this package use their command name and no image.
- **Title destination**: `titleHref` defaults to `/`. Pass a path or URL for another destination, or `null` to render the title without an anchor.
- **Single-file artifacts must pass their own `titleHref`.** The `/` default is a
  server-side assumption: in a page opened over `file://` it resolves to the
  filesystem root, so it navigates *out of the artifact*. `null` avoids that but
  leaves the title inert, which is not what a reader expects of a top-left brand
  mark. Pass a destination that resolves inside the page instead — the same one
  the viewer's own index nav item uses. The three tools built on this package
  each do exactly that. A viewer that can also export as a linked set resolves
  it at runtime — `?` when it is one file, `index.html` / `../index.html` when
  split; the single-file ones pass `?` or `?view=<their default view>`. A
  query-only relative URL (`?`, `?view=brief`) reloads the same file with the
  query and hash dropped, and works under `file://`.
- **With `logoSrc`**: Renders an `<img>` instead of the text (`height: 2rem`, `width: auto`, `alt="{title}"`). No logo ships with this package; a brand layer supplies its own.
- **Clear space**: Minimum `var(--space-3)` (12px) around the mark on all sides.

### Nav Links
- Container: `display: flex`, `gap: var(--space-1)`, `align-items: center`.
- Link: `color: var(--muted)`, `padding: var(--space-2) var(--space-3)`, `font-size: var(--font-size-xs)`, `font-weight: var(--font-weight-medium)`, `border-radius: var(--radius-sm)`, `text-decoration: none`.

### Footer Styling
- Background: `var(--color-header-bg)`.
- Color: `var(--color-header-text)`.
- Padding: `var(--space-3) var(--space-4)`.
- Shadow: `var(--shadow-up)`.
- `margin-top: auto`.
- Font-size: `var(--font-size-xs)`.
- `text-align: center`.

### States
| Element       | State   | CSS                                                        |
|---------------|---------|-------------------------------------------------------------|
| Nav link      | Default | `color: var(--muted)`                                      |
| Nav link      | Hover   | `color: var(--color-text-inverse)`, `background: var(--color-nav-hover)` |
| Nav link      | Active  | `color: var(--color-accent)`, `background: var(--color-nav-hover)` |
| Nav link      | Focus   | `box-shadow: 0 0 0 2px var(--color-accent)`, `outline: none` |

### Responsive (max-width: 768px)
- Header inner: `flex-direction: column`, `align-items: flex-start`, `gap: var(--space-2)`.
- Nav links: `flex-wrap: wrap`.

## Behavior

### Interactions
- **Nav links**: Rendered as `<a>` tags with real `href` attributes, enabling native navigation, right-click → "Open in new tab", and middle-click. When an `onClick` callback is supplied for SPA navigation, `e.preventDefault()` is called before the consumer's handler; an `href`-only item is left to the browser. Active state set via `active` prop.
- **Header actions slot**: Renders any React node (typically `ThemeToggle`).

### Keyboard
| Key   | Action                    |
|-------|---------------------------|
| Tab   | Navigate through nav links and actions |

### Accessibility
- Header: semantic `<header>` element (implicit banner landmark).
- Nav: `<nav>` element with `role="navigation"`, `aria-label="Main navigation"`.
- Active nav link: `aria-current="page"`. Visually: `background: color-mix(in srgb, var(--color-accent) 22%, transparent)`, `color: var(--color-header-text)`. Idle links: `color: var(--color-header-text-muted)`; on hover `background: var(--color-nav-hover)`, `color: var(--color-text-inverse)` — the selected and hovered states differ by background hue.
- Footer: semantic `<footer>` element (implicit content-info landmark).
- Main content: supplied by the consumer as a semantic `<main>`; `AppShell` does not create it.

### Content Separation

The Header is reserved for **global app chrome** — it must not contain feature-specific controls.

| Belongs in Header | Does NOT belong in Header |
|-------------------|---------------------------|
| Logo / app title | Collection or project dropdowns |
| Cross-feature nav links (e.g., "Spec Viewer", "App Discovery") | Back/forward navigation buttons |
| `ThemeToggle` | File tree toggle, view mode switches |
| — | Search bars scoped to a feature |
| — | Breadcrumbs, status indicators |

Feature-specific controls go in a **feature toolbar** whose CSS sets `flex-shrink: 0` inside the `<main>` content area, below the Header. See "Feature Toolbar" in DESIGN_SYSTEM_SPEC.md Section 2 for layout and styling details.

```tsx
<AppShell>
  <Header
    title="cs-myapp"
    titleHref="?"
    navItems={[{ label: "Spec Viewer", href: "?", active: true }]}
    actions={<ThemeToggle />}
  />
  <main>
    {/* Feature toolbar + content rendered by the feature component */}
    <SpecViewer />
  </main>
  <Footer>cs-myapp v1.2.3 · @codesweep-ai/ui v0.2.0</Footer>
</AppShell>
```

## Persistence

None at the shell level. Theme persistence handled by `ThemeToggle` / `useTheme`. The active page/nav selection should be synced to URL query parameters by the consuming app per section 7.7 of the design system spec. When navigating away from a page, remove any URL parameters that belong exclusively to that page (e.g., sub-tab params).

## Dependencies

- `cn()` utility for className merging.
- `lucide-react`: no direct icons, but actions slot may contain them.
- **Branding assets** (not a code dependency — provided by each project):
  - `public/logo.png` — canonical source: `@codesweep-ai/ui/assets/logo.png`
  - `public/favicon.svg` — canonical source: `@codesweep-ai/ui/assets/favicon.svg`
  - Favicon is configured in `index.html`, not by this component:
    ```html
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    ```

## Edge Cases

- **No nav items**: The navigation landmark remains available for `actions`; its link list is empty.
- **No footer**: Footer is not rendered; main content area fills space.
- **No logoSrc**: The text title is the brand mark (the normal case).
- **Very many nav items**: Wraps to next line on mobile.
- **No actions**: Actions slot simply doesn't render.
- **Logo fails to load**: Add `onerror` fallback to show text brand mark.

## Traceability

- `data-component="AppShell"` on the shell root `<div>`.
- `data-component="Header"` on the `<header>`.
- Header navigation links: `data-header-nav-link="{item.href}"`.
- `data-component="Footer"` on the `<footer>`.

## Compiling usage example

<!-- docs-compile -->
```tsx
import { AppShell, Footer, Header, ThemeToggle } from "@codesweep-ai/ui";
export function Example() { return <AppShell><Header title="cs-tool" navItems={[{ label: "Runs", href: "/runs", group: "Workspace" }]} actions={<ThemeToggle />} /><main><h1>Runs</h1></main><Footer>cs-tool</Footer></AppShell>; }
```

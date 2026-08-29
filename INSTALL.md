# Installing @codesweep-ai/ui

`@codesweep-ai/ui` is an npm package of React components and the stylesheets
they need. At run time it needs React and nothing else. The heavier integrations
sit behind subpath exports, so you only pay for one by importing it. Read
[MANUAL.md](MANUAL.md) once it is installed.

## 1. Get it

```sh
npm install @codesweep-ai/ui react react-dom
```

The package is not on the registry yet. Until it is, pack a tarball from a
clone and install that instead. [CONTRIBUTING.md](CONTRIBUTING.md) has the
steps:

```sh
npm install /path/to/codesweep-ai-ui-<version>.tgz react react-dom
```

## 2. Prerequisites

This package needs Node 22.13 or newer, and React 18.3 or 19. React and
React DOM are peer dependencies, so your project installs them and ends up with
one copy of each.

Nothing else is required. The integrations behind the subpath exports declare
their own peer dependencies, and all of them are optional. A project that never
imports `./mermaid` never installs mermaid.

## 3. Load the stylesheets

The components carry no inline styles, so a project that skips this step renders
unstyled markup. Load the core sheet once, then one sheet per component you
render:

```ts
import "@codesweep-ai/ui/styles/core.css";
import "@codesweep-ai/ui/styles/components/app-shell.css";
import "@codesweep-ai/ui/styles/components/agent-status.css";
```

`core.css` carries the tokens, the reset and the global primitives. Every
component sheet is named after its component.

Four more sheets are there when you need them. `syntax.css` paints highlighted
code, `markdown-content.css` long-form Markdown, `print.css` printable pages,
and `utilities.css` holds the shared uppercase-label helper.

`styles/components.css` is an aggregate that loads every component at once. Use
it only where bundle size does not matter.

## 4. Apply the theme before React paints

Both themes ship, and the stored choice has to reach the page before it paints.
Otherwise the page renders in one theme and switches to the other a moment
later. `themeBootScript` returns the script that does it, and it goes inline in
the document head:

```ts
import { themeBootScript } from "@codesweep-ai/ui";

const script = themeBootScript({ storageKey: "tool-theme", urlParam: "theme" });
```

## 5. Verify the installation

Render one component and check that it comes out styled rather than as bare
markup:

```tsx
import { AgentStatus } from "@codesweep-ai/ui";

export function Check() {
  return <AgentStatus state="in-flight">Analysing the repository…</AgentStatus>;
}
```

You should see a row with a coloured activity indicator. Plain unstyled text
means step 3 has not run.

## Upgrading

The package follows semantic versioning, so a minor release adds components and
props without changing what is there. The stylesheets are versioned with the package, so
upgrade both together. A build from one version and a stylesheet from another
can expect different tokens.

[MANUAL.md](MANUAL.md) has what the package exports and how to restyle it.

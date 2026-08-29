# @codesweep-ai/ui

[![ci](https://github.com/codesweep-ai/ui/actions/workflows/ci.yml/badge.svg)](https://github.com/codesweep-ai/ui/actions/workflows/ci.yml)
[![license: Apache-2.0](https://img.shields.io/badge/license-Apache_2.0-blue.svg)](LICENSE)
![React](https://img.shields.io/badge/react-18%20%C2%B7%2019-informational)
![Themes](https://img.shields.io/badge/themes-light%20%C2%B7%20dark-lightgrey)

> **Unbranded React components for agent and LLM interfaces, on a documented design token system.**

An application that runs tools and streams model output has to show things an
ordinary component library does not cover. Work in flight, a trace of what an
agent did, text arriving a token at a time. `AgentStatus`, `AgentTrace`,
`StreamingText` and `PulseBadge` handle those.

The rest of the package covers what any application needs anyway, so a project
rarely has to combine this set with another. Buttons, forms, tables, trees,
modals, Markdown, code, charts and a full application shell all ship with it.

Every value a component renders resolves through a CSS custom property rather
than a literal, and every one of those properties is documented. The defaults
are deliberately unbranded, so there is no other product's identity to strip out
before the components look like yours.

## Quickstart

```sh
npm install @codesweep-ai/ui react react-dom
```

Load the core stylesheet and one sheet per component you render, then compose:

```tsx
import "@codesweep-ai/ui/styles/core.css";
import "@codesweep-ai/ui/styles/components/agent-status.css";
import "@codesweep-ai/ui/styles/components/streaming-text.css";

import { AgentStatus, StreamingText } from "@codesweep-ai/ui";

export function RunStatus() {
  return (
    <section>
      <AgentStatus state="in-flight">Analysing the repository…</AgentStatus>
      <StreamingText text="I found the affected call sites." done />
    </section>
  );
}
```

[INSTALL.md](INSTALL.md) has the rest: the prerequisites, which stylesheets a
project needs, and the boot script that applies a theme before React paints. To
look at the components before installing anything, start with the catalogue
app below.

## Seeing it run

A catalogue app renders every component, in both themes and in each of its
states, alongside the composition patterns. Clone the repository and start it:

```sh
npm install
npm run preview     # http://localhost:25177
```

That server reads the components from source, so an edit shows up without a
rebuild. There is a **Tokens** page rendering every scale as swatches, and a
**Palette Lab** panel that swaps candidate palettes live against real
components.

To build it as static files and serve those instead:

```sh
npm run preview:build     # writes preview/dist/
npm run preview:serve     # http://localhost:4173
```

`preview/dist/` is self-contained and uses relative asset paths, so it also
works from a domain root, from a sub-folder, or opened straight off the
filesystem.

## Finding a component

The package ships dozens of components and patterns.
[CATALOG.md](CATALOG.md) indexes them by intent, so search it for what you are
building rather than scanning a list. Each entry links to that component's
specification under [`components/`](components/), which holds its props, its
visual spec, and the DOM hooks it guarantees.

The catalogue also gives the order to decide in. Match an entry and compose it,
or extend the one that comes close. Add a new component only when nothing
fits.

## Themes and tokens

Light and dark both ship. `ThemeToggle` renders the control, `useTheme` reads
and sets the value, and `themeBootScript` applies the stored choice before the
page paints. [MANUAL.md](MANUAL.md) covers all three.

The tokens beneath both themes cover colour, space, radius, type and elevation.
Every one is a CSS custom property, and section 4 of
[DESIGN_SYSTEM_SPEC.md](DESIGN_SYSTEM_SPEC.md) lists them. A component
stylesheet reads tokens and never literal values, which `npm run check`
enforces.

## Docs

- [INSTALL.md](INSTALL.md) · getting the package, and the setup it needs once
- [MANUAL.md](MANUAL.md) · what the package exports, the entry points, theming and the DOM contract
- [CATALOG.md](CATALOG.md) · every component and pattern, indexed by intent
- [DESIGN_SYSTEM_SPEC.md](DESIGN_SYSTEM_SPEC.md) · the tokens, the architecture and the conventions
- [CONTRIBUTING.md](CONTRIBUTING.md) · working on the package
- [AGENTS.md](AGENTS.md) · where an agent looks first

## Contributing

Bug reports and pull requests are welcome.
[CONTRIBUTING.md](CONTRIBUTING.md) says how to work on the package, and applies
to coding agents as well as to people.

## License

[Apache-2.0](LICENSE).

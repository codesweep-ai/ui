# @codesweep-ai/ui

## Name

`@codesweep-ai/ui`: React components for agent and LLM interfaces, on a design
token system an application themes without forking a component.

## Synopsis

```ts
import { AgentStatus, AgentTrace, Header, Table } from "@codesweep-ai/ui";
import { MarkdownViewer } from "@codesweep-ai/ui/markdown";
import { CodeBlock } from "@codesweep-ai/ui/code";
import { ChartFrame } from "@codesweep-ai/ui/chart";

import "@codesweep-ai/ui/styles/core.css";
import "@codesweep-ai/ui/styles/components/<name>.css";
```

## Description

The package ships components, the stylesheets that paint them, and the tokens
those stylesheets read. Nothing renders a colour, a radius or a space of its
own. Every value resolves through a CSS custom property, which is what lets a
consumer restyle the whole set from one block of declarations.

The package holds two groups of component. A handful cover the states that recur
in agent and model-driven products: work in flight, a trace of what happened,
text arriving a token at a time. The rest cover what any application needs
anyway, so a project rarely has to combine this package with another.

Components hold no application state. They take props and call back, and your
application owns the data. That keeps them usable from any state library, and it
is why the props tables in `components/` are the whole contract.

## The component surface

Every component has a specification of its own under
[`components/`](components/), holding its props, its visual spec, and the DOM
hooks it guarantees. Those specifications are the reference, so read them
directly.

[CATALOG.md](CATALOG.md) indexes them by intent. Search it for what you are
building rather than reading the component list, and follow the entry to its
specification. [`patterns/`](patterns/) holds the compositions that recur, each
one naming the components it puts together.

To see a component rather than read about it, clone the repository and run
`npm run preview`. That catalogue renders every component in both themes and in
each of its states, and the README covers it.

## Entry points

The root entry carries what an ordinary application needs. Large integrations
sit behind subpath exports, so you only pay for one by importing it.

| Entry | Holds | Brings with it |
|---|---|---|
| `@codesweep-ai/ui` | Every component in the catalogue, the theme helpers, and the class-name helper | React only |
| `./markdown` | The Markdown renderer, GitHub-flavoured by default | `react-markdown`, `remark-gfm` |
| `./markdown/rich` | The same renderer with highlighting and maths wired up | `rehype-highlight`, `rehype-katex`, KaTeX |
| `./mermaid` | Mermaid diagram rendering | `mermaid` |
| `./code` | The syntax-highlighted code block | `highlight.js` |
| `./chart` | Chart frames, legends and tooltips | Recharts peers |
| `./minimap` | The Markdown minimap | Nothing beyond the root |
| `./testing` | Render-parity helpers for a consumer's own tests | Development only |

`./markdown` renders GitHub-flavoured Markdown and nothing more. Opt into
highlighting and maths through its `rehypePlugins` and `remarkPlugins` props,
and into Mermaid fences through `codeRenderers` plus the separate `./mermaid`
entry. That keeps Mermaid, KaTeX and highlight.js out of the bundle of a project
rendering plain Markdown.

[docs/testing.md](docs/testing.md) documents the `./testing` API.

## Styling

Every value a component renders comes from a CSS custom property, and section 4
of [DESIGN_SYSTEM_SPEC.md](DESIGN_SYSTEM_SPEC.md) lists all of them. A project
adds properties of its own alongside those, in a sheet loaded after the
package's:

```css
:root {
  /* the project's own tokens, added rather than replacing any */
  --color-package-root: #f5a623;
}
```

Then reach those tokens through `className` on the component you are styling.
Section 8 of the specification has the rule for what a project may add and what
it may not. Following it is what keeps an upgrade from undoing a theme.

## Theming

The theme is an attribute on the document element, and there are three modes:
system, light and dark. `ThemeToggle` renders the control, `useTheme`
reads and sets the value, and `themeBootScript` returns the inline script that
applies the stored choice before React paints. [INSTALL.md](INSTALL.md) step 4
shows where that script goes.

The choice persists under one storage key, `cs-theme` unless you pass
`storageKey`. A `?theme=light` or `?theme=dark` parameter wins for that one page
load, and is not stored.

## Chrome for tools built on this package

Every CodeSweep tool that renders a page with this package uses the same frame,
so a reader moving between tools sees one product family:

- `Header` takes a **text** `title`, the tool's command name, and no `logoSrc`.
  Brand marks live in a private brand layer rather than in a public tool.
- `ThemeToggle` sits in the header's `actions`.
- `Footer` carries one muted provenance line and nothing else:
  `<tool> v<version> · @codesweep-ai/ui v<version>`.

A tool that needs more than this has found a gap in the package. Open an issue
rather than hand-rolling a header.

## Rendering on a server

Components that hold state, run effects, take refs, or touch browser APIs carry
a `"use client"` directive, so a React Server Components application can import
them directly. The stylesheets are plain CSS and load anywhere.

## The DOM contract

Each component renders a root element carrying a `data-component` attribute, and
its specification lists the DOM hooks you can select on. Those hooks are public
API: a test or a stylesheet can rely on one, so changing it is a compatibility
change. Anything the specification does not list is internal.

## Notes for agents

[CATALOG.md](CATALOG.md) is the file to read first. `catalog.json` beside it
carries the same index as data: one record per component, with its intents, when
to use it, and the path to its specification. Search that rather than the source
tree.

Both files are generated from the frontmatter in `components/` and
`patterns/`, so an edit goes to the specification and `npm run catalog`
regenerates them.

Component props are typed, and `dist/` ships declarations, so a type error is
the fastest check that a composition is valid.

## Examples

Show what an agent is doing, and stream its answer:

```tsx
import { AgentStatus, StreamingText } from "@codesweep-ai/ui";

export function Run({ answer, done }: { answer: string; done: boolean }) {
  return (
    <>
      <AgentStatus state={done ? "settled" : "in-flight"}>
        {done ? "Finished" : "Analysing the repository…"}
      </AgentStatus>
      <StreamingText text={answer} done={done} />
    </>
  );
}
```

Render Markdown an agent produced, with highlighting and maths:

```tsx
import { MarkdownViewer } from "@codesweep-ai/ui/markdown/rich";

export function Answer({ markdown }: { markdown: string }) {
  return <MarkdownViewer content={markdown} />;
}
```

Give a tool the family's chrome:

```tsx
import type { ReactNode } from "react";
import { AppShell, Header, ThemeToggle } from "@codesweep-ai/ui";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <Header title="cs-myapp" actions={<ThemeToggle />} />
      {children}
    </AppShell>
  );
}
```

## See also

- [INSTALL.md](INSTALL.md) · getting the package, and the setup it needs once
- [CATALOG.md](CATALOG.md) · every component and pattern, indexed by intent
- [DESIGN_SYSTEM_SPEC.md](DESIGN_SYSTEM_SPEC.md) · the tokens, the architecture and the conventions
- [CONTRIBUTING.md](CONTRIBUTING.md) · working on the package

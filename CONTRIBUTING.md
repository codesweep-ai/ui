# Contributing

Bug reports and pull requests are welcome. These rules bind everyone, and a
change written with a coding agent is held to the same standard as one written
by hand.

File a bug or an idea as a GitHub issue on this repository. For a security
issue, use GitHub's private vulnerability reporting on this repository's
Security tab rather than opening a public issue.

## Submitting a change

For a fix that stands on its own, a pull request on its own is enough. For
anything that adds a component, changes a public prop, or moves a token, open an
issue first, so the design is settled before you write it.

1. Fork the repository, and create a branch off `main`.
2. Run `npm install`, then `npm run preview` to see the components. The preview
   imports the package source, so it is the quickest place to exercise a change.
3. Make the change, with its tests.
4. Run `npm run ci`, which is every gate CI runs.
5. Open a pull request against `main`, and say what the change does and why.

A reviewer asks what the user-visible problem was, why the API is shaped the way
it is, and whether a test fails without the change.

By opening a pull request you agree that your contribution ships under the
[Apache 2.0 licence](LICENSE) this project is released under.

## Before you push

One command:

```sh
npm run ci
```

That is every gate the CI workflow has, on this machine and in the order the
workflow takes them, so a green run here is a green run there. `npm run check`
is the faster subset to keep beside you while you work, and `npm run ci` is the
one that has to pass.

Nothing needs installing beyond `npm install`. One gate is the exception:
`npm run ci` checks the workflow files when `actionlint` is on the PATH, and
reports a skip when it is not. It compares the visual baseline when there is a
container runtime to render in, and reports a skip when there is not. Either way
the closing line names what did not run.

Two browser checks run inside the gate, each with a job of its own in the
workflow:

```sh
npm run preview:rich-check    # asserts the rich Markdown flavours render
npm run visual:compare        # pixels and axe against visual-baseline/
```

`preview:rich-check` reads the DOM rather than the pixels, so any Chrome
puppeteer can find will do. It fetches one through an install script, and npm
asks before running those, so `npx puppeteer browsers install chrome` is worth
having run once.

`visual:compare` renders in the Playwright image the installed `playwright`
version names, so it needs Docker or podman, and allows no more than a 0.1%
changed-pixel ratio. Fonts and Chromium both come from that image: the same
commit measures differently on two hosts, so a baseline is only comparable to a
run that rendered where it did. `visual:compare:host` skips the image and needs
you to name a browser in `CHROME_BIN`; its pixels answer no question the gate is
asking.

It compares the axe report as well as the pixels. A rule that matches more nodes
than the baseline fails the run, whether it sits under `violations` or under
`incomplete`, so neither total can drift up unnoticed.

When a visual change is intended and reviewed, `npm run visual:capture` records a
new baseline. Never run it to make a failing comparison pass.

## Design rules

- **Every value comes from a design token.** `lint:styles` fails on a hex colour
  or a pixel unit in a component sheet.
- **Every component keeps its `data-component` root attribute** and the DOM
  hooks its specification lists. `docs:compile` checks both.
- **A component holds no application state.** It takes props and calls back, so
  a consumer owns the data. Review holds this one.
- **Accessible native semantics survive.** Reach for the element that already
  carries the behaviour before a `div` and an ARIA role.
- **A component rendering a DOM element forwards its ref.** Files using state,
  effects, refs or browser APIs carry a top-level `"use client"`.

Section 4 of [DESIGN_SYSTEM_SPEC.md](DESIGN_SYSTEM_SPEC.md) has the tokens and
the reasoning behind them.

## Tests

Ship a test with your change. Component tests live beside the component under
`src/components/`, and they assert what a user can observe: what renders, what a
callback receives, and what the keyboard reaches.

Test what happens when it fails, not only when it works. A component's loading,
empty and error states are behaviour rather than decoration.

Never lower a size budget or regenerate a visual baseline to make a run green.
An intentional visual change needs both themes reviewed and the accessibility
report read.

## Changing a component

Four files move together:

1. `src/components/<Name>.tsx` carries the component and its tests.
2. `components/<Name>.md` specifies it, including the frontmatter and the props
   table.
3. The matching preview section or pattern demo.
4. `src/index.ts`, when the public export changes.

Run `npm run catalog` after editing frontmatter. `CATALOG.md` and `catalog.json`
are generated, and an edit to either by hand is undone by the next run.

## Trying your build elsewhere

To use your build inside another project, pack it and install the tarball:

```sh
npm pack     # writes codesweep-ai-ui-<version>.tgz
```

Reference the tarball with a `file:` specifier. npm does not enforce the
lockfile's integrity hash for a `file:` dependency. Check
`node_modules/@codesweep-ai/ui/dist/BUILD.json` afterwards, which records the
commit the package was built from.

## How the package is built

The library build uses Vite in preserved-module mode, because preserved modules
keep the heavy subpath exports isolated and the client boundaries inspectable.
A build script then restores the top-level `"use client"` directives, asks
TypeScript for declarations, and copies every public stylesheet into `dist/`.

Tests and `src/test` sit outside the entry graph, so they are never published.

## Commits

Keep it short. One idea per commit, and a message a reader takes in at a glance.
If a change will not fit one idea, split it.

**Subject**, always. Under 60 characters, capitalised, imperative, no trailing
period, completing *"If applied, this commit will …"*. Use no category prefix:
not `feat:`, not `fix(ui):`, not `[docs]`. The category is already in the diff.

**Body**, rarely. Most commits need none. Add one only when the subject leaves a
question a reader would otherwise open the diff to answer, and then answer that
question. A sentence or two does it. Wrap it at 72 columns.

```
Give meta its own neutral step
```

```
Forward every component's ref to its root element

A consumer measuring a component had to wrap it in a div, which broke the
grid layouts the component was written for.
```

Keep the `Co-Authored-By:` trailer when an agent wrote the change. Drop every
other trailer an agent harness appends: a link to a session or a transcript is
private to whoever ran it and dead to everyone else.

## Docs

A user-visible change lands in exactly one document. Every fact lives in one
place, and the others link to it.

| The change | Where it goes |
|---|---|
| A component's props, states or DOM hooks | `components/<Name>.md` |
| A new component or pattern | its own file, then `npm run catalog` |
| A token, or a convention every component follows | [DESIGN_SYSTEM_SPEC.md](DESIGN_SYSTEM_SPEC.md) |
| An export, an entry point, or how a consumer restyles | [MANUAL.md](MANUAL.md) |
| A prerequisite, or a step in getting the package | [INSTALL.md](INSTALL.md) |
| What the package is for | [README.md](README.md) |
| A convention a contributor follows | this file |

## Writing

`npm run check` runs `cs-lint prose` over the documents, and
`cs-lint prose --explain` prints every rule with the style guide it follows. What
follows is the part that is judgement rather than mechanics.

Write the sentence that carries the information and stop. Prefer a full stop to
a dash, and a comma to a parenthesis. Keep a sentence under 30 words; one that
runs longer is usually two.

Say what a thing does before saying what it is not. Name the measurement rather
than the impression: "16 of 56 marks are hollow" beats "quite a few". Where a
decision looks arbitrary, record what ruled out the alternative, because that is
the part a later reader cannot reconstruct.

Do not describe a component by naming the products that use it. Describe the
requirement it meets. A design system that knows its consumers by name leaks
them the moment it is published.

## AI-assisted contributions

An agent wrote most of this repository, and you are welcome to use one. The
standard is the same either way: you are responsible for what you submit.

Point your tool at [AGENTS.md](AGENTS.md), which routes it to the documents that
hold the conventions, and check three things before opening the pull request:

- You understand every line, and can answer a question about it without going
  back to the tool.
- You ran `npm run ci` and it passed.
- You cut what the tool added to fill space. A model pads a commit body to the
  shape it was shown, and writes comments that restate the code beside them.

Keep the `Co-Authored-By:` trailer, which is how the work is disclosed. An
unattended agent must not open pull requests or comment on this repository.

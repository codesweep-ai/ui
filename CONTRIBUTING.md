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

## The ledger

This repository keeps a ledger of open issues in `ledger/`. Read
[`ledger/AGENTS.md`](ledger/AGENTS.md) before you start work, and follow it as
you go. Records are JSON, `ledger.html` is generated from them, and the two
travel together in one commit.

A commit that touches `ledger/` needs `cs-ledger render && cs-ledger check` to
pass first. `npm run ledger` runs the check half.

`cs-ledger` is a Go binary from
[codesweep-ai/ledger](https://github.com/codesweep-ai/ledger) rather than a
dependency of this package. `npm run ci` does not gate on it, so a clone
without it still passes every other gate. CI does gate on it: the
`ledger check` job in `ci.yml` installs a pinned version and runs it.

That pin is not decoration. `check` compares the committed page against the
renderer that wrote it, so a newer binary reports a good page as stale. Moving
the pin means re-rendering `ledger.html` in the same commit.

## Before you push

One command:

```sh
npm run ci
```

That is every gate the CI workflow has, on this machine and in the order the
workflow takes them, so a green run here is a green run there. `npm run check`
is the faster subset to keep beside you while you work, and `npm run ci` is the
one that has to pass.

Nothing needs installing beyond `npm install`. Three gates are the exception,
and each reports a skip rather than a failure when its prerequisite is absent.
`npm run ci` checks the workflow files when `actionlint` is on the PATH. It
compares the visual baseline, and builds the site, when there is a container
runtime to run them in. Either way the closing line names what did not run.

The site build is the gate that runs where the failure would otherwise land.
`pages.yml` publishes on a push to `main` and runs nowhere else. Before this
gate existed, the first build of a change happened after the merge, and it
reported to whoever merged. That is how eleven Liquid braces once reached
`main`. The gate is one command:

```sh
npm run pages:build        # the site, in the image the pages workflow uses
```

It runs `actions/jekyll-build-pages`' own image, so the gem, the plugin set and
the Jekyll version are the ones that will build the real site. Like the visual
gate it wants a container runtime and nothing else: no Ruby on your machine, and
no `Gemfile` in the tree.

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
version names, so it needs Docker or podman, and allows no difference at all.
Runs in that image are deterministic to the pixel, so a capture that moved is a
change somebody made rather than noise to absorb. Fonts and Chromium both come
from that image: the same commit measures differently on two hosts, so a
baseline is only comparable to a run that rendered where it did. `visual:compare:host` skips the image and needs
you to name a browser in `CHROME_BIN`; its pixels answer no question the gate is
asking.

It compares the axe report as well as the pixels. A rule that matches more nodes
than the baseline fails the run, whether it sits under `violations` or under
`incomplete`, so neither total can drift up unnoticed.

When a visual change is intended and reviewed, `npm run visual:capture` records a
new baseline. Never run it to make a failing comparison pass.

Bumping the Playwright image fails every capture, because the browser that drew
the baseline is gone. That is the moment to re-record, and the reason the
comparison would rather say so than average the difference away.

The tag naming that image is mutable, so a vendor can rebuild it under the same
name and change the fonts inside. `visual:capture` records the digests it drew
in, in `visual-baseline/render-image.json`, and `visual:compare` checks them
before it renders. A rebuild then stops the run with a sentence naming the
cause, rather than failing all 104 captures with nothing in the diff to explain
it.

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

Ship a test with your change. Where a behaviour genuinely cannot be observed in
a test, say so in the pull request. Component tests live beside the component
under `src/components/`, and they assert what a user can observe: what renders,
what a callback receives, and what the keyboard reaches.

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
5. Any pattern that composes the component, under `patterns/`.

Run `npm run catalog` after editing frontmatter. `CATALOG.md` and `catalog.json`
are generated, and an edit to either by hand is undone by the next run.

**Look at the patterns.** They are the worked examples of how the components are
meant to be composed. A change that is right for a component on its own can
still be wrong in the pattern that uses it. Whether a pattern needs updating is a
judgement call, but looking is not: open the ones under `patterns/` that name the
component, and drive them in `npm run preview`.

The visual gate captures every pattern page, in both themes, with the trees
expanded, so a composition that breaks fails the run. It did not always. A `flex`
shorthand on Tree's label once passed 76 of 76 captures, and still pinned every
label in the flipped Explorer to the wrong edge of its row.

The gate is not a substitute for looking. It compares what the pages render, so
it says nothing about whether a pattern still teaches the right composition after
a component gains a prop.

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
period, completing *"If applied, this commit will …"*. Say what the change does
in plain English. The test: would this subject make sense to someone who has not
read the diff and does not know this codebase? Use no category prefix: not
`feat:`, not `fix(ui):`, not `[docs]`. The category is already in the diff.

**Body**, rarely. Most commits need none. Add one only when the subject leaves a
question a reader would otherwise open the diff to answer, and then answer that
question. A sentence or two does it. Wrap it at 72 columns.

Leave out how the work was scheduled, how you tested it, and what led you to it,
and stop once the question is answered. A second paragraph usually means the
message has turned into a report of the session. The reason a convention exists
belongs beside it in [DESIGN_SYSTEM_SPEC.md](DESIGN_SYSTEM_SPEC.md), and the
investigation that found it belongs in the pull request.

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

`cs-lint oss` checks the subject, the trailers and the body's length and
subject matter, and it runs in `npm run check` and in its own CI job. The wrap
is the one rule it does not carry, so `npm run lint:commits` checks that alone.
Both run in `npm run ci`.

To be told before the commit exists, which is the only moment the wrap is cheap
to fix, install the hook:

```sh
git config core.hooksPath scripts/hooks
```

The check starts from a baseline commit rather than the root. Twenty-nine
earlier bodies run a column or so over the wrap. The ledger cites sixty of those
commits by sha, so rewriting them to clean the history would dangle seventy-one
pieces of evidence for a character apiece.

## Trying the package before publishing it

Installing a tarball by path skips the export map, the `files` list and the
peer-dependency resolution, which is most of what a publish can get wrong.
`npm run registry:local` runs a registry on this machine, publishes to it, and
prints the address to browse:

```sh
npm run registry:local                      # start, publish, print the URL
node scripts/local-registry.mjs stop        # stop it again
```

It replaces the version it published last time, so it can be run after every
change. It reaches no registry but the one it started, apart from proxying the
dependencies a consumer would install. Set `CS_UI_REGISTRY_PORT` where 4873 is
already taken.

## Releasing

Every commit on main publishes to the `dev` channel on npm, versioned from the
commit itself. No tag is cut and `latest` does not move, so a dev build reaches
only someone who asks for it:

```sh
npm install --save-dev @codesweep-ai/ui@dev
```

A release is a tag. Bump the version in `package.json`, tag it `v<version>`, and
push the tag; `release.yml` runs the gate, publishes to `latest`, and opens a
GitHub release. Neither workflow stores a credential: each package names its
workflow as a trusted publisher.

## Docs

A user-visible change lands in exactly one document. Every fact lives in one
place, and the others link to it.

The changelog is the exception, and a deliberate one. A change that asks
something of a consumer is described where it belongs, and named again there.
A reader upgrading has no way to know which of forty documents moved.

| The change | Where it goes |
|---|---|
| A component's props, states or DOM hooks | `components/<Name>.md` |
| A new component or pattern | its own file, then `npm run catalog` |
| A token, or a convention every component follows | [DESIGN_SYSTEM_SPEC.md](DESIGN_SYSTEM_SPEC.md) |
| An export, an entry point, or how a consumer restyles | [MANUAL.md](MANUAL.md) |
| A prerequisite, or a step in getting the package | [INSTALL.md](INSTALL.md) |
| What the package is for | [README.md](README.md) |
| Anything a consumer upgrading has to act on | [CHANGELOG.md](CHANGELOG.md) |
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

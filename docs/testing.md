# Render parity testing

`@codesweep-ai/ui/testing` compares two fresh page renders without requiring a committed golden.
It captures a full-page screenshot and extracts visible text plus semantic DOM records as sorted
sets. Comparison reports additions and removals in both sets, then pixel-diffs the screenshots at a
configurable changed-pixel ratio.

The module is development-only. Install its optional tools in the application that owns the gate:

```sh
npm install --save-dev @codesweep-ai/ui puppeteer pixelmatch pngjs
```

The package does not install a command-line executable. Import the development-only subpath in the
application's test runner instead. The API exports `renderAndSnapshot`, `saveSnapshot`, `loadSnapshot`, and
`compareSnapshots` for gates that need to run interactions before capture or aggregate reports.
`renderAndSnapshot` accepts an async `prepare(page)` hook for deterministic interaction end-states.

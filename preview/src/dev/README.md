# Palette Lab (preview-only)

A standing tool for exploring brand/palette changes against the real components,
in both light and dark mode, without editing `tokens.css`.

**It never ships.** It lives under `preview/src/`, and the preview app is
excluded from the published package (`package.json` → `files` does not list
`preview/`). So consumers never receive it.

## How it works

`PaletteLab.tsx` renders a minimizable floater (bottom-right of the preview). It
overrides CSS custom properties at runtime via `documentElement.style`, scoped
to the active theme. Each axis has a **Current** option that applies no override
— so by default the preview shows exactly the tokens that ship.

All candidate colors live in [`palettes.json`](./palettes.json) (data, not code),
which keeps `PaletteLab.tsx` free of hardcoded hex (token-discipline lint stays
green).

## Where the options come from — none of them is an approved value

Every option carries a `note` explaining its provenance, shown as its tooltip in
the lab. There are exactly three kinds, and only the first has been reviewed:

- **Current** — what `tokens.css` ships today. Applies no override.
- **`(legacy)`** — values from before the colour review, kept so a change can be
  A/B'd against a plainer starting point. **None of them has ever shipped in this
  repo:** `tokens.css` has carried the reviewed values from its first commit.
- **Exploratory** (`Cool Mist`, `Charcoal #141a22`, `Slate #1b2430`) — candidates
  someone tried. **Unreviewed, with no provenance beyond this file.** Do not
  treat them as sanctioned; they are here to be looked at, not chosen.

Adding an option means adding a `note` as well.

## Changing the brand / palette

1. **Explore:** open the preview (`npm run preview`), use the lab to try options
   across light + dark.
2. **Add a candidate:** edit `palettes.json`. To add an option to an existing
   axis, append to that group's `options` (each option is `{ name, light, dark }`
   where `light`/`dark` map a token name → hex). To add a whole new axis, append
   a group `{ id, label, managed: ["--token", ...], default, options }` — list
   every token the axis controls in `managed` so it's cleared/re-applied cleanly.
3. **Make it real:** once you've picked values, bake them into
   `src/styles/tokens.css` (the actual shipped tokens) and cut a release. The lab
   only previews; it does not change what ships.

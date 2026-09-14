import assert from "node:assert/strict";
import test from "node:test";

import { separation, normalSeparation, lightnessChroma, contrast, pairsFor, worstPair,
  readPalettes, readSurfaces, check } from "./check-palette.mjs";

// The figures below come from an independent implementation of the same
// published maths. They are here so this one is held against something it did
// not produce: a colour check that agrees only with itself proves nothing.

test("reproduces separations an independent implementation measured", () => {
  // The two categorical slots that collapse: sky against fuchsia.
  assert.equal(separation("#6ab0d4", "#c489c9", "deutan").toFixed(1), "1.8");
  // Two greys, apart on lightness alone, which colour blindness leaves intact.
  assert.equal(separation("#6b7580", "#9ca3af", "deutan").toFixed(1), "15.6");
});

test("asks a regime for the pairs it can actually put together", () => {
  assert.equal(pairsFor(8, "adjacent").length, 7);
  assert.equal(pairsFor(8, "all").length, 28);
});

test("finds the worst pair, not merely a bad one", () => {
  const palette = ["#6f93c9", "#4fb3a6", "#6ab0d4", "#c489c9"];
  const worst = worstPair(palette, "all");

  // Protanopia, not deutan, is what finds this one: blue against fuchsia.
  assert.equal(worst.delta.toFixed(1), "1.0");
  assert.equal(worst.kind, "protan");
  assert.deepEqual([worst.a, worst.b].sort(), ["#6f93c9", "#c489c9"]);
});

test("reads both themes from the rules that declare them", () => {
  const css = [
    ":root {", "  --color-cat-1: #6f93c9;", "  --color-graph-1: #e85d90;", "}", "",
    ':root[data-theme="light"] {', "  --color-cat-1: #3f6491;", "  --color-graph-1: #f05f95;", "}",
  ].join("\n");

  const out = readPalettes(css);
  assert.deepEqual(out.dark.cat, ["#6f93c9"]);
  assert.deepEqual(out.light.graph, ["#f05f95"]);
});

test("fails a palette whose slots collapse, and names the pair", () => {
  const collapsing = Array.from({ length: 8 }, (_, i) => (i % 2 ? "#6ab0d4" : "#c489c9"));
  const palettes = {
    dark: { cat: collapsing, graph: collapsing },
    light: { cat: collapsing, graph: collapsing },
  };

  const { failures } = check(palettes, { dark: ["#0f1620", "#0b0f14"], light: ["#ffffff", "#f3f4f6"] });

  // Both palettes, both themes, so the collapse is reported four times over.
  assert.ok(failures.length >= 4, `expected at least 4 failures, got ${failures.length}`);
  assert.ok(failures.every((f) => /--color-(cat|graph)-\*/.test(f)));
  assert.ok(failures.some((f) => /#6ab0d4|#c489c9/.test(f)), "the colliding pair should be named");
});

// A chart sits on a card in one place and straight on the page in another. The
// light page is the darker surface, so a slot can clear 3:1 on the card and
// fail on the page. That is how the shipped ramp passed review and failed a
// reader, so the check reads both surfaces out of the stylesheet.
const TWO_SURFACES = [
  ":root {", "  --bg: #0b0f14;", "  --card: #0f1620;",
  "  --color-cat-1: #6f93c9;", "  --color-graph-1: #e85d90;", "}", "",
  ':root[data-theme="light"] {', "  --bg: #f3f4f6;", "  --card: #ffffff;",
  "  --color-cat-1: #3f6491;", "  --color-graph-1: #00a2c7;", "}",
].join("\n");

test("reads both surfaces of each theme from the stylesheet", () => {
  const s = readSurfaces(TWO_SURFACES);

  assert.deepEqual(s.dark, ["#0f1620", "#0b0f14"]);
  assert.deepEqual(s.light, ["#ffffff", "#f3f4f6"]);
});

test("measures contrast and the OKLCH pair the other checks read", () => {
  // #00a2c7 clears 3:1 on white and does not clear it on the light page.
  assert.ok(contrast("#00a2c7", "#ffffff") >= 3.0);
  assert.ok(contrast("#00a2c7", "#f3f4f6") < 3.0);
  assert.equal(normalSeparation("#6f93c9", "#4fb3a6").toFixed(1), "12.2");
  assert.ok(lightnessChroma("#6b7580").C < 0.1, "a grey is under the chroma floor");
});

test("fails a slot that clears the card and not the page", () => {
  const eight = (c) => Array.from({ length: 8 }, () => c);
  const palettes = {
    dark: { cat: eight("#6f93c9"), graph: eight("#e85d90") },
    light: { cat: eight("#3f6491"), graph: eight("#00a2c7") },
  };

  const { failures } = check(palettes, { dark: ["#0f1620", "#0b0f14"], light: ["#ffffff", "#f3f4f6"] });
  const contrastFailure = failures.find((f) => f.includes("#f3f4f6"));

  assert.ok(contrastFailure, "the page surface should be the one that fails");
  assert.match(contrastFailure, /2\.73/);
});

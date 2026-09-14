import assert from "node:assert/strict";
import test from "node:test";

import { separation, pairsFor, worstPair, readPalettes, check } from "./check-palette.mjs";

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

  const { failures } = check(palettes);
  assert.equal(failures.length, 4);
  assert.match(failures[0], /#6ab0d4|#c489c9/);
});

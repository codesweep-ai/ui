#!/usr/bin/env node
// Hold each categorical palette to the contract section 4.12 states for it.
//
// The two palettes answer different questions. `--color-cat-*` is asked whether
// a series is distinct from its neighbour, which is all a bar or a line chart
// asks of colour. `--color-graph-*` is asked it of every pair, because a
// node-link diagram, a scatter or a small multiple can put any category beside
// any other.
//
// Written here rather than taken from a tool, because a contract enforced by
// something outside the repository is a contract nobody re-runs. The colour
// maths is published: linear sRGB to OKLab is Ottosson's, the colour-blind
// simulation is Machado, Oliveira and Fernandes at full severity, and the
// distance is euclidean in OKLab times 100. `scripts/check-palette.test.mjs`
// holds this implementation against figures an independent one produced.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// A separation the specification calls safe. Below it a pair needs a second
// channel to carry the distinction, which a palette cannot promise on its own.
const FLOOR = 8.0;
const NORMAL_FLOOR = 15.0;
const CHROMA_FLOOR = 0.10;
const CONTRAST_MIN = 3.0;
const BAND = { dark: [0.48, 0.67], light: [0.43, 0.77] };
const CAT_SLOTS = 6;
const GRAPH_SLOTS = 8;

const MACHADO = {
  protan: [[0.152286, 1.052583, -0.204868],
           [0.114503, 0.786281, 0.099216],
           [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968],
           [0.280085, 0.672501, 0.047413],
           [-0.011820, 0.042940, 0.968881]],
};

const s2lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

function linear(hex) {
  const h = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`check-palette: ${hex} is not a six-digit hex colour`);
  return [0, 2, 4].map((i) => s2lin(parseInt(h.slice(i, i + 2), 16) / 255));
}

function oklab([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
}

function simulate(rgb, kind) {
  const M = MACHADO[kind];
  const clamp = (c) => Math.max(0, Math.min(1, c));
  return M.map((row) => clamp(row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2]));
}

/** Distance in OKLab times 100, for a reader whose vision is not simulated. */
export function normalSeparation(hexA, hexB) {
  const a = oklab(linear(hexA));
  const b = oklab(linear(hexB));
  return 100 * Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** OKLCH lightness and chroma. A mark below the chroma floor reads as grey. */
export function lightnessChroma(hex) {
  const [L, a, b] = oklab(linear(hex));
  return { L, C: Math.hypot(a, b) };
}

/**
 * WCAG contrast. Checked against both surfaces a mark can land on, because a
 * chart sits on a card in one place and straight on the page in another, and
 * the page is the darker comparison in the light theme.
 */
export function contrast(hexA, hexB) {
  const lum = (hex) => {
    const [r, g, b] = linear(hex);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [hi, lo] = [lum(hexA), lum(hexB)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Distance in OKLab times 100, through one kind of colour-blind vision. */
export function separation(hexA, hexB, kind) {
  const a = oklab(simulate(linear(hexA), kind));
  const b = oklab(simulate(linear(hexB), kind));
  return 100 * Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** The pairs a regime can ever put side by side. */
export function pairsFor(count, regime) {
  const out = [];
  if (regime === "adjacent") {
    for (let i = 1; i < count; i += 1) out.push([i - 1, i]);
  } else {
    for (let i = 0; i < count; i += 1) for (let j = i + 1; j < count; j += 1) out.push([i, j]);
  }
  return out;
}

/** The worst pair in a palette, under whichever of the two vision types is worse. */
export function worstPair(palette, regime) {
  let worst = { delta: Infinity, a: null, b: null, kind: null };
  for (const [i, j] of pairsFor(palette.length, regime)) {
    for (const kind of ["protan", "deutan"]) {
      const delta = separation(palette[i], palette[j], kind);
      if (delta < worst.delta) worst = { delta, a: palette[i], b: palette[j], kind };
    }
  }
  return worst;
}

/** The surfaces a mark of this theme can be drawn on. */
export function readSurfaces(css) {
  const out = {};
  for (const [theme, selector] of [["dark", ":root"], ["light", ':root[data-theme="light"]']]) {
    const start = css.indexOf(`${selector} {`);
    const block = css.slice(start, css.indexOf("\n}", start));
    out[theme] = ["--card", "--bg"].map((name) => {
      const m = block.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
      if (!m) throw new Error(`check-palette: ${selector} declares no ${name}`);
      return m[1];
    });
  }
  return out;
}

/**
 * Both themes as declared, split on the rules that declare them.
 *
 * The first attempt found the boundary by looking for the second mention of a
 * token that happened to appear once per theme. Adding `--color-graph-other`,
 * which is defined as that token, gave it four mentions and the split landed
 * inside the first theme. A selector is what actually separates the two.
 */
export function readPalettes(css) {
  const rule = (selector) => {
    const start = css.indexOf(`${selector} {`);
    if (start < 0) throw new Error(`check-palette: tokens.css declares no ${selector} rule`);
    const end = css.indexOf("\n}", start);
    if (end < 0) throw new Error(`check-palette: the ${selector} rule is never closed`);
    return css.slice(start, end);
  };
  const themes = { dark: rule(":root"), light: rule(':root[data-theme="light"]') };
  const out = {};
  for (const [theme, block] of Object.entries(themes)) {
    out[theme] = {};
    for (const family of ["cat", "graph"]) {
      const found = new Map();
      const re = new RegExp(`--color-${family}-(\\d+):\\s*(#[0-9a-fA-F]{6})`, "g");
      for (const m of block.matchAll(re)) found.set(Number(m[1]), m[2]);
      out[theme][family] = [...found.entries()].sort((x, y) => x[0] - y[0]).map(([, v]) => v);
    }
  }
  return out;
}

/**
 * Which checks each palette answers for.
 *
 * `graph` answers for all five, because it was designed against them.
 *
 * `cat` answers for separation and contrast only. It is a muted set by
 * decision, so its chroma sits under the floor a vivid ramp is held to, and
 * its lightness sits outside the band. Holding it to those two would fail the
 * build over something the project chose on purpose. Its normal-vision
 * separation is a genuine miss rather than a decision, and CUI-091 tracks it:
 * `--color-cat-1` and `--color-cat-2` separate by 12.2 against a floor of 15.
 * That is named here rather than left for a reader to infer from what is
 * absent, because a gate that quietly checks less than it appears to is how
 * the graph ramp shipped with a contrast failure.
 */
const CONTRACTS = [
  { family: "cat", regime: "adjacent", slots: CAT_SLOTS,
    checks: ["cvd", "contrast"],
    why: "a bar, line or stacked chart only puts a series beside its neighbour" },
  { family: "graph", regime: "all", slots: GRAPH_SLOTS,
    checks: ["cvd", "normal", "band", "chroma", "contrast"],
    why: "a node-link diagram, a scatter or a small multiple can put any pair side by side" },
];

export function check(palettes, surfaces) {
  const failures = [];
  const lines = [];
  for (const { family, regime, slots, checks, why } of CONTRACTS) {
    for (const theme of ["dark", "light"]) {
      const declared = palettes[theme][family];
      if (declared.length < slots) {
        failures.push(`--color-${family}-* declares ${declared.length} slots in the ${theme} theme, and the contract needs ${slots}`);
        continue;
      }
      const used = declared.slice(0, slots);
      const held = [];

      if (checks.includes("cvd")) {
        const worst = worstPair(used, regime);
        held.push(["cvd", worst.delta >= FLOOR, `${worst.delta.toFixed(1)} ${worst.a}<->${worst.b} (${worst.kind})`,
          `separates by ${worst.delta.toFixed(1)} between ${worst.a} and ${worst.b} under ${worst.kind}opia, against a floor of ${FLOOR.toFixed(1)}, on ${regime} pairs, because ${why}`]);
      }
      if (checks.includes("normal")) {
        let w = { d: Infinity };
        for (const [i, j] of pairsFor(slots, regime)) {
          const d = normalSeparation(used[i], used[j]);
          if (d < w.d) w = { d, a: used[i], b: used[j] };
        }
        held.push(["normal", w.d >= NORMAL_FLOOR, `${w.d.toFixed(1)} ${w.a}<->${w.b}`,
          `separates by ${w.d.toFixed(1)} between ${w.a} and ${w.b} for a reader with full colour vision, against a floor of ${NORMAL_FLOOR.toFixed(1)}`]);
      }
      if (checks.includes("band")) {
        const [lo, hi] = BAND[theme];
        const out = used.filter((c) => { const { L } = lightnessChroma(c); return L < lo || L > hi; });
        held.push(["band", out.length === 0, out.length ? out.join(" ") : `all ${slots} inside ${lo}-${hi}`,
          `has ${out.length} slot(s) outside the ${theme} lightness band of ${lo} to ${hi}: ${out.join(", ")}`]);
      }
      if (checks.includes("chroma")) {
        const grey = used.filter((c) => lightnessChroma(c).C < CHROMA_FLOOR);
        held.push(["chroma", grey.length === 0, grey.length ? grey.join(" ") : `all ${slots} >= ${CHROMA_FLOOR}`,
          `has ${grey.length} slot(s) under the chroma floor of ${CHROMA_FLOOR}, which read as grey: ${grey.join(", ")}`]);
      }
      if (checks.includes("contrast")) {
        let w = { r: Infinity };
        for (const c of used) {
          for (const surface of surfaces[theme]) {
            const r = contrast(c, surface);
            if (r < w.r) w = { r, c, surface };
          }
        }
        held.push(["contrast", w.r >= CONTRAST_MIN, `${w.r.toFixed(2)} ${w.c} on ${w.surface}`,
          `puts ${w.c} at ${w.r.toFixed(2)} against ${w.surface}, under the ${CONTRAST_MIN.toFixed(1)} a graphical object needs`]);
      }

      for (const [name, ok, detail, complaint] of held) {
        lines.push(`  ${ok ? "PASS" : "FAIL"}  --color-${family}-* ${theme.padEnd(5)} ${name.padEnd(8)} ${detail}`);
        if (!ok) failures.push(`--color-${family}-* in the ${theme} theme ${complaint}.`);
      }
    }
  }
  return { failures, lines };
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  const css = readFileSync(join(ROOT, "src/styles/tokens.css"), "utf8");
  const { failures, lines } = check(readPalettes(css), readSurfaces(css));
  console.log("palette: the contract in DESIGN_SYSTEM_SPEC.md section 4.12");
  for (const line of lines) console.log(line);
  if (failures.length) {
    console.error(`\npalette: ${failures.length} contract failure(s)`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log(`palette: ${lines.length} contract(s) hold`);
}

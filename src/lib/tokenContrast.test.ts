import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const tokensCss = readFileSync(resolve(process.cwd(), "src/styles/tokens.css"), "utf8");

function declarationsFor(selector: string) {
  const start = tokensCss.indexOf(`${selector} {`);
  const end = tokensCss.indexOf("\n}", start);

  if (start < 0 || end < 0) {
    throw new Error(`Unable to find ${selector} token declarations`);
  }

  return new Map<string, string>(
    Array.from(tokensCss.slice(start, end).matchAll(/(--[\w-]+):\s*([^;]+);/g), (match) => [
      match[1],
      match[2].trim(),
    ]),
  );
}

function rgb(hex: string) {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);

  if (!match) {
    throw new Error(`Expected a six-digit hex color, received ${hex}`);
  }

  return match.slice(1).map((channel) => Number.parseInt(channel, 16));
}

function relativeLuminance(hex: string) {
  return rgb(hex)
    .map((channel) => channel / 255)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    )
    .reduce((luminance, channel, index) => luminance + channel * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrastRatio(foreground: string, background: string) {
  const light = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const dark = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (light + 0.05) / (dark + 0.05);
}

const darkTokens = declarationsFor(":root");
const lightTokens = declarationsFor(':root[data-theme="light"]');
const lightValue = (token: string) => lightTokens.get(token) ?? darkTokens.get(token) ?? "";

describe("UI-09 light theme token contrast", () => {
  const foregroundTokens = ["--muted", "--color-accent", "--color-success", "--color-link"];
  const surfaceTokens = ["--bg", "--card"];

  it.each(foregroundTokens.flatMap((foreground) => surfaceTokens.map((surface) => [foreground, surface])))(
    "%s meets WCAG AA on %s",
    (foreground, surface) => {
      expect(contrastRatio(lightValue(foreground), lightValue(surface))).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("defines the info semantic color in both themes", () => {
    expect(darkTokens.get("--color-info")).toBe("#60a5fa");
    expect(lightTokens.get("--color-info")).toBe("#0369a1");
  });
});

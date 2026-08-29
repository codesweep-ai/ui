"use client";

const CURRENT_ACCENT = "--color-accent";

export function accentCustomProperty(suffix = ""): string {
  return `${CURRENT_ACCENT}${suffix}`;
}

export function accentToken(suffix = ""): string {
  return `var(${accentCustomProperty(suffix)})`;
}

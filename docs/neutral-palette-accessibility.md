# Neutral palette accessibility review

Re-measured 2026-08-22 with Chromium, Playwright, and axe-core in the preview app at a 1400×1000
viewport. The run covered the components page, tokens page, and all nine pattern tabs in both
`light` and `dark` themes.

```sh
npm run preview:build
CHROME_BIN=/usr/bin/chromium-browser node axe-preview.mjs
```

## Header contrast

| Foreground / background | Ratio |
| --- | ---: |
| header text / header | 17.18:1 |
| muted navigation / header | 9.04:1 |
| selected navigation text (`--color-header-text`) / accent tint over header | 10.49:1 dark · 14.12:1 light |
| text title (`--color-accent`) / header | 10.73:1 dark · 3.28:1 light (bold, `--font-size-lg`) |
| muted navigation / hover | 5.23:1 |
| hovered navigation text / `--color-nav-hover` | 10.37:1 |

Every normal-size neutral chrome pair exceeds WCAG AA's 4.5:1 requirement. The light text title is
20px bold and exceeds the 3:1 large-text requirement. Axe reported no header, footer, navigation,
or neutral-palette contrast violations in either theme.

## Light token contrast

The four text-capable semantic tokens meet the 4.5:1 normal-text requirement against both standard
light surfaces. Ratios use the WCAG relative-luminance formula and the shipped hex values.

| Token | Light value | On `--bg` (`#f3f4f6`) | On `--card` (`#ffffff`) |
| --- | --- | ---: | ---: |
| `--muted` | `#4b5563` | 6.8671:1 | 7.5574:1 |
| `--color-accent` | `#0f766e` | 4.9734:1 | 5.4733:1 |
| `--color-success` | `#047857` | 4.9831:1 | 5.4839:1 |
| `--color-link` | `#2563eb` | 4.6965:1 | 5.1686:1 |

`--color-info` is `#60a5fa` in dark mode and `#0369a1` in light mode. No token was removed.

## Full preview axe result

Counts are aggregated across all eleven preview targets. The non-contrast findings are the recorded
preview-demo baseline; this change does not expand into those later work packages.

| Theme | `color-contrast` | `select-name` | `button-name` | `label` |
| --- | ---: | ---: | ---: | ---: |
| light | 0 | 7 | 12 | 5 |
| dark | 0 | 7 | 12 | 5 |

All 22 target/theme loads completed without page errors. The nine former active-pattern-tab failures
were removed by using `--fg` text on the existing accent tint.

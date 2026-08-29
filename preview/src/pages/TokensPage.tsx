import { useState, useLayoutEffect } from "react";
import { Card, useTheme } from "@codesweep-ai/ui";
import {
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ArrowUpDown,
  FileText,
  Folder,
  GripVertical,
  Sun,
  Moon,
  Monitor,
  X,
  Copy,
  Check,
  Search,
  PanelLeftClose,
  Maximize2,
  Minimize2,
  ListTree,
  List,
  UnfoldVertical,
  FoldVertical,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const spacingTokens = [
  { name: "--space-0", value: "0", px: "0" },
  { name: "--space-1", value: "0.25rem", px: "4" },
  { name: "--space-2", value: "0.5rem", px: "8" },
  { name: "--space-3", value: "0.75rem", px: "12" },
  { name: "--space-4", value: "1rem", px: "16" },
  { name: "--space-5", value: "1.5rem", px: "24" },
  { name: "--space-6", value: "2rem", px: "32" },
];

const radiusTokens = [
  { name: "--radius-xs", value: "2px" },
  { name: "--radius-sm", value: "4px" },
  { name: "--radius-md", value: "6px" },
  { name: "--radius-lg", value: "8px" },
  { name: "--radius-xl", value: "12px" },
];

const typographyTokens = [
  { name: "--font-size-xs", value: "0.75rem", px: "12" },
  { name: "--font-size-sm", value: "0.875rem", px: "14" },
  { name: "--font-size-md", value: "1rem", px: "16" },
  { name: "--font-size-lg", value: "1.25rem", px: "20" },
  { name: "--font-size-xl", value: "1.5rem", px: "24" },
];

// Token NAMES only — actual values are read live from the stylesheet (in both
// themes) so this reference page can never drift from tokens.css and we never
// hardcode color literals here.
const brandColors = [
  "--color-accent",
  "--color-header-bg",
  "--color-header-text",
  "--color-header-text-muted",
  "--color-nav-hover",
];

const themeColors = [
  "--bg",
  "--fg",
  "--muted",
  "--card",
  "--color-link",
  "--color-error",
  "--color-info",
  "--color-success",
  "--color-warning",
  "--color-neutral",
];

const shadowTokens = ["--shadow-sm", "--shadow-md", "--shadow-lg", "--shadow-up"];

// Stable identity (module-level) so the dual-theme reader's effect runs once,
// not on every render — passing a fresh [...] inline would loop infinitely.
const colorTokenNames = [...brandColors, ...themeColors];

/**
 * Read each named custom property's computed value in BOTH themes by briefly
 * toggling `data-theme` on the root and restoring it — synchronously inside a
 * layout effect, so the browser never paints an intermediate state.
 */
function useDualThemeValues(names: string[]): Record<string, { dark: string; light: string }> {
  const [values, setValues] = useState<Record<string, { dark: string; light: string }>>({});
  useLayoutEffect(() => {
    const root = document.documentElement;
    const prev = root.getAttribute("data-theme");
    const readAll = (theme: string): Record<string, string> => {
      root.setAttribute("data-theme", theme);
      const cs = getComputedStyle(root);
      return names.reduce<Record<string, string>>((acc, n) => {
        acc[n] = cs.getPropertyValue(n).trim();
        return acc;
      }, {});
    };
    const dark = readAll("dark");
    const light = readAll("light");
    if (prev) root.setAttribute("data-theme", prev);
    else root.removeAttribute("data-theme");
    setValues(
      names.reduce<Record<string, { dark: string; light: string }>>((acc, n) => {
        acc[n] = { dark: dark[n] ?? "", light: light[n] ?? "" };
        return acc;
      }, {}),
    );
  }, [names]);
  return values;
}

const categoricalColors = [
  { name: "--color-cat-1", hue: "Blue" },
  { name: "--color-cat-2", hue: "Teal" },
  { name: "--color-cat-3", hue: "Amber" },
  { name: "--color-cat-4", hue: "Rose" },
  { name: "--color-cat-5", hue: "Violet" },
  { name: "--color-cat-6", hue: "Orange" },
  { name: "--color-cat-7", hue: "Emerald" },
  { name: "--color-cat-8", hue: "Fuchsia" },
  { name: "--color-cat-9", hue: "Sky" },
  { name: "--color-cat-10", hue: "Lime" },
];

const iconSizeTokens = [
  { name: "--icon-size-xs", value: "12px", context: "Section chevrons, fold/unfold" },
  { name: "--icon-size-sm", value: "14px", context: "Tree nodes, sort arrows, nav arrows" },
  { name: "--icon-size-md", value: "16px", context: "Close buttons, copy, search" },
  { name: "--icon-size-lg", value: "18px", context: "Theme toggle, modal close" },
];

interface IconEntry {
  icon: LucideIcon;
  name: string;
  usage: string;
  size: string;
}

const iconReference: { category: string; icons: IconEntry[] }[] = [
  {
    category: "Navigation",
    icons: [
      { icon: ChevronRight, name: "ChevronRight", usage: "Collapsed branch, next", size: "--icon-size-sm" },
      { icon: ChevronDown, name: "ChevronDown", usage: "Expanded branch, open section", size: "--icon-size-sm" },
      { icon: ChevronUp, name: "ChevronUp", usage: "Sort ascending", size: "--icon-size-sm" },
      { icon: ChevronLeft, name: "ChevronLeft", usage: "Prev page, flipped tree", size: "--icon-size-sm" },
      { icon: ArrowUpDown, name: "ArrowUpDown", usage: "Sortable column (unsorted)", size: "--icon-size-sm" },
    ],
  },
  {
    category: "Actions",
    icons: [
      { icon: X, name: "X", usage: "Close, dismiss, clear", size: "--icon-size-md" },
      { icon: Search, name: "Search", usage: "Search input trigger", size: "--icon-size-md" },
      { icon: Copy, name: "Copy", usage: "Copy to clipboard", size: "--icon-size-md" },
      { icon: Check, name: "Check", usage: "Copied confirmation", size: "--icon-size-md" },
      { icon: PanelLeftClose, name: "PanelLeftClose", usage: "Collapse side panel", size: "--icon-size-md" },
      { icon: Maximize2, name: "Maximize2", usage: "Maximize card", size: "--icon-size-sm" },
      { icon: Minimize2, name: "Minimize2", usage: "Restore card", size: "--icon-size-sm" },
    ],
  },
  {
    category: "Content",
    icons: [
      { icon: FileText, name: "FileText", usage: "File / leaf node", size: "--icon-size-sm" },
      { icon: Folder, name: "Folder", usage: "Folder / branch node", size: "--icon-size-sm" },
      { icon: GripVertical, name: "GripVertical", usage: "Drag handle", size: "--icon-size-sm" },
    ],
  },
  {
    category: "View Controls",
    icons: [
      { icon: Sun, name: "Sun", usage: "Light theme", size: "--icon-size-lg" },
      { icon: Moon, name: "Moon", usage: "Dark theme", size: "--icon-size-lg" },
      { icon: Monitor, name: "Monitor", usage: "System theme", size: "--icon-size-lg" },
      { icon: ListTree, name: "ListTree", usage: "Tree view mode", size: "--icon-size-xs" },
      { icon: List, name: "List", usage: "Flat list view mode", size: "--icon-size-xs" },
      { icon: UnfoldVertical, name: "UnfoldVertical", usage: "Expand all", size: "--icon-size-xs" },
      { icon: FoldVertical, name: "FoldVertical", usage: "Collapse all", size: "--icon-size-xs" },
    ],
  },
];

export function TokensPage() {
  const { resolved } = useTheme();
  const colorValues = useDualThemeValues(colorTokenNames);
  const valueFor = (name: string) => colorValues[name]?.[resolved] ?? "";
  return (
    <div className="cs-preview-pages-tokens-page-182 ">
      <h1 className="cs-preview-pages-tokens-page-183 ">Design Tokens</h1>

      {/* Spacing */}
      <Card header="Spacing">
        <div className="cs-preview-pages-tokens-page-185">
          {spacingTokens.map((t) => (
            <div key={t.name} className="cs-preview-pages-tokens-page-186 ">
              <code className="cs-preview-pages-tokens-page-187 ">
                {t.name}
              </code>
              <div
                className="cs-preview-pages-tokens-page-188 "
                style={{ width: `var(${t.name})`, minWidth: t.px === "0" ? "2px" : undefined }}
              />
              <span className="cs-preview-pages-tokens-page-193 ">
                {t.value} ({t.px}px)
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Border Radius */}
      <Card header="Border Radius">
        <div className="cs-preview-pages-tokens-page-195 ">
          {radiusTokens.map((t) => (
            <div key={t.name} className="cs-preview-pages-tokens-page-196 ">
              <div
                className="cs-preview-pages-tokens-page-197 "
                style={{ borderRadius: `var(${t.name})` }}
              />
              <code className="cs-preview-pages-tokens-page-200 ">
                {t.name}
              </code>
              <span className="cs-preview-pages-tokens-page-193 ">
                {t.value}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Typography */}
      <Card header="Typography">
        <div className="cs-preview-pages-tokens-page-202">
          {typographyTokens.map((t) => (
            <div key={t.name} className="cs-preview-pages-tokens-page-203 ">
              <code className="cs-preview-pages-tokens-page-204 ">
                {t.name}
              </code>
              <span style={{ fontSize: `var(${t.name})` }}>
                The quick brown fox ({t.px}px)
              </span>
            </div>
          ))}
          <div className="cs-preview-pages-tokens-page-207 ">
            <p className="cs-preview-pages-tokens-page-208 ">Font Stacks</p>
            <p style={{ fontFamily: "var(--font-family-sans)" }} className="cs-preview-pages-tokens-page-210">
              Sans: The quick brown fox jumps over the lazy dog
            </p>
            <p style={{ fontFamily: "var(--font-family-mono)" }}>
              Mono: The quick brown fox jumps over the lazy dog
            </p>
          </div>
        </div>
      </Card>

      {/* Icon Sizes */}
      <Card header="Icon Sizes">
        <div className="cs-preview-pages-tokens-page-202">
          <p className="cs-preview-pages-tokens-page-213 ">
            All icons use <code className="cs-preview-pages-tokens-page-214">lucide-react</code>. Size via CSS classes
            (e.g. <code className="cs-preview-pages-tokens-page-214">w-[var(--icon-size-md)] h-[var(--icon-size-md)]</code>),
            never the <code className="cs-preview-pages-tokens-page-214">size</code> prop.
          </p>
          <div className="cs-preview-pages-tokens-page-185">
            {iconSizeTokens.map((t) => (
              <div key={t.name} className="cs-preview-pages-tokens-page-186 ">
                <code className="cs-preview-pages-tokens-page-204 ">
                  {t.name}
                </code>
                <div
                  className="cs-preview-pages-tokens-page-215 "
                  style={{ width: t.value, height: t.value }}
                />
                <span className="cs-preview-pages-tokens-page-216 ">
                  {t.value}
                </span>
                <span className="cs-preview-pages-tokens-page-193 ">
                  {t.context}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Icon Reference */}
      <Card header="Icon Reference">
        <div className="cs-preview-pages-tokens-page-218">
          <p className="cs-preview-pages-tokens-page-213 ">
            Standard icons and their intended usage. Use these consistently across all components and patterns.
          </p>
          {iconReference.map((group) => (
            <div key={group.category}>
              <p className="cs-preview-pages-tokens-page-219 ">
                {group.category}
              </p>
              <div className="cs-preview-pages-tokens-page-220 ">
                {group.icons.map((entry) => {
                  const Icon = entry.icon;
                  return (
                    <div
                      key={entry.name}
                      className="cs-preview-pages-tokens-page-221 "
                    >
                      <div className="cs-preview-pages-tokens-page-222 ">
                        <Icon
                          style={{
                            width: `var(${entry.size})`,
                            height: `var(${entry.size})`,
                          }}
                          className="cs-preview-pages-tokens-page-227"
                        />
                      </div>
                      <div className="cs-preview-pages-tokens-page-228">
                        <code className="cs-preview-pages-tokens-page-229 ">
                          {entry.name}
                        </code>
                        <span className="cs-preview-pages-tokens-page-230 ">
                          {entry.usage}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Brand Colors */}
      <Card header="Brand Colors (Fixed)">
        <div className="cs-preview-pages-tokens-page-232 ">
          {brandColors.map((name) => (
            <div key={name} className="cs-preview-pages-tokens-page-196 ">
              <div
                className="cs-preview-pages-tokens-page-233 "
                style={{ backgroundColor: `var(${name})` }}
              />
              <code className="cs-preview-pages-tokens-page-236 ">
                {name}
              </code>
              <span className="cs-preview-pages-tokens-page-193 ">
                {valueFor(name)}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Categorical Palette */}
      <Card header="Categorical Palette">
        <div className="cs-preview-pages-tokens-page-202">
          <p className="cs-preview-pages-tokens-page-213 ">
            10 hues with 4 shades each (light, base, mid, dark) for charts, legends, and sub-category
            breakdowns. Theme-aware — colors adapt for readability on dark and light backgrounds.
          </p>
          <div className="cs-preview-pages-tokens-page-238 ">
            {categoricalColors.map((c, i) => (
              <div key={c.name} className="cs-preview-pages-tokens-page-239 ">
                <div className="cs-preview-pages-tokens-page-240 ">
                  {(["light", null, "mid", "dark"] as const).map((suffix) => {
                    const token = suffix ? `${c.name}-${suffix}` : c.name;
                    return (
                      <div
                        key={token}
                        className="cs-preview-pages-tokens-page-247 "
                        style={{ backgroundColor: `var(${token})` }}
                        title={token}
                      />
                    );
                  })}
                </div>
                <span className="cs-preview-pages-tokens-page-250 ">
                  {i + 1}
                </span>
                <code className="cs-preview-pages-tokens-page-200 ">
                  {c.hue}
                </code>
              </div>
            ))}
          </div>
          <div className="cs-preview-pages-tokens-page-251 ">
            <p className="cs-preview-pages-tokens-page-252 ">
              Base tokens <code className="cs-preview-pages-tokens-page-214">--color-cat-1</code> through{" "}
              <code className="cs-preview-pages-tokens-page-214">--color-cat-10</code> — append{" "}
              <code className="cs-preview-pages-tokens-page-214">-light</code>, <code className="cs-preview-pages-tokens-page-214">-mid</code>,{" "}
              <code className="cs-preview-pages-tokens-page-214">-dark</code> for shades
            </p>
            <p className="cs-preview-pages-tokens-page-256 ">
              Swatch order top→bottom: light, base, mid, dark
            </p>
            <div className="cs-preview-pages-tokens-page-257 ">
              {(["light", null, "mid", "dark"] as const).map((suffix) => (
                <div key={suffix ?? "base"} className="cs-preview-pages-tokens-page-262 ">
                  {categoricalColors.map((c) => {
                    const token = suffix ? `${c.name}-${suffix}` : c.name;
                    return (
                      <div
                        key={token}
                        className="cs-preview-pages-tokens-page-266 "
                        style={{ backgroundColor: `var(${token})` }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Theme-Aware Colors */}
      <Card header="Theme-Aware Colors">
        <div className="cs-preview-pages-tokens-page-270">
          <table className="cs-preview-pages-tokens-page-271 ">
            <thead>
              <tr>
                <th className="cs-preview-pages-tokens-page-272 ">Token</th>
                <th className="cs-preview-pages-tokens-page-272 ">Current</th>
                <th className="cs-preview-pages-tokens-page-272 ">Dark</th>
                <th className="cs-preview-pages-tokens-page-272 ">Light</th>
              </tr>
            </thead>
            <tbody>
              {themeColors.map((name) => {
                const dark = colorValues[name]?.dark ?? "";
                const light = colorValues[name]?.light ?? "";
                return (
                  <tr key={name} className="cs-preview-pages-tokens-page-275">
                    <td className="cs-preview-pages-tokens-page-276 ">
                      <code className="cs-preview-pages-tokens-page-277 ">{name}</code>
                    </td>
                    <td className="cs-preview-pages-tokens-page-276 ">
                      <div className="cs-preview-pages-tokens-page-278 ">
                        <span
                          className="cs-preview-pages-tokens-page-279 "
                          style={{ backgroundColor: `var(${name})` }}
                        />
                      </div>
                    </td>
                    <td className="cs-preview-pages-tokens-page-276 ">
                      <div className="cs-preview-pages-tokens-page-278 ">
                        <span
                          className="cs-preview-pages-tokens-page-279 "
                          style={{ backgroundColor: dark }}
                        />
                        <code className="cs-preview-pages-tokens-page-193 ">{dark}</code>
                      </div>
                    </td>
                    <td className="cs-preview-pages-tokens-page-276 ">
                      <div className="cs-preview-pages-tokens-page-278 ">
                        <span
                          className="cs-preview-pages-tokens-page-279 "
                          style={{ backgroundColor: light }}
                        />
                        <code className="cs-preview-pages-tokens-page-193 ">{light}</code>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Shadows */}
      <Card header="Shadows">
        <div className="cs-preview-pages-tokens-page-283 ">
          {shadowTokens.map((name) => (
            <div key={name} className="cs-preview-pages-tokens-page-284 ">
              <div
                className="cs-preview-pages-tokens-page-285 "
                style={{ boxShadow: `var(${name})` }}
              />
              <code className="cs-preview-pages-tokens-page-200 ">
                {name}
              </code>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

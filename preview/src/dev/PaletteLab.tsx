// Preview-only palette tool. The preview app is excluded from the published
// package (see package.json `files`), so this never reaches consumers — it's a
// standing aid for exploring palette tweaks against the real components.
// It overrides palette tokens at runtime via documentElement.style; the
// "Current" option in each group applies no override, so by default the preview
// shows exactly what ships. Candidate hex values live in palettes.json (data,
// not code) so this file stays token-clean.

import { useEffect, useState, useCallback } from "react";
import { Palette, Minus } from "lucide-react";
import config from "./palettes.json";

type Option = {
  name: string;
  light: Record<string, string>;
  dark: Record<string, string>;
  /** Where the values came from and whether they are sanctioned. Surfaced as
   *  the option's tooltip so nothing here reads as an approved value by
   *  default — every option is either what ships, a pre-colour-review baseline
   *  kept for A/B, or an unreviewed exploratory candidate. */
  note?: string;
};
type Group = {
  id: string;
  label: string;
  managed: string[];
  default: number;
  options: Option[];
};

const groups = (config as { groups: Group[] }).groups;
const storageKey = (id: string) => `palette-lab-${id}`;
const OPEN_KEY = "palette-lab-open";

function currentTheme(): "light" | "dark" {
  return document.documentElement.getAttribute("data-theme") === "light"
    ? "light"
    : "dark";
}

export function PaletteLab() {
  const [sel, setSel] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const g of groups) {
      const stored = Number(localStorage.getItem(storageKey(g.id)));
      init[g.id] =
        Number.isInteger(stored) && stored >= 0 && stored < g.options.length
          ? stored
          : g.default;
    }
    return init;
  });
  const [theme, setTheme] = useState<"light" | "dark">(currentTheme);
  const [open, setOpen] = useState<boolean>(
    () => localStorage.getItem(OPEN_KEY) !== "false",
  );

  const applyAll = useCallback(
    (selection: Record<string, number>, t: "light" | "dark") => {
      const root = document.documentElement;
      for (const g of groups) {
        const opt = g.options[selection[g.id]];
        const vals = t === "light" ? opt.light : opt.dark;
        for (const k of g.managed) {
          if (vals && vals[k]) root.style.setProperty(k, vals[k]);
          else root.style.removeProperty(k);
        }
      }
    },
    [],
  );

  useEffect(() => {
    applyAll(sel, theme);
    for (const g of groups) localStorage.setItem(storageKey(g.id), String(sel[g.id]));
  }, [sel, theme, applyAll]);

  useEffect(() => {
    localStorage.setItem(OPEN_KEY, String(open));
  }, [open]);

  useEffect(() => {
    const obs = new MutationObserver(() => setTheme(currentTheme()));
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => obs.disconnect();
  }, []);

  // Clear every managed override if this tool unmounts.
  useEffect(
    () => () => {
      const root = document.documentElement;
      for (const g of groups) for (const k of g.managed) root.style.removeProperty(k);
    },
    [],
  );

  const pick = (groupId: string, idx: number) =>
    setSel((s) => ({ ...s, [groupId]: idx }));

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open Palette Lab"
        className="cs-preview-dev-palette-lab-22 "
      >
        <Palette className="cs-preview-dev-palette-lab-23 " />
        Palette Lab
      </button>
    );
  }

  return (
    <aside aria-label="Palette Lab" className="cs-preview-dev-palette-lab-24 ">
      <div className="cs-preview-dev-palette-lab-25 ">
        <span className="text-label-upper">Palette Lab</span>
        <div className="cs-preview-dev-palette-lab-27 ">
          <span className="cs-preview-dev-palette-lab-28 ">
            {theme} mode
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Minimize Palette Lab"
            className="cs-preview-dev-palette-lab-31 "
          >
            <Minus className="cs-preview-dev-palette-lab-23 " />
          </button>
        </div>
      </div>

      <div className="cs-preview-dev-palette-lab-32 ">
        {groups.map((g) => (
          <div key={g.id}>
            <div className="cs-preview-dev-palette-lab-33 ">
              {g.label}
            </div>
            <div className="cs-preview-dev-palette-lab-34 ">
              {g.options.map((o, i) => (
                <button
                  key={o.name}
                  type="button"
                  onClick={() => pick(g.id, i)}
                  title={o.note}
                  className={
                    "cs-preview-dev-palette-lab-36 " +
                    (i === sel[g.id]
                      ? "cs-preview-dev-palette-lab-37 "
                      : "cs-preview-dev-palette-lab-38 ")
                  }
                >
                  {o.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="cs-preview-dev-palette-lab-39 ">
        Preview-only — not in the published package. Charts: Patterns → Chart / Dashboard.
      </div>
    </aside>
  );
}

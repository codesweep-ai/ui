"use client";

import { forwardRefToRoot } from "../lib/forwardRefToRoot";

import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "../lib/cn";
import { useTheme } from "../lib/useTheme";

interface ThemeToggleProps {
  variant?: "icon-cycle" | "radio-group";
  className?: string;
  /** localStorage key the mode persists under (default "cs-theme"). */
  storageKey?: string;
  /** Query parameter honoured for this load only (default "theme"); `false` disables it. */
  urlParam?: string | false;
}

function ThemeToggleImpl({
  variant = "icon-cycle",
  className,
  storageKey,
  urlParam,
}: ThemeToggleProps) {
  const { mode, resolved, setMode, cycle } = useTheme({ storageKey, urlParam });

  if (variant === "radio-group") {
    const options: { value: "light" | "dark" | "system"; label: string }[] = [
      { value: "light", label: "Light" },
      { value: "dark", label: "Dark" },
      {
        value: "system",
        label: `System (${resolved === "dark" ? "Dark" : "Light"})`,
      },
    ];

    return (
      <div
        data-component="ThemeToggle"
        role="radiogroup"
        aria-label="Theme"
        className={cn("cs-component-theme-toggle-24 ", className)}
      >
        {options.map((opt) => (
          <button
            key={opt.value}
            role="radio"
            aria-checked={mode === opt.value}
            onClick={() => setMode(opt.value)}
            className={cn(
              "cs-component-theme-toggle-26 ",
              mode === opt.value
                ? "cs-component-theme-toggle-27 "
                : "cs-component-theme-toggle-28 "
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  const Icon = mode === "light" ? Sun : mode === "dark" ? Moon : Monitor;

  return (
    <button
      data-component="ThemeToggle"
      onClick={cycle}
      className={cn(
        "cs-component-theme-toggle-32 ",
        "cs-component-theme-toggle-33 ",
        "cs-component-theme-toggle-34 ",
        "cs-component-theme-toggle-35 ",
        "cs-component-theme-toggle-36 ",
        "cs-component-theme-toggle-37 ",
        className
      )}
      aria-label={`Toggle theme. Current: ${mode}`}
      title={`Theme: ${mode}. Click to cycle.`}
    >
      <Icon className="cs-component-theme-toggle-42 " />
    </button>
  );
}

export const ThemeToggle = forwardRefToRoot<HTMLElement, ThemeToggleProps>(ThemeToggleImpl);

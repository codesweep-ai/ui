"use client";

import { useState, useEffect, useCallback } from "react";

type ThemeMode = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

export interface UseThemeOptions {
  /** localStorage key the chosen mode persists under. */
  storageKey?: string;
  /** Query parameter that overrides the mode for this load only (never saved); `false` disables it. */
  urlParam?: string | false;
}

const DEFAULT_STORAGE_KEY = "cs-theme";
const DEFAULT_URL_PARAM = "theme";

function isMode(v: string | null): v is ThemeMode {
  return v === "light" || v === "dark" || v === "system";
}

function readUrlMode(param: string | false): ThemeMode | null {
  if (!param || typeof window === "undefined") return null;
  try {
    const v = new URLSearchParams(window.location.search).get(param);
    return isMode(v) ? v : null;
  } catch {
    return null;
  }
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === "system") return getSystemTheme();
  return mode;
}

function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.setAttribute("data-theme", resolved);
}

function readStoredMode(storageKey: string): ThemeMode {
  try {
    const stored = localStorage.getItem(storageKey);
    if (isMode(stored)) return stored;
  } catch { /* localStorage may be unavailable */ }
  return "system";
}

/**
 * Return a synchronous, dependency-free boot script that applies the same
 * URL → stored mode → system preference resolution as `useTheme` before React
 * mounts. Insert the returned string in an inline script in the document head.
 */
export function themeBootScript(options: UseThemeOptions = {}): string {
  const storageKey = JSON.stringify(options.storageKey ?? DEFAULT_STORAGE_KEY).replace(/</g, "\\u003c");
  const urlParam = options.urlParam === false
    ? "null"
    : JSON.stringify(options.urlParam ?? DEFAULT_URL_PARAM).replace(/</g, "\\u003c");

  return `(()=>{const k=${storageKey},p=${urlParam},ok=v=>v==="light"||v==="dark"||v==="system";let m=null;if(p){try{const q=new URLSearchParams(location.search).get(p);if(ok(q))m=q}catch{}}if(!m){try{const s=localStorage.getItem(k);if(ok(s))m=s}catch{}}if(!m)m="system";const r=m==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):m;document.documentElement.setAttribute("data-theme",r)})();`;
}

export function useTheme(options: UseThemeOptions = {}) {
  const storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
  const urlParam = options.urlParam ?? DEFAULT_URL_PARAM;
  const [mode, setModeState] = useState<ThemeMode>(
    () => readUrlMode(urlParam) ?? readStoredMode(storageKey)
  );
  const resolved = resolveTheme(mode);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(storageKey, newMode);
    } catch { /* localStorage may be unavailable */ }
    applyTheme(resolveTheme(newMode));
  }, [storageKey]);

  const cycle = useCallback(() => {
    setMode(
      mode === "system" ? "light" : mode === "light" ? "dark" : "system"
    );
  }, [mode, setMode]);

  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (mode === "system") {
        applyTheme(getSystemTheme());
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  return { mode, resolved, setMode, cycle };
}

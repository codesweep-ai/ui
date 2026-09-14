"use client";

import { useEffect, useCallback, useSyncExternalStore } from "react";

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

type Listener = () => void;

interface ThemeStore {
  storageKey: string;
  mode: ThemeMode;
  /**
   * `${mode}|${resolved}` rather than an object, because `useSyncExternalStore`
   * compares snapshots by identity and a fresh object every call loops it. A
   * string also makes a system flip visible: `mode` alone does not change when
   * the operating system moves from light to dark under `mode: "system"`.
   */
  snapshot: string;
  listeners: Set<Listener>;
  /** False while nothing is mounted, so the next mount re-reads the store of record. */
  live: boolean;
  media?: MediaQueryList;
  onSystemChange?: () => void;
}

/**
 * One store per storage key, shared by every caller of `useTheme`.
 *
 * Each call used to hold its own `useState`, so a toggle and a chart each kept
 * a private copy of the mode and neither heard the other. The toggle wrote
 * `data-theme` and localStorage, and the chart's copy of `mode` never moved, so
 * the effect that re-reads the CSS variables never ran again and every mark
 * stayed in the theme it mounted in.
 */
const stores = new Map<string, ThemeStore>();

const SERVER_SNAPSHOT = `system|${"dark"}`;

function snapshotOf(mode: ThemeMode): string {
  return `${mode}|${resolveTheme(mode)}`;
}

function storeFor(storageKey: string): ThemeStore {
  let store = stores.get(storageKey);
  if (!store) {
    store = {
      storageKey,
      mode: "system",
      snapshot: SERVER_SNAPSHOT,
      listeners: new Set(),
      live: false,
    };
    stores.set(storageKey, store);
  }
  return store;
}

function publish(store: ThemeStore, mode: ThemeMode): void {
  store.mode = mode;
  const next = snapshotOf(mode);
  if (next === store.snapshot) return;
  store.snapshot = next;
  for (const listener of [...store.listeners]) listener();
}

/**
 * Read the store of record once, when the first caller arrives.
 *
 * Deferred to the first read rather than done when the store is created,
 * because a module-level value read at import time is fixed before a consumer
 * can write one. Dropped again when the last caller leaves, so a later mount
 * asks again instead of answering from a session that has ended.
 */
function adopt(store: ThemeStore, urlParam: string | false): void {
  if (store.live) return;
  store.live = true;
  const mode = readUrlMode(urlParam) ?? readStoredMode(store.storageKey);
  store.mode = mode;
  store.snapshot = snapshotOf(mode);
}

function watchSystem(store: ThemeStore): void {
  if (store.media || typeof window === "undefined") return;
  store.media = window.matchMedia("(prefers-color-scheme: dark)");
  store.onSystemChange = () => {
    // Only `system` follows the operating system. An explicit choice outranks it.
    if (store.mode === "system") publish(store, "system");
  };
  store.media.addEventListener("change", store.onSystemChange);
}

function unwatchSystem(store: ThemeStore): void {
  if (store.media && store.onSystemChange) {
    store.media.removeEventListener("change", store.onSystemChange);
  }
  store.media = undefined;
  store.onSystemChange = undefined;
}

function setStoreMode(store: ThemeStore, mode: ThemeMode): void {
  try {
    localStorage.setItem(store.storageKey, mode);
  } catch { /* localStorage may be unavailable */ }
  applyTheme(resolveTheme(mode));
  publish(store, mode);
}

export function useTheme(options: UseThemeOptions = {}) {
  const storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
  const urlParam = options.urlParam ?? DEFAULT_URL_PARAM;
  const store = storeFor(storageKey);

  const subscribe = useCallback((listener: Listener) => {
    adopt(store, urlParam);
    watchSystem(store);
    store.listeners.add(listener);
    return () => {
      store.listeners.delete(listener);
      if (store.listeners.size === 0) {
        unwatchSystem(store);
        store.live = false;
      }
    };
  }, [store, urlParam]);

  const getSnapshot = useCallback(() => {
    // Read during render, before `subscribe` runs, so the first paint already
    // carries the stored mode rather than a default it corrects a tick later.
    adopt(store, urlParam);
    return store.snapshot;
  }, [store, urlParam]);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);
  const separator = snapshot.indexOf("|");
  const mode = snapshot.slice(0, separator) as ThemeMode;
  const resolved = snapshot.slice(separator + 1) as ResolvedTheme;

  const setMode = useCallback(
    (newMode: ThemeMode) => setStoreMode(store, newMode),
    [store],
  );

  const cycle = useCallback(() => {
    const current = store.mode;
    setStoreMode(store, current === "system" ? "light" : current === "light" ? "dark" : "system");
  }, [store]);

  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  return { mode, resolved, setMode, cycle };
}

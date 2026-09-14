"use client";

import { useEffect, useCallback, useSyncExternalStore } from "react";

type ThemeMode = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

/**
 * Options for `useTheme`.
 *
 * `storageKey` is also the identity of the theme: every caller that names one
 * key shares one mode, deliberately, because that mode is written to one
 * `data-theme` attribute and persisted under one key. `urlParam` is therefore
 * resolved once per load, by the first caller of that key to mount, and that
 * reading stands for every caller of the key until the last one unmounts.
 *
 * Callers of one key that disagree about `urlParam` are a misconfiguration
 * rather than a supported arrangement: one page cannot be both themes, so the
 * disagreement cannot be honoured. It is warned about in development instead
 * of being settled in silence. Callers that really want different themes want
 * different `storageKey`s.
 */
export interface UseThemeOptions {
  /** localStorage key the chosen mode persists under, and the identity of the shared theme. */
  storageKey?: string;
  /**
   * Query parameter that overrides the mode for this load only (never saved);
   * `false` disables it. Resolved once per storage key per load, as above.
   */
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
  /** The `urlParam` the live adoption read the URL with. Undefined while nothing is mounted. */
  urlParam?: string | false;
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

// What a render on the server sees. It cannot read the URL, storage or the
// operating system, so it answers with the mode that asks for none of them.
// `resolved` is arbitrary here and only stands in until the client adopts.
const SERVER_SNAPSHOT = "system|dark";

function snapshotOf(mode: ThemeMode): string {
  return `${mode}|${resolveTheme(mode)}`;
}

// Called during render, and the one thing here that a render may leave behind:
// an empty store with no listeners, not live, holding the server snapshot. It
// is a cache entry rather than a decision, so a render React discards leaves
// nothing that a later mount would answer from.
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

/** What the store of record asks for right now. A read, and nothing else. */
function initialMode(storageKey: string, urlParam: string | false): ThemeMode {
  return readUrlMode(urlParam) ?? readStoredMode(storageKey);
}

const warnedConflicts = new Set<string>();

/**
 * Say so when two callers of one storage key disagree about `urlParam`.
 *
 * One storage key is one theme: one `data-theme` attribute, one persisted
 * value, one answer for every caller. A caller that honours `?theme=` and a
 * caller that does not therefore cannot both be served, and the first to mount
 * settles it for the load. Each call used to hold its own options privately,
 * so this is a real change, and settling it in silence is what made it a trap:
 * the same page answers differently depending on which component mounted first.
 *
 * Guarded the way `stylesheetWarning` is, and for its reason: `NODE_ENV` is
 * replaced by the consumer's own bundler, so the check survives into their
 * development build, where `import.meta.env.DEV` would be replaced when this
 * package is built and warn nobody.
 */
function warnOnUrlParamConflict(store: ThemeStore, urlParam: string | false): void {
  if (typeof process !== "undefined" && process.env.NODE_ENV === "production") return;
  if (store.urlParam === undefined || store.urlParam === urlParam) return;

  const seen = `${store.storageKey}:${String(store.urlParam)}:${String(urlParam)}`;
  if (warnedConflicts.has(seen)) return;
  warnedConflicts.add(seen);
  console.warn(
    `[@codesweep-ai/ui] useTheme(${JSON.stringify(store.storageKey)}) is mounted with ` +
      `urlParam: ${JSON.stringify(store.urlParam)} and urlParam: ${JSON.stringify(urlParam)} ` +
      "at once. One storage key is one shared theme, so the URL parameter is read once " +
      "per load by the first caller to mount and that reading stands for every caller of " +
      "the key. Pass the same urlParam to all of them, or give them different storageKeys.",
  );
}

/**
 * Read the store of record once, when the first caller subscribes.
 *
 * Deferred to the first subscription rather than done when the store is
 * created, because a module-level value read at import time is fixed before a
 * consumer can write one. Dropped again when the last caller leaves, so a
 * later mount asks again instead of answering from a session that has ended.
 *
 * Here rather than in `getSnapshot`, because this writes. React may call
 * `getSnapshot` during a render it then throws away, and adopting there left
 * the store live with a mode read for a render that never committed — and with
 * nothing subscribed, nothing would ever drop it again.
 */
function adopt(store: ThemeStore, urlParam: string | false): void {
  if (store.live) {
    warnOnUrlParamConflict(store, urlParam);
    return;
  }
  store.live = true;
  store.urlParam = urlParam;
  const mode = initialMode(store.storageKey, urlParam);
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
        store.urlParam = undefined;
      }
    };
  }, [store, urlParam]);

  const getSnapshot = useCallback(() => {
    // A read, and never a write. `useSyncExternalStore` may call this during a
    // render React throws away, so adopting here left the store live with a
    // mode read for a render that never committed, which nothing would ever
    // drop because nothing subscribed. Until something has adopted, answer
    // what adoption is about to produce, so the first paint still carries the
    // stored mode rather than a default it corrects a tick later; `subscribe`
    // then adopts that same value and the answer does not move.
    if (store.live) return store.snapshot;
    return snapshotOf(initialMode(store.storageKey, urlParam));
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
    // From the store rather than from `resolved`. A hydrating render is handed
    // the server snapshot, whose resolved theme is a placeholder, and writing
    // that to the root element would paint over what `themeBootScript` had
    // already set correctly before React mounted. By the time effects run the
    // store has adopted, because `useSyncExternalStore` subscribes from an
    // earlier hook position than this.
    applyTheme(resolveTheme(store.mode));
  }, [resolved, store]);

  return { mode, resolved, setMode, cycle };
}

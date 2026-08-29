import pkg from "../../package.json";
import { useState, useCallback, useEffect, useRef } from "react";
import { AppShell, Header, Footer, ThemeToggle } from "@codesweep-ai/ui";
import { TokensPage } from "./pages/TokensPage";
import { ComponentsPage } from "./pages/ComponentsPage";
import { PatternsPage } from "./pages/PatternsPage";
import { DocsPage } from "./pages/DocsPage";
import { PaletteLab } from "./dev/PaletteLab"; // preview-only brand/palette tool (not shipped — see preview/src/dev/README.md)

type Page = "tokens" | "components" | "patterns" | "docs";

const validPages: Page[] = ["components", "tokens", "patterns", "docs"];

function readPageFromURL(): Page {
  const url = new URL(window.location.href);
  const p = url.searchParams.get("page");
  const page: Page = p && validPages.includes(p as Page) ? (p as Page) : "components";
  // Clean stale tab param on initial load for non-patterns pages
  if (page !== "patterns" && url.searchParams.has("tab")) {
    url.searchParams.delete("tab");
    window.history.replaceState({}, "", url.toString());
  }
  return page;
}

export default function App() {
  const [page, setPageState] = useState<Page>(readPageFromURL);

  const setPage = useCallback((p: Page) => {
    setPageState(p);
    const url = new URL(window.location.href);
    url.searchParams.set("page", p);
    if (p !== "patterns") {
      url.searchParams.delete("tab");
    }
    url.hash = "";
    window.history.replaceState({}, "", url.toString());
  }, []);

  const navItems = (["components", "tokens", "patterns", "docs"] as const).map((p) => ({
    label: p.charAt(0).toUpperCase() + p.slice(1),
    href: `?page=${p}`,
    active: page === p,
    onClick: () => setPage(p),
  }));

  // Press "t" to jump the scroll container back to top (ignored while typing).
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "t" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      mainRef.current?.scrollTo({ top: 0 });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <AppShell>
      <Header
        title="@codesweep-ai/ui"
        // Explicit now that the default is null. "?" reloads this same page
        // with the ?page= query dropped, which is the Components landing view.
        titleHref="?"
        navItems={navItems}
        actions={<ThemeToggle />}
      />
      <main ref={mainRef} tabIndex={0} className="cs-preview-app-37 ">
        {page === "tokens" ? (
          <TokensPage />
        ) : page === "patterns" ? (
          <PatternsPage />
        ) : page === "docs" ? (
          <DocsPage />
        ) : (
          <ComponentsPage />
        )}
      </main>
      <Footer>@codesweep-ai/ui v{pkg.version} · preview</Footer>
      <PaletteLab /> {/* preview-only brand/palette tool — not in the published package */}
    </AppShell>
  );
}

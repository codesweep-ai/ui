import { useCallback, useEffect, useState } from "react";
import { RadioGroup } from "@codesweep-ai/ui";
import { markdownFlavors, subpathSizes } from "../../markdownFlavors";
import { flavorSampleDoc } from "../../data/flavorSample";

const bytes = (n: number) => `${n.toLocaleString()} B`;

const DEFAULT_SLUG = markdownFlavors[0].slug;

/**
 * `?flavor=<slug>` selects the rung. `preview:rich-check` navigates by it to
 * assert highlighting and diagrams on the flavors that provide them, so the
 * parameter is a contract — see `scripts/preview-rich-check.mjs` before
 * renaming a slug.
 */
function readFlavorFromURL(): string {
  const requested = new URL(window.location.href).searchParams.get("flavor");
  return markdownFlavors.some((f) => f.slug === requested) ? requested! : DEFAULT_SLUG;
}

/**
 * The markdown ladder: one document, six flavors, one rendered at a time.
 *
 * Showing all six at once meant six capped viewers, each with its own scrollbar
 * inside a scrolling card inside a scrolling page — thirteen scroll containers,
 * and no way to tell the options apart. The rail keeps every option and its cost
 * permanently visible, which is the comparison that mattered, while one flavor
 * renders at full height.
 *
 * **Only the selected flavor is mounted.** Hiding the others with CSS would
 * leave their markup in the DOM, where a gate asserting on a selector would pass
 * while a reader saw nothing.
 */
export function MarkdownFlavors() {
  const [slug, setSlug] = useState<string>(readFlavorFromURL);

  // Keep the URL shareable, and follow back/forward.
  useEffect(() => {
    const onPop = () => setSlug(readFlavorFromURL());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const select = useCallback((next: string) => {
    setSlug(next);
    const url = new URL(window.location.href);
    url.searchParams.set("flavor", next);
    window.history.replaceState({}, "", url.toString());
  }, []);

  const flavor = markdownFlavors.find((f) => f.slug === slug) ?? markdownFlavors[0];
  const size = subpathSizes[flavor.entry];
  const { Viewer } = flavor;

  return (
    <div className="cs-preview-flavors">
      <p className="cs-preview-flavors-lede">
        One document, every flavor. <strong>Pick the highest row you actually need</strong> — most
        surfaces never leave the default. Sizes are the shipped entry cost, written by{" "}
        <code>npm run size:subpaths</code>, not typed here.
      </p>

      <div className="cs-preview-flavors-layout">
        <RadioGroup
          aria-label="Markdown flavor"
          className="cs-preview-flavors-rail"
          value={flavor.slug}
          onChange={select}
          options={markdownFlavors.map((option) => ({
            value: option.slug,
            label: option.railLabel,
            description: `${bytes(subpathSizes[option.entry].raw)} raw`,
          }))}
        />

        <section className="cs-preview-flavors-panel" aria-label={`${flavor.title} example`}>
          <div className="cs-preview-flavors-meta">
            <pre className="cs-preview-flavors-import">
              <code>{flavor.importLine}</code>
            </pre>
            {flavor.extras && (
              <pre className="cs-preview-flavors-import">
                <code>{`<MarkdownViewer ${flavor.extras} />`}</code>
              </pre>
            )}
            <p className="cs-preview-flavors-size">
              <strong>{bytes(size.raw)}</strong> raw · {bytes(size.gzip)} gzip
              {flavor.addsNote ? ` — ${flavor.addsNote}` : ""}
            </p>
            <p className="cs-preview-flavors-use">{flavor.useWhen}</p>
          </div>
          <div className="cs-preview-flavors-render">
            <Viewer {...flavor.props} content={flavorSampleDoc} inline />
          </div>
        </section>
      </div>
    </div>
  );
}

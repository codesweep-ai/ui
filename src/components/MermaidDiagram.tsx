"use client";

import { useEffect, useRef, useState, useId, memo } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "../lib/cn";
import { forwardRefToRoot } from "../lib/forwardRefToRoot";

interface MermaidDiagramProps {
  chart: string;
  /** Apply the CodeSweep hand-drawn "sketch" styling to Mermaid's output. */
  sketch?: boolean;
  /** With `sketch`, use the handwriting font (Caveat) for node labels. */
  sketchHandwriting?: boolean;
  className?: string;
}

type MermaidError = {
  kind: "missing-dependency" | "invalid-chart" | "render";
  message: string;
};

type MermaidApi = (typeof import("mermaid"))["default"];

async function loadMermaidApi(): Promise<MermaidApi | null> {
  try {
    const candidate = (await import("mermaid")).default as
      | Partial<MermaidApi>
      | null
      | undefined;
    if (
      !candidate ||
      typeof candidate.initialize !== "function" ||
      typeof candidate.render !== "function"
    ) {
      return null;
    }
    return candidate as MermaidApi;
  } catch {
    return null;
  }
}

function getCurrentTheme(): "default" | "dark" {
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "default";
}

/**
 * Post-process a rendered Mermaid SVG into the hand-drawn sketch motif:
 * a subtle turbulence-displacement jitter on the strokes + brand-accent
 * recolor. Colors are set as inline `var(--token)` styles so they resolve from
 * the cascade and follow theme. Idempotent per render.
 */
function applySketch(root: HTMLElement, uid: string, handwriting: boolean) {
  const svgEl = root.querySelector("svg");
  if (!svgEl) return;
  const ns = "http://www.w3.org/2000/svg";
  const filterId = `sketch-${uid}`;

  let defs = svgEl.querySelector("defs");
  if (!defs) {
    defs = document.createElementNS(ns, "defs");
    svgEl.insertBefore(defs, svgEl.firstChild);
  }
  if (!defs.querySelector(`#${filterId}`)) {
    const filter = document.createElementNS(ns, "filter");
    filter.setAttribute("id", filterId);
    filter.setAttribute("x", "-10%");
    filter.setAttribute("y", "-10%");
    filter.setAttribute("width", "120%");
    filter.setAttribute("height", "120%");
    const turb = document.createElementNS(ns, "feTurbulence");
    turb.setAttribute("type", "fractalNoise");
    turb.setAttribute("baseFrequency", "0.02");
    turb.setAttribute("numOctaves", "2");
    turb.setAttribute("result", "noise");
    const disp = document.createElementNS(ns, "feDisplacementMap");
    disp.setAttribute("in", "SourceGraphic");
    disp.setAttribute("in2", "noise");
    disp.setAttribute("scale", "2");
    filter.appendChild(turb);
    filter.appendChild(disp);
    defs.appendChild(filter);
  }

  svgEl.querySelectorAll("rect, circle, ellipse, polygon, path, line").forEach((node) => {
    const el = node as SVGElement;
    const tag = el.tagName.toLowerCase();
    el.style.stroke = "var(--color-accent)";
    el.style.strokeWidth = "1.5";
    el.style.filter = `url(#${filterId})`;
    if (tag !== "path" && tag !== "line") {
      el.style.fill = "var(--color-accent-bg)"; // faint accent tint on node shapes
    }
  });

  svgEl.querySelectorAll("text, .nodeLabel, .edgeLabel").forEach((node) => {
    (node as SVGElement).style.fontFamily = handwriting
      ? "cursive"
      : "var(--font-family-mono)";
  });
}

function MermaidDiagramImpl({
  chart,
  sketch = false,
  sketchHandwriting = false,
  className,
}: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bindFnRef = useRef<((element: Element) => void) | undefined>(undefined);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<MermaidError | null>(null);
  const uniqueId = useId().replace(/:/g, "-");

  useEffect(() => {
    let cancelled = false;

    const renderDiagram = async () => {
      if (!chart.trim()) {
        setError({ kind: "invalid-chart", message: "Empty diagram" });
        return;
      }

      try {
        const mermaidApi = await loadMermaidApi();
        if (cancelled) return;
        if (!mermaidApi) {
          setError({
            kind: "missing-dependency",
            message:
              'Mermaid is unavailable. Install the optional "mermaid" peer dependency.',
          });
          setSvg("");
          return;
        }

        mermaidApi.initialize({
          startOnLoad: false,
          theme: getCurrentTheme(),
          securityLevel: "strict",
          htmlLabels: false,
        });

        const id = `mermaid${uniqueId}`;
        const { svg: renderedSvg, bindFunctions } = await mermaidApi.render(id, chart);

        if (!cancelled) {
          bindFnRef.current = bindFunctions;
          setSvg(renderedSvg);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError({
            kind: "render",
            message:
              err instanceof Error ? err.message : "Failed to render diagram",
          });
          setSvg("");
        }
      }
    };

    renderDiagram();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === "data-theme") {
          renderDiagram();
        }
      }
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [chart, uniqueId]);

  // After each render of the SVG (re-runs on theme change): apply sketch styling
  // if enabled, then bind mermaid's interaction handlers. mermaid.render() only
  // *returns* bindFunctions; they must be applied to the mounted SVG or `click`
  // directives (and tooltips) silently no-op. Bind after sketch so handlers land
  // on the final nodes.
  useEffect(() => {
    if (!svg || !containerRef.current) return;
    if (sketch) applySketch(containerRef.current, uniqueId, sketchHandwriting);
    bindFnRef.current?.(containerRef.current);
  }, [sketch, sketchHandwriting, svg, uniqueId]);

  if (error) {
    return (
      <div
        data-component="MermaidDiagram"
        data-error-kind={error.kind}
        role="alert"
        data-mermaid-rendered="false"
        className={cn("md-mermaid-error", className)}
      >
        <div className="md-mermaid-error__header">
          <AlertTriangle className="cs-component-mermaid-diagram-68 " />
          <span>Diagram Error</span>
        </div>
        <div className="md-mermaid-error__message">{error.message}</div>
        <pre className="md-mermaid-error__code">{chart}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-component="MermaidDiagram"
      // A state, not a flag: always present, so the negative is assertable too
      // and a gate cannot pass merely because the attribute went missing.
      data-mermaid-rendered={svg ? "true" : "false"}
      className={cn("md-mermaid", sketch && "md-mermaid--sketch", className)}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export const MermaidDiagram = memo(
  forwardRefToRoot<HTMLDivElement, MermaidDiagramProps>(MermaidDiagramImpl),
);

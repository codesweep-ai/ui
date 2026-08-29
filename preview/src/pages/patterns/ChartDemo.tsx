import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal, type SankeyGraph } from "d3-sankey";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  useChartTheme,
  assignSeriesColors,
  styleAxis,
  type ChartTheme,
  Button,
} from "@codesweep-ai/ui";
import { ChartFrame, ChartTooltip } from "@codesweep-ai/ui/chart";
import { dailyUsageData } from "../../data/patternFixtures";

// ── 1. d3 bar chart (imperative — exercises styleAxis + .attr colors) ──

const BAR_DATA = [
  { key: "auth", value: 412 },
  { key: "billing", value: 318 },
  { key: "ingest", value: 501 },
  { key: "search", value: 276 },
  { key: "ui", value: 389 },
];

function D3BarChart({ theme }: { theme: ChartTheme }) {
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ x: number; y: number; key: string; value: number } | null>(null);
  const W = 460, H = 240, margin = { top: 12, right: 12, bottom: 28, left: 40 };
  const colors = assignSeriesColors(BAR_DATA.map((d) => d.key), theme);

  useEffect(() => {
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const x = d3
      .scaleBand()
      .domain(BAR_DATA.map((d) => d.key))
      .range([margin.left, W - margin.right])
      .padding(0.3);
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(BAR_DATA, (d) => d.value) ?? 0])
      .nice()
      .range([H - margin.bottom, margin.top]);

    // Axes — styled entirely through the theme bridge (no inline colors).
    const xAxis = svg
      .append("g")
      .attr("cs-preview-pages-patterns-chart-demo-14", `translate(0,${H - margin.bottom})`)
      .call(d3.axisBottom(x));
    const yAxis = svg
      .append("g")
      .attr("cs-preview-pages-patterns-chart-demo-14", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(4));
    styleAxis(xAxis, theme);
    styleAxis(yAxis, theme);

    svg
      .append("g")
      .selectAll("rect")
      .data(BAR_DATA)
      .join("rect")
      .attr("x", (d) => x(d.key) ?? 0)
      .attr("y", (d) => y(d.value))
      .attr("width", x.bandwidth())
      .attr("height", (d) => y(0) - y(d.value))
      .attr("rx", 3)
      .attr("fill", (d) => colors[d.key]) // ← theme.categorical, not hardcoded hex
      .style("cursor", "pointer")
      .on("mouseenter", (_event, d) =>
        setHover({ x: (x(d.key) ?? 0) + x.bandwidth() / 2, y: y(d.value), key: d.key, value: d.value }),
      )
      .on("mouseleave", () => setHover(null));
  }, [theme]); // redraw on light/dark toggle

  return (
    <div className="cs-preview-pages-patterns-chart-demo-33 " style={{ width: W, height: H, margin: "0 auto" }}>
      <svg ref={ref} width={W} height={H} />
      {hover && (
        <ChartTooltip x={hover.x} y={hover.y}>
          <div className="cs-preview-pages-patterns-chart-demo-35">{hover.key}</div>
          <div className="cs-preview-pages-patterns-chart-demo-36">{hover.value} specs</div>
        </ChartTooltip>
      )}
    </div>
  );
}

// ── 2. d3-sankey flow (themed — the right way to do DependencyView) ──

interface SNode { name: string }
interface SLink { source: number; target: number; value: number }

const SANKEY_NODES: SNode[] = [
  { name: "auth" }, { name: "billing" }, { name: "search" }, // 0,1,2 sources
  { name: "gateway" },                                       // 3 hub
  { name: "postgres" }, { name: "redis" },                   // 4,5 sinks
];
const SANKEY_LINKS: SLink[] = [
  { source: 0, target: 3, value: 8 },
  { source: 1, target: 3, value: 5 },
  { source: 2, target: 3, value: 6 },
  { source: 3, target: 4, value: 12 },
  { source: 3, target: 5, value: 7 },
];

function D3Sankey({ theme }: { theme: ChartTheme }) {
  const ref = useRef<SVGSVGElement>(null);
  const W = 460, H = 220;

  useEffect(() => {
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const layout = sankey<SNode, SLink>()
      .nodeWidth(14)
      .nodePadding(14)
      .extent([[8, 8], [W - 8, H - 8]]);

    const graph: SankeyGraph<SNode, SLink> = layout({
      nodes: SANKEY_NODES.map((d) => ({ ...d })),
      links: SANKEY_LINKS.map((d) => ({ ...d })),
    });

    const color = (i: number) => theme.categorical[i % theme.categorical.length];

    // Links
    svg
      .append("g")
      .attr("fill", "none")
      .selectAll("path")
      .data(graph.links)
      .join("path")
      .attr("d", sankeyLinkHorizontal())
      .attr("stroke", (d) => color((d.source as { index?: number }).index ?? 0))
      .attr("stroke-opacity", 0.35)
      .attr("stroke-width", (d) => Math.max(1, d.width ?? 0));

    // Nodes
    svg
      .append("g")
      .selectAll("rect")
      .data(graph.nodes)
      .join("rect")
      .attr("x", (d) => d.x0 ?? 0)
      .attr("y", (d) => d.y0 ?? 0)
      .attr("width", (d) => (d.x1 ?? 0) - (d.x0 ?? 0))
      .attr("height", (d) => (d.y1 ?? 0) - (d.y0 ?? 0))
      .attr("rx", 2)
      .attr("fill", (d) => color(d.index ?? 0));

    // Labels
    svg
      .append("g")
      .selectAll("text")
      .data(graph.nodes)
      .join("text")
      .attr("x", (d) => ((d.x0 ?? 0) < W / 2 ? (d.x1 ?? 0) + 6 : (d.x0 ?? 0) - 6))
      .attr("y", (d) => ((d.y0 ?? 0) + (d.y1 ?? 0)) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", (d) => ((d.x0 ?? 0) < W / 2 ? "start" : "end"))
      .attr("fill", theme.fg)
      .attr("font-size", 11)
      .attr("font-family", "var(--font-family-mono)")
      .text((d) => d.name);
  }, [theme]);

  return (
    <div className="cs-preview-pages-patterns-chart-demo-76 ">
      <svg ref={ref} width={W} height={H} />
    </div>
  );
}

// ── 3. recharts line chart (declarative — useChartTheme colors + own tooltip) ──

const RECHARTS_SERIES = [
  { key: "input", label: "Input" },
  { key: "output", label: "Output" },
  { key: "cacheRead", label: "Cache Read" },
] as const;

const CHART_HEIGHT = 240;

function RechartsLine({ theme }: { theme: ChartTheme }) {
  const colors = [theme.categorical[0], theme.categorical[1], theme.categorical[2]];

  // recharts owns the tooltip lifecycle; we style the *content* with tokens.
  interface TipProps {
    active?: boolean;
    label?: string | number;
    payload?: { name: string; value: number; color: string }[];
  }
  const TokenTooltip = ({ active, payload, label }: TipProps) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="cs-preview-pages-patterns-chart-demo-83 ">
        <div className="cs-preview-pages-patterns-chart-demo-84 ">{label}</div>
        {payload.map((e) => (
          <div key={e.name} className="cs-preview-pages-patterns-chart-demo-85 ">
            <span className="cs-preview-pages-patterns-chart-demo-86 " style={{ backgroundColor: e.color }} />
            <span className="cs-preview-pages-patterns-chart-demo-87">{e.name}:</span>
            <span className="cs-preview-pages-patterns-chart-demo-88 ">{e.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ width: "100%" }}>
      {/* Explicit numeric height — avoids recharts' ResponsiveContainer
          percentage-height measurement warning on first paint. */}
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <LineChart data={dailyUsageData} margin={{ top: 12, right: 12, bottom: 8, left: 0 }}>
          <CartesianGrid stroke={theme.gridLine} strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fill: theme.axisLabel, fontSize: 11 }} />
          <YAxis tick={{ fill: theme.axisLabel, fontSize: 11 }} tickFormatter={(v: number) => `${v / 1000}k`} />
          <Tooltip content={<TokenTooltip />} isAnimationActive={false} />
          <Legend wrapperStyle={{ fontSize: "var(--font-size-xs)", color: "var(--muted)" }} />
          {RECHARTS_SERIES.map((s, i) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={colors[i]} dot={false} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Showcase page ───────────────────────────────────────────

export function ChartDemo() {
  const theme = useChartTheme();
  const [state, setState] = useState<"data" | "loading" | "error" | "empty">("data");

  return (
    <div className="cs-preview-pages-patterns-chart-demo-103 ">
      <div className="cs-preview-pages-patterns-chart-demo-104 ">
        <div>
          <h2 className="cs-preview-pages-patterns-chart-demo-105 ">Chart theming bridge</h2>
          <p className="cs-preview-pages-patterns-chart-demo-106 ">
            One pattern, any chart lib — all colored through <code className="cs-preview-pages-patterns-chart-demo-107 ">useChartTheme()</code> so they restyle on the theme toggle (top-right). See <code className="cs-preview-pages-patterns-chart-demo-107 ">patterns/Chart.md</code>.
          </p>
        </div>

        {/* d3 — with ChartFrame state toggle */}
        <div className="cs-preview-pages-patterns-chart-demo-108">
          <div className="cs-preview-pages-patterns-chart-demo-109 ">
            <h3 className="cs-preview-pages-patterns-chart-demo-110 ">d3 <span className="cs-preview-pages-patterns-chart-demo-111 ">— imperative · styleAxis · ChartTooltip</span></h3>
            <div className="cs-preview-pages-patterns-chart-demo-112 ">
              {(["data", "loading", "error", "empty"] as const).map((s) => (
                <Button key={s} size="sm" variant={state === s ? "primary" : "secondary"} onClick={() => setState(s)}>{s}</Button>
              ))}
            </div>
          </div>
          <ChartFrame
            title="Specs generated by area"
            height={240}
            loading={state === "loading"}
            error={state === "error" ? "Metrics API timed out" : null}
            empty={state === "empty"}
            onRetry={() => setState("data")}
            emptyHint="No specs in the selected range."
          >
            <D3BarChart theme={theme} />
          </ChartFrame>
        </div>

        {/* d3-sankey */}
        <div className="cs-preview-pages-patterns-chart-demo-108">
          <h3 className="cs-preview-pages-patterns-chart-demo-110 ">d3-sankey <span className="cs-preview-pages-patterns-chart-demo-111 ">— flow diagram · theme.categorical (not hardcoded hex)</span></h3>
          <ChartFrame title="Module dependency flow" height={220}>
            <D3Sankey theme={theme} />
          </ChartFrame>
        </div>

        {/* recharts */}
        <div className="cs-preview-pages-patterns-chart-demo-108">
          <h3 className="cs-preview-pages-patterns-chart-demo-110 ">recharts <span className="cs-preview-pages-patterns-chart-demo-111 ">— declarative · useChartTheme colors · token-styled tooltip</span></h3>
          <ChartFrame title="Daily token usage" height={CHART_HEIGHT}>
            <RechartsLine theme={theme} />
          </ChartFrame>
        </div>
      </div>
    </div>
  );
}

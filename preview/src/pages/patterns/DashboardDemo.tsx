import { useState } from "react";
import {
  Card,
  CardGroup,
  CheckboxGroup,
  type CheckboxOption,
  useChartTheme,
  type ChartTheme,
  cn,
} from "@codesweep-ai/ui";
import { ChartTooltip } from "@codesweep-ai/ui/chart";
import {
  dashboardStats,
  dashboardBars,
  dailyUsageData,
  costBreakdownData,
  tokenBreakdownData,
  type ChartBar,
  type DashboardStat,
} from "../../data/patternFixtures";

// ── Stat tiles (DS Card) ───────────────────────────────────

function StatsBar({ stats }: { stats: DashboardStat[] }) {
  return (
    <div className="cs-preview-pages-patterns-dashboard-demo-4 ">
      {stats.map((s) => (
        <Card key={s.label} variant="tight" className="cs-preview-pages-patterns-dashboard-demo-6">
          <div className="cs-preview-pages-patterns-dashboard-demo-7 ">
            {s.value}
          </div>
          <div className="text-label-upper cs-preview-pages-patterns-dashboard-demo-8">{s.label}</div>
        </Card>
      ))}
    </div>
  );
}

// ── Inline bar list (hand-drawn chart content, token colors) ─

function InlineBarChart({ bars }: { bars: ChartBar[] }) {
  const max = Math.max(...bars.map((b) => b.value));
  return (
    <div className="cs-preview-pages-patterns-dashboard-demo-9 ">
      {bars.map((bar) => (
        <div key={bar.label} className="cs-preview-pages-patterns-dashboard-demo-10 ">
          <span className="cs-preview-pages-patterns-dashboard-demo-11 ">
            {bar.label}
          </span>
          <div className="cs-preview-pages-patterns-dashboard-demo-12 ">
            <div
              className="cs-preview-pages-patterns-dashboard-demo-13 "
              style={{ width: `${(bar.value / max) * 100}%`, backgroundColor: bar.color }}
            />
          </div>
          <span className="cs-preview-pages-patterns-dashboard-demo-16 ">
            {bar.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Shared legend markup (token-colored swatches) ───────────

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="cs-preview-pages-patterns-dashboard-demo-17 ">
      {items.map((it) => (
        <span key={it.label} className="cs-preview-pages-patterns-dashboard-demo-18 ">
          <span className="cs-preview-pages-patterns-dashboard-demo-19 " style={{ backgroundColor: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

// Fixed-size SVGs so viewBox units == container px → ChartTooltip aligns.

const SERIES: { key: keyof typeof dailyUsageData[number]; label: string }[] = [
  { key: "input", label: "Input" },
  { key: "output", label: "Output" },
  { key: "cacheRead", label: "Cache Read" },
  { key: "cacheWrite", label: "Cache Write" },
];

function DailyLineChart({ theme }: { theme: ChartTheme }) {
  const W = 460, H = 200, PAD_L = 36, PAD_R = 12, PAD_T = 12, PAD_B = 28;
  const [hover, setHover] = useState<number | null>(null);
  const n = dailyUsageData.length;
  const max = Math.max(
    ...dailyUsageData.flatMap((d) => SERIES.map((s) => d[s.key] as number)),
  );
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const x = (i: number) => PAD_L + (i / (n - 1)) * plotW;
  const y = (v: number) => PAD_T + plotH - (v / max) * plotH;
  const colors = [theme.categorical[0], theme.categorical[1], theme.categorical[2], theme.categorical[3]];

  return (
    <div className="cs-preview-pages-patterns-dashboard-demo-28 ">
      <div className="cs-preview-pages-patterns-dashboard-demo-29" style={{ width: W, height: H }}>
        <svg width={W} height={H}>
          {/* gridlines */}
          {[0, 0.5, 1].map((g) => (
            <line key={g} x1={PAD_L} y1={PAD_T + plotH * g} x2={W - PAD_R} y2={PAD_T + plotH * g} stroke={theme.gridLine} strokeWidth={1} />
          ))}
          {SERIES.map((s, si) => (
            <polyline
              key={s.key}
              fill="none"
              stroke={colors[si]}
              strokeWidth={2}
              points={dailyUsageData.map((d, i) => `${x(i)},${y(d[s.key] as number)}`).join(" ")}
            />
          ))}
          {/* hover hit-columns + guide */}
          {hover !== null && (
            <line x1={x(hover)} y1={PAD_T} x2={x(hover)} y2={PAD_T + plotH} stroke={theme.muted} strokeDasharray="3 3" />
          )}
          {dailyUsageData.map((_, i) => (
            <rect
              key={i}
              x={x(i) - plotW / (n - 1) / 2}
              y={PAD_T}
              width={plotW / (n - 1)}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </svg>
        {hover !== null && (
          <ChartTooltip x={x(hover)} y={PAD_T} anchor={hover > n / 2 ? "left" : "right"}>
            <div className="cs-preview-pages-patterns-dashboard-demo-39 ">{dailyUsageData[hover].date}</div>
            {SERIES.map((s, si) => (
              <div key={s.key} className="cs-preview-pages-patterns-dashboard-demo-40 ">
                <span className="cs-preview-pages-patterns-dashboard-demo-41 " style={{ backgroundColor: colors[si] }} />
                <span className="cs-preview-pages-patterns-dashboard-demo-42">{s.label}:</span>
                <span className="cs-preview-pages-patterns-dashboard-demo-43 ">{(dailyUsageData[hover][s.key] as number).toLocaleString()}</span>
              </div>
            ))}
          </ChartTooltip>
        )}
      </div>
      <Legend items={SERIES.map((s, si) => ({ label: s.label, color: colors[si] }))} />
    </div>
  );
}

const COST_SERIES: { key: keyof typeof costBreakdownData[number]; label: string }[] = [
  { key: "input", label: "Input" },
  { key: "output", label: "Output" },
  { key: "cacheRead", label: "Cache Read" },
  { key: "cacheWrite", label: "Cache Write" },
];

function CostStackedBar({ theme }: { theme: ChartTheme }) {
  const W = 460, ROW_H = 34, GAP = 14, PAD_L = 56, PAD_R = 12, PAD_T = 8;
  const [hover, setHover] = useState<{ x: number; y: number; label: string; value: number } | null>(null);
  const colors = [theme.categorical[0], theme.categorical[1], theme.categorical[2], theme.categorical[3]];
  const totals = costBreakdownData.map((d) => COST_SERIES.reduce((s, c) => s + (d[c.key] as number), 0));
  const max = Math.max(...totals);
  const plotW = W - PAD_L - PAD_R;
  const H = PAD_T + costBreakdownData.length * (ROW_H + GAP);

  return (
    <div className="cs-preview-pages-patterns-dashboard-demo-28 ">
      <div className="cs-preview-pages-patterns-dashboard-demo-29" style={{ width: W, height: H }}>
        <svg width={W} height={H}>
          {costBreakdownData.map((d, ri) => {
            const yTop = PAD_T + ri * (ROW_H + GAP);
            let cursor = PAD_L;
            return (
              <g key={d.model}>
                <text x={PAD_L - 8} y={yTop + ROW_H / 2} textAnchor="end" dominantBaseline="middle" fill={theme.fg} fontSize={12} fontFamily="var(--font-family-mono)">
                  {d.model}
                </text>
                {COST_SERIES.map((c, ci) => {
                  const v = d[c.key] as number;
                  const w = (v / max) * plotW;
                  const segX = cursor;
                  cursor += w;
                  return (
                    <rect
                      key={c.key}
                      x={segX}
                      y={yTop}
                      width={Math.max(0, w - 1)}
                      height={ROW_H}
                      rx={2}
                      fill={colors[ci]}
                      onMouseEnter={() => setHover({ x: segX + w / 2, y: yTop, label: `${d.model} · ${c.label}`, value: v })}
                      onMouseLeave={() => setHover(null)}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
        {hover && (
          <ChartTooltip x={hover.x} y={hover.y}>
            <div className="cs-preview-pages-patterns-dashboard-demo-58">{hover.label}</div>
            <div className="cs-preview-pages-patterns-dashboard-demo-59">${hover.value.toFixed(2)}</div>
          </ChartTooltip>
        )}
      </div>
      <Legend items={COST_SERIES.map((c, ci) => ({ label: c.label, color: colors[ci] }))} />
    </div>
  );
}

function pointOnCircle(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSegment(cx: number, cy: number, rOuter: number, rInner: number, startAngle: number, endAngle: number) {
  const so = pointOnCircle(cx, cy, rOuter, endAngle);
  const eo = pointOnCircle(cx, cy, rOuter, startAngle);
  const si = pointOnCircle(cx, cy, rInner, startAngle);
  const ei = pointOnCircle(cx, cy, rInner, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${so.x} ${so.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 0 ${eo.x} ${eo.y}`,
    `L ${si.x} ${si.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 1 ${ei.x} ${ei.y}`,
    "Z",
  ].join(" ");
}

function TokenDonut({ theme }: { theme: ChartTheme }) {
  const S = 220, cx = S / 2, cy = S / 2, rOuter = 90, rInner = 56;
  const [hover, setHover] = useState<number | null>(null);
  const colors = [theme.categorical[0], theme.categorical[1], theme.categorical[2], theme.categorical[3]];
  const total = tokenBreakdownData.reduce((s, d) => s + d.value, 0);
  let angle = 0;
  const segs = tokenBreakdownData.map((d, i) => {
    const start = angle;
    const sweep = (d.value / total) * 360;
    angle += sweep;
    return { ...d, start, end: angle, color: colors[i], i };
  });

  return (
    <div className="cs-preview-pages-patterns-dashboard-demo-28 ">
      <div className="cs-preview-pages-patterns-dashboard-demo-29" style={{ width: S, height: S }}>
        <svg width={S} height={S}>
          {segs.map((seg) => (
            <path
              key={seg.name}
              d={donutSegment(cx, cy, rOuter, rInner, seg.start, seg.end)}
              fill={seg.color}
              opacity={hover === null || hover === seg.i ? 1 : 0.4}
              onMouseEnter={() => setHover(seg.i)}
              onMouseLeave={() => setHover(null)}
              style={{ transition: "opacity 0.15s" }}
            />
          ))}
          <text x={cx} y={cy - 4} textAnchor="middle" fill={theme.fg} fontSize={18} fontWeight={700} fontFamily="var(--font-family-mono)">
            {(total / 1000).toFixed(0)}k
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" fill={theme.muted} fontSize={11}>
            tokens
          </text>
        </svg>
        {hover !== null && (
          <ChartTooltip x={cx} y={cy - rOuter} anchor="top">
            <div className="cs-preview-pages-patterns-dashboard-demo-58">{segs[hover].name}</div>
            <div className="cs-preview-pages-patterns-dashboard-demo-59">{segs[hover].value.toLocaleString()} ({((segs[hover].value / total) * 100).toFixed(0)}%)</div>
          </ChartTooltip>
        )}
      </div>
      <Legend items={segs.map((s) => ({ label: s.name, color: s.color }))} />
    </div>
  );
}

// ── Filter option fixtures ─────────────────────────────────

const flatOptions: CheckboxOption[] = dashboardBars.map((b) => ({ value: b.label, label: b.label, color: b.color }));
const groupedOptions: CheckboxOption[] = dashboardBars.map((b) => ({ value: b.label, label: b.label, color: b.color, group: b.group }));

// ── Dashboard demo ─────────────────────────────────────────

export function DashboardDemo() {
  const theme = useChartTheme();
  const [maximizedId, setMaximizedId] = useState<string | null>(null);
  const [flatVisible, setFlatVisible] = useState<Set<string>>(new Set(dashboardBars.map((b) => b.label)));
  const [groupedVisible, setGroupedVisible] = useState<Set<string>>(new Set(dashboardBars.map((b) => b.label)));

  const flatBars = dashboardBars.filter((b) => flatVisible.has(b.label));
  const groupedBars = dashboardBars.filter((b) => groupedVisible.has(b.label));

  return (
    <div className={cn("cs-preview-pages-patterns-dashboard-demo-85 ", !maximizedId && "cs-preview-pages-patterns-dashboard-demo-86")}>
      {!maximizedId && <StatsBar stats={dashboardStats} />}

      {/* Natural-height stack (fill={false}) — cards size to content and the
          page scrolls once; a maximized card still fills the viewport. */}
      <CardGroup fill={false} maximizedId={maximizedId} onMaximizedChange={setMaximizedId}>
        {/* Flat filter variant */}
        <Card id="flat-filter" header="File Type Breakdown — Flat Filter" maximizable>
          <div className={cn("cs-preview-pages-patterns-dashboard-demo-89 ", maximizedId === "flat-filter" && "cs-preview-pages-patterns-dashboard-demo-91 ")}>
            <div className="cs-preview-pages-patterns-dashboard-demo-92 ">
              <CheckboxGroup options={flatOptions} selected={flatVisible} onChange={setFlatVisible} label="Filter" filterable filterPlaceholder="Find type..." />
            </div>
            <div className="cs-preview-pages-patterns-dashboard-demo-95 ">
              {flatBars.length > 0 ? (
                <InlineBarChart bars={flatBars} />
              ) : (
                <div className="cs-preview-pages-patterns-dashboard-demo-96 ">No file types selected</div>
              )}
            </div>
          </div>
        </Card>

        {/* Grouped filter variant */}
        <Card id="grouped-filter" header="File Type Breakdown — Grouped Filter" maximizable>
          <div className={cn("cs-preview-pages-patterns-dashboard-demo-89 ", maximizedId === "grouped-filter" && "cs-preview-pages-patterns-dashboard-demo-91 ")}>
            <div className="cs-preview-pages-patterns-dashboard-demo-92 ">
              <CheckboxGroup options={groupedOptions} selected={groupedVisible} onChange={setGroupedVisible} label="Filter" filterable filterPlaceholder="Find type..." />
            </div>
            <div className="cs-preview-pages-patterns-dashboard-demo-95 ">
              {groupedBars.length > 0 ? (
                <InlineBarChart bars={groupedBars} />
              ) : (
                <div className="cs-preview-pages-patterns-dashboard-demo-96 ">No file types selected</div>
              )}
            </div>
          </div>
        </Card>

        {/* SVG line chart (useChartTheme + ChartTooltip) */}
        <Card id="line-chart" header="Daily Token Usage" maximizable>
          <div className={cn("cs-preview-pages-patterns-dashboard-demo-104 ", maximizedId === "line-chart" ? "cs-preview-pages-patterns-dashboard-demo-106" : "cs-preview-pages-patterns-dashboard-demo-107")}>
            <DailyLineChart theme={theme} />
          </div>
        </Card>

        {/* SVG stacked bar */}
        <Card id="bar-chart" header="Cost Breakdown by Model" maximizable>
          <div className={cn("cs-preview-pages-patterns-dashboard-demo-104 ", maximizedId === "bar-chart" ? "cs-preview-pages-patterns-dashboard-demo-106" : "cs-preview-pages-patterns-dashboard-demo-107")}>
            <CostStackedBar theme={theme} />
          </div>
        </Card>

        {/* SVG donut */}
        <Card id="pie-chart" header="Token Volume Breakdown" maximizable>
          <div className={cn("cs-preview-pages-patterns-dashboard-demo-104 ", maximizedId === "pie-chart" ? "cs-preview-pages-patterns-dashboard-demo-106" : "cs-preview-pages-patterns-dashboard-demo-107")}>
            <TokenDonut theme={theme} />
          </div>
        </Card>
      </CardGroup>
    </div>
  );
}

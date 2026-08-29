import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  Button,
  Card,
  CardGroup,
  Chip,
  Panel,
  Tree,
  type TreeNode,
  Dropdown,
  EventLanes,
  SearchInput,
  SegmentedControl,
  HighlightText,
  CheckboxGroup,
  RadioGroup,
  type CheckboxOption,
  type RadioOption,
  Table,
  Modal,
  StatusBadge,
  ThemeToggle,
  SplitPane,
  SectionedTree,
  type TreeSection,
  Input,
  Legend,
  type LegendItem,
  FormGroup,
  PulseBadge,
  AgentStatus,
  StreamingText,
  AgentTrace,
  type AgentTraceStep,
  Toast,
  ToastContainer,
  toast,
  type ToastItem,
} from "@codesweep-ai/ui";
import { CodeBlock } from "@codesweep-ai/ui/code";
import { MarkdownMinimap } from "@codesweep-ai/ui/minimap";
import { MarkdownViewer } from "@codesweep-ai/ui/markdown/rich";
import { MermaidDiagram } from "@codesweep-ai/ui/mermaid";
import { ChartFrame, ChartTooltip } from "@codesweep-ai/ui/chart";
import {
  sampleTreeNodes,
  sampleTableData,
  sampleDropdownOptions,
  sampleCode,
  sampleMarkdown,
} from "../data/fixtures";
import {
  multiLaneBlindKinds,
  multiLaneEmphasis,
  multiLaneEvents,
  multiLaneLanes,
  multiLanePalette,
  multiLaneSpans,
  denseEmphasis,
  denseEvents,
  denseLanes,
  densePalette,
} from "../data/eventLanesFixtures";
import { classRecords, type ClassRecord, projectFilesTree, dependenciesTree, explorerTree } from "../data/patternFixtures";
import { richMarkdownProps } from "../richMarkdown";

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const sectionTitles = [
  "Button", "Card", "CardGroup", "Chip", "StatusBadge", "HighlightText", "Legend",
  "Input", "FormGroup", "Dropdown", "SearchInput", "CheckboxGroup", "RadioGroup",
  "ThemeToggle",
  "EventLanes", "Table", "Panel + Tree", "SectionedTree", "SectionedTree (flipped)",
  "SegmentedControl", "SplitPane", "Master-Detail (contained SplitPane)",
  "CodeBlock", "MarkdownMinimap", "MarkdownViewer", "MermaidDiagram", "Modal",
  "PulseBadge", "AgentStatus", "StreamingText", "AgentTrace",
  "ChartFrame", "ChartTooltip", "Toast", "ToastContainer",
];

// Alphabetical order for both the Contents index and the section bodies.
// Sections apply this via CSS `order` (below), so adding a new section only
// means adding it to `sectionTitles` + a <Section> block anywhere — it sorts
// itself.
const sortedTitles = [...sectionTitles].sort((a, b) => a.localeCompare(b));
const orderOf = (title: string) => sortedTitles.indexOf(title);

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={slug(title)} style={{ order: orderOf(title) }} className="cs-preview-pages-components-page-40">
      <div className="cs-preview-pages-components-page-41 ">
        <h2 className="cs-preview-pages-components-page-42 ">
          {title}
        </h2>
        <a
          href="#top"
          title="Back to top (press t)"
          aria-label="Back to top"
          className="cs-preview-pages-components-page-46 "
        >
          ↑ top
        </a>
      </div>
      {children}
    </section>
  );
}

const stSections: TreeSection[] = [
  { id: "project", label: "Project Files", nodes: projectFilesTree },
  { id: "deps", label: "Dependencies", nodes: dependenciesTree },
];

const legendItems: LegendItem[] = [
  { id: "llm", label: "LLM", color: "--color-cat-1" },
  { id: "tool", label: "Tool", color: "--color-cat-3" },
  { id: "result", label: "Result", color: "--color-cat-7" },
  { id: "error", label: "Error", color: "--color-error" },
];

// ── Demos for the components that hold state ──────────────────

function InputDemo() {
  const [text, setText] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <div className="cs-preview-pages-components-page-54 ">
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Plain text (md)" />
      <Input size="sm" placeholder="Small size" />
      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" prefix={<span>@</span>} />
      <Input type="password" placeholder="Password" />
      <Input placeholder="Error state" error />
      <Input placeholder="Disabled" disabled />
      <Input placeholder="Read-only" readOnly value="read only" onChange={() => {}} />
      <Input suffix={<span className="cs-preview-pages-components-page-66">USD</span>} placeholder="With suffix" />
      <div className="cs-preview-pages-components-page-68">
        <Input multiline rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Multiline textarea" />
      </div>
    </div>
  );
}

function FormGroupDemo() {
  const [val, setVal] = useState("");
  const invalid = val.length > 0 && !val.includes("@");
  return (
    <div className="cs-preview-pages-components-page-72 ">
      <FormGroup label="Full name" htmlFor="fg-name" required helper="As it appears on your account.">
        <Input placeholder="Ada Lovelace" />
      </FormGroup>
      <FormGroup
        label="Email"
        htmlFor="fg-email"
        required
        error={invalid ? "Enter a valid email address." : undefined}
        helper={invalid ? undefined : "We'll never share it."}
      >
        <Input type="email" value={val} onChange={(e) => setVal(e.target.value)} placeholder="you@example.com" />
      </FormGroup>
      <FormGroup label="Plan" htmlFor="fg-plan" helper="Switch any time.">
        <Dropdown
          id="fg-plan"
          value=""
          onChange={() => {}}
          options={[
            { value: "free", label: "Free" },
            { value: "pro", label: "Pro" },
          ]}
          placeholder="Choose a plan"
        />
      </FormGroup>
    </div>
  );
}

function StreamingTextDemo() {
  const full =
    "The handleAuth function maps cookie-based sessions to OIDC subjects. I'll generate parity tests covering both the legacy and new paths…";
  const [runId, setRunId] = useState(0);
  const [done, setDone] = useState(false);
  return (
    <div className="cs-preview-pages-components-page-94 ">
      <div className="cs-preview-pages-components-page-95 ">
        <Button size="sm" onClick={() => { setDone(false); setRunId((n) => n + 1); }}>
          Replay
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setDone(true)}>
          Mark done
        </Button>
      </div>
      <div className="cs-preview-pages-components-page-99 ">
        <StreamingText key={runId} text={full} speed={50} done={done} />
      </div>
    </div>
  );
}

const traceSteps: AgentTraceStep[] = [
  { id: "1", status: "success", label: "Read 142 files", timestamp: "10:01" },
  { id: "2", status: "success", label: "Inferred 38 contracts", timestamp: "10:02", detail: "Mapped cookie sessions → OIDC subjects across auth.legacy and auth.v2." },
  { id: "3", status: "in-flight", label: "Generating parity tests…" },
  { id: "4", status: "warning", label: "3 callsites need human review", timestamp: "10:04", detail: "src/legacy/login.ts:42, src/legacy/sso.ts:88, src/legacy/logout.ts:12" },
];

function AgentTraceDemo() {
  const [state, setState] = useState<"data" | "loading" | "error" | "empty">("data");
  return (
    <div className="cs-preview-pages-components-page-94 ">
      <div className="cs-preview-pages-components-page-122 ">
        {(["data", "loading", "error", "empty"] as const).map((s) => (
          <Button key={s} size="sm" variant={state === s ? "primary" : "secondary"} onClick={() => setState(s)}>
            {s}
          </Button>
        ))}
      </div>
      <AgentTrace
        steps={state === "data" ? traceSteps : state === "empty" ? [] : undefined}
        loading={state === "loading"}
        error={state === "error" ? "Trace stream disconnected" : null}
        onRetry={() => setState("data")}
        emptyHint="Start an agent to populate the trace."
      />
    </div>
  );
}

function ChartFrameDemo() {
  const [state, setState] = useState<"data" | "loading" | "error" | "empty">("data");
  return (
    <div className="cs-preview-pages-components-page-94 ">
      <div className="cs-preview-pages-components-page-122 ">
        {(["data", "loading", "error", "empty"] as const).map((s) => (
          <Button key={s} size="sm" variant={state === s ? "primary" : "secondary"} onClick={() => setState(s)}>
            {s}
          </Button>
        ))}
      </div>
      <ChartFrame
        title="Tokens / day"
        loading={state === "loading"}
        error={state === "error" ? "Metrics API timed out" : null}
        empty={state === "empty"}
        onRetry={() => setState("data")}
        emptyHint="No usage in the selected range."
      >
        <svg viewBox="0 0 200 100" width="100%" height="100%" preserveAspectRatio="none">
          <polyline
            points="0,80 30,60 60,68 90,40 120,52 150,24 200,32"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="2"
          />
        </svg>
      </ChartFrame>
    </div>
  );
}

function ChartTooltipDemo() {
  const [hover, setHover] = useState<{ x: number; y: number; label: string; value: number } | null>(null);
  const points = [
    { x: 40, label: "Mon", value: 412 },
    { x: 110, label: "Tue", value: 388 },
    { x: 180, label: "Wed", value: 501 },
    { x: 250, label: "Thu", value: 276 },
  ];
  return (
    <div className="cs-preview-pages-components-page-168 ">
      <p className="cs-preview-pages-components-page-169 ">
        Hover a dot — the tooltip is positioned inside the relative container.
      </p>
      {/* Fixed-size SVG so viewBox units == container px → tooltip aligns. */}
      <div className="cs-preview-pages-components-page-170 ">
        <svg width={300} height={120}>
          {points.map((p) => (
            <circle
              key={p.label}
              cx={p.x}
              cy={120 - p.value / 6}
              r={6}
              fill="var(--color-accent)"
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHover({ x: p.x, y: 120 - p.value / 6, label: p.label, value: p.value })}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </svg>
        <ChartTooltip visible={hover != null} x={hover?.x ?? 0} y={hover?.y ?? 0}>
          <div className="cs-preview-pages-components-page-173">{hover?.label}</div>
          <div>{hover?.value} tokens</div>
        </ChartTooltip>
      </div>
    </div>
  );
}

function MarkdownMinimapDemo() {
  const contentRef = useRef<HTMLDivElement>(null);
  return (
    <div className="cs-preview-pages-components-page-174 ">
      {/* The pane scrolls, so it has to be reachable by keyboard; the role is what
          lets it take the name, the same shape CodeBlock uses. */}
      <div
        ref={contentRef}
        role="group"
        tabIndex={0}
        aria-label="Repository overview"
        className="cs-preview-pages-components-page-175 "
      >
        <div className="markdown-content">
          <h2>Repository overview</h2>
          <p>MarkdownMinimap reads the layout and scroll position of a separate content container.</p>
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index}>
              <h3>Section {index + 1}</h3>
              <p>
                This preview provides enough long-form content to exercise the viewport indicator,
                click-to-scroll behavior, and drag navigation in both themes.
              </p>
              <pre><code>{`const section = ${index + 1};`}</code></pre>
            </div>
          ))}
        </div>
      </div>
      <MarkdownMinimap
        contentRef={contentRef}
        className="cs-preview-pages-components-page-179 "
      />
    </div>
  );
}

const previewToasts: ToastItem[] = [
  { id: "preview-success", variant: "success", message: "Changes saved", duration: null, important: false },
  { id: "preview-warning", variant: "warning", message: "Three files need review", duration: null, important: false },
  { id: "preview-error", variant: "error", message: "Build failed", duration: null, important: true },
  { id: "preview-info", variant: "info", message: "Analysis is still running", duration: null, important: false },
];

function EventLanesDemo() {
  const [denseSelected, setTracerSelected] = useState(0);
  const [multiLaneSelected, setCampaignSelected] = useState(0);
  const [blindMode, setBlindMode] = useState(false);
  const linked = useMemo(
    () => new Set([multiLaneSelected - 7, multiLaneSelected + 7].filter((index) => index >= 0 && index < 73)),
    [multiLaneSelected],
  );

  return (
    <div className="cs-preview-event-lanes-stack">
      <div data-event-lanes-fixture="dense-1366" className="cs-preview-event-lanes-fixture">
        <div className="cs-preview-event-lanes-heading">
          <h3>Dense · 1 lane × 1,366 events</h3>
          <output data-event-lanes-selection="dense">Selected index: {denseSelected}</output>
        </div>
        <EventLanes
          id="event-lanes-dense"
          aria-label="Dense event timeline"
          lanes={denseLanes}
          events={denseEvents}
          palette={densePalette}
          emphasis={denseEmphasis}
          selected={denseSelected}
          onSelect={(event) => setTracerSelected(event.i)}
          overview="auto"
          cellWidth={10}
        />
      </div>

      <div data-event-lanes-fixture="multilane-73" className="cs-preview-event-lanes-fixture">
        <div className="cs-preview-event-lanes-heading">
          <h3>Multi-lane · 7 lanes × 73 events with 23 spans</h3>
          <div className="cs-preview-event-lanes-controls">
            <output data-event-lanes-selection="multilane">Selected index: {multiLaneSelected}</output>
            <Button
              size="sm"
              variant={blindMode ? "secondary" : "ghost"}
              aria-pressed={blindMode}
              onClick={() => setBlindMode((value) => !value)}
            >
              Blind mode
            </Button>
          </div>
        </div>
        <EventLanes
          id="event-lanes-multilane"
          aria-label="Multi-lane event timeline"
          lanes={multiLaneLanes}
          events={multiLaneEvents}
          spans={multiLaneSpans}
          palette={multiLanePalette}
          emphasis={multiLaneEmphasis}
          selected={multiLaneSelected}
          linked={linked}
          hiddenKinds={blindMode ? multiLaneBlindKinds : undefined}
          onSelect={(event) => setCampaignSelected(event.i)}
          overview="auto"
          cellWidth={22}
          ruler={({ end, xForIndex }) => (
            <div className="cs-preview-event-lanes-ruler">
              {Array.from({ length: Math.floor(end / 12) + 1 }, (_, step) => {
                const index = step * 12;
                return <span key={index} style={{ left: xForIndex(index) }}>{index}</span>;
              })}
            </div>
          )}
          renderTooltip={(event) => (
            <span>{event.label} · index {event.i} · {event.at}</span>
          )}
        />
      </div>
    </div>
  );
}

export function ComponentsPage() {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(["src"])
  );
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [allTreeExpanded, setAllTreeExpanded] = useState(false);
  const [stSelectedId, setStSelectedId] = useState<string | null>(null);
  const [stFlippedSelectedId, setStFlippedSelectedId] = useState<string | null>(null);
  const [dropdownValue, setDropdownValue] = useState("react");
  const [sort, setSort] = useState<{
    columnId: string;
    direction: "asc" | "desc";
  }>({ columnId: "name", direction: "asc" });
  const [searchValue, setSearchValue] = useState("");
  const [searchResult, setSearchResult] = useState<string | null>(null);
  const handleSearchDemo = useCallback((v: string) => {
    setSearchResult(v ? `Searched for: "${v}"` : null);
  }, []);
  const [searchAutoValue, setSearchAutoValue] = useState("");
  const [searchAutoResult, setSearchAutoResult] = useState<string | null>(null);
  const handleSearchAutoDemo = useCallback((v: string) => {
    setSearchAutoResult(v ? `Auto-searched: "${v}"` : null);
  }, []);
  const [highlightQuery, setHighlightQuery] = useState("auth");
  const cbOptions: CheckboxOption[] = [
    { value: "tsx", label: ".tsx", color: "var(--color-accent)" },
    { value: "ts", label: ".ts", color: "var(--color-success)" },
    { value: "css", label: ".css", color: "var(--color-warning)" },
    { value: "json", label: ".json", color: "var(--color-error)" },
    { value: "md", label: ".md", color: "var(--color-neutral)" },
  ];
  const [cbSelected, setCbSelected] = useState<Set<string>>(
    new Set(["tsx", "ts", "css"])
  );
  // RadioGroup: an exclusive choice whose options each carry a description —
  // the case SegmentedControl and Dropdown do not cover (RadioGroup.md).
  const radioOptions: RadioOption[] = [
    { value: "tight", label: "Tight", description: "Minimal chrome; for dense lists." },
    { value: "default", label: "Default", description: "The standard card padding." },
    { value: "roomy", label: "Roomy", description: "For a card that is the subject of the page." },
    { value: "custom", label: "Custom", description: "Not available on this plan.", disabled: true },
  ];
  const [radioValue, setRadioValue] = useState("default");
  const radioRowOptions: RadioOption[] = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "system", label: "System" },
  ];
  const [radioRowValue, setRadioRowValue] = useState("system");
  const cbFilterableOptions: CheckboxOption[] = [
    { value: "tsx", label: ".tsx" },
    { value: "ts", label: ".ts" },
    { value: "css", label: ".css" },
    { value: "json", label: ".json" },
    { value: "md", label: ".md" },
    { value: "jsx", label: ".jsx" },
    { value: "scss", label: ".scss" },
    { value: "yaml", label: ".yaml" },
    { value: "html", label: ".html" },
    { value: "svg", label: ".svg" },
  ];
  const [cbFilterableSelected, setCbFilterableSelected] = useState<Set<string>>(
    new Set(cbFilterableOptions.map((o) => o.value))
  );
  const cbGroupedOptions: CheckboxOption[] = [
    { value: "tsx", label: ".tsx", group: "Code" },
    { value: "ts", label: ".ts", group: "Code" },
    { value: "jsx", label: ".jsx", group: "Code" },
    { value: "css", label: ".css", group: "Styles" },
    { value: "scss", label: ".scss", group: "Styles" },
    { value: "json", label: ".json", group: "Config" },
    { value: "yaml", label: ".yaml", group: "Config" },
    { value: "env", label: ".env", group: "Config" },
    { value: "md", label: ".md", group: "Docs" },
    { value: "html", label: ".html", group: "Docs" },
  ];
  const [cbGroupedSelected, setCbGroupedSelected] = useState<Set<string>>(
    new Set(cbGroupedOptions.map((o) => o.value))
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [legendSelected, setLegendSelected] = useState(
    new Set(legendItems.map((item) => item.id)),
  );
  const [openChip, setOpenChip] = useState(true);
  const [segmentValue, setSegmentValue] = useState("rendered");
  const [selectedTableRow, setSelectedTableRow] = useState<string | null>(null);
  const [mdSelected, setMdSelected] = useState<string | null>("UserService");
  const [mdSort, setMdSort] = useState<{
    columnId: string;
    direction: "asc" | "desc";
  }>({ columnId: "name", direction: "asc" });
  const sortedTableData = useMemo(() => {
    const copy = [...sampleTableData];
    copy.sort((a, b) => {
      const av = a[sort.columnId as keyof typeof a];
      const bv = b[sort.columnId as keyof typeof b];
      const result = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sort.direction === "asc" ? result : -result;
    });
    return copy;
  }, [sort]);
  const mdSorted = useMemo(() => {
    const copy = [...classRecords];
    copy.sort((a, b) => {
      const key = mdSort.columnId as keyof ClassRecord;
      const av = a[key];
      const bv = b[key];
      if (typeof av === "string" && typeof bv === "string")
        return mdSort.direction === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      if (typeof av === "number" && typeof bv === "number")
        return mdSort.direction === "asc" ? av - bv : bv - av;
      return 0;
    });
    return copy;
  }, [mdSort]);
  const mdDetail = classRecords.find((r) => r.name === mdSelected) ?? null;

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      requestAnimationFrame(() => {
        document.getElementById(hash)?.scrollIntoView();
      });
    }
  }, []);

  return (
    <div id="top" className="cs-preview-pages-components-page-297 ">
      <h1 style={{ order: -2 }} className="cs-preview-pages-components-page-298 ">Components</h1>

      <nav aria-label="Component sections" style={{ order: -1 }}>
        <Card header="Contents">
          {/* CSS multi-column fills top-to-bottom per column, so the
              alphabetical list reads vertically down each column. */}
          <div className="cs-preview-pages-components-page-300 ">
            {sortedTitles.map((title) => (
              <a
                key={title}
                href={`#${slug(title)}`}
                className="cs-preview-pages-components-page-303 "
              >
                {title}
              </a>
            ))}
          </div>
        </Card>
      </nav>

      {/* Button */}
      <Section title="Button">
        <div className="cs-preview-pages-components-page-40">
          <div className="cs-preview-pages-components-page-321 ">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="success">Success</Button>
            <Button variant="warning">Warning</Button>
          </div>
          <div className="cs-preview-pages-components-page-321 ">
            <Button size="sm" variant="primary">
              Small
            </Button>
            <Button size="md" variant="primary">
              Medium
            </Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
          </div>
        </div>
      </Section>

      {/* Chip */}
      <Section title="Chip">
        <div className="cs-preview-pages-components-page-321 ">
          <Chip pressed={openChip} count={12} onPressedChange={setOpenChip}>Open</Chip>
          <Chip count={3}>Stale</Chip>
          <Chip pressed disabled count={8}>Closed</Chip>
        </div>
      </Section>

      {/* Legend */}
      <Section title="Legend">
        <div className="cs-preview-pages-components-page-40">
          <p className="cs-preview-pages-components-page-169 ">Static legend</p>
          <Legend items={legendItems} extras={<span>4 kinds</span>} />
          <p className="cs-preview-pages-components-page-169 ">Interactive legend</p>
          <Legend
            aria-label="Visible event kinds"
            items={legendItems}
            selected={legendSelected}
            onChange={setLegendSelected}
            extras={<span>{legendSelected.size} visible</span>}
          />
        </div>
      </Section>

      {/* SegmentedControl */}
      <Section title="SegmentedControl">
        <SegmentedControl
          aria-label="Content view"
          value={segmentValue}
          onChange={setSegmentValue}
          options={[
            { value: "rendered", label: "Rendered" },
            { value: "raw", label: "Raw" },
            { value: "diff", label: "Diff" },
          ]}
        />
      </Section>

      {/* Card */}
      <Section title="Card">
        <div className="cs-preview-pages-components-page-334 ">
          <Card>Default card with some content inside.</Card>
          <Card variant="muted">Muted card variant.</Card>
          <Card variant="success">Success card variant.</Card>
          <Card variant="danger">Danger card variant.</Card>
          <Card variant="tight">Tight card with less padding.</Card>
          <Card header="Card with Header">
            This card has a header section with border separator.
          </Card>
        </div>
      </Section>

      {/* CardGroup */}
      <Section title="CardGroup">
        <p className="cs-preview-pages-components-page-169 ">
          Cards inside a CardGroup can be maximized to fill the container, hiding siblings.
        </p>
        <div className="cs-preview-pages-components-page-341 ">
          <CardGroup>
            <Card id="cg-first" maximizable header="First Card">
              <p className="cs-preview-pages-components-page-344 ">
                This card has a maximize button. Click it to fill the container.
              </p>
            </Card>
            <Card id="cg-second" maximizable header="Second Card">
              <p className="cs-preview-pages-components-page-344 ">
                This card also has a maximize button.
              </p>
            </Card>
            <Card header="Third Card (not maximizable)">
              <p className="cs-preview-pages-components-page-344 ">
                This card has no maximize button but hides when a sibling is maximized.
              </p>
            </Card>
          </CardGroup>
        </div>
      </Section>

      {/* StatusBadge */}
      <Section title="StatusBadge">
        <div className="cs-preview-pages-components-page-349 ">
          <StatusBadge label="Passing" status="success" />
          <StatusBadge label="Warning" status="warning" />
          <StatusBadge label="Failing" status="error" />
          <StatusBadge label="Critical" status="error" emphasis="label" />
          <StatusBadge label="High" status="severe" emphasis="label" />
          <StatusBadge label="Pending" status="neutral" />
        </div>
      </Section>

      {/* HighlightText */}
      <Section title="HighlightText">
        <div className="cs-preview-pages-components-page-359 ">
          <div className="cs-preview-pages-components-page-360 ">
            <label htmlFor="highlight-query" className="cs-preview-pages-components-page-169 ">
              Query:
            </label>
            <Input
              id="highlight-query"
              size="sm"
              value={highlightQuery}
              onChange={(e) => setHighlightQuery(e.target.value)}
              placeholder="Type to highlight..."
            />
          </div>
          <div className="cs-preview-pages-components-page-365 ">
            <p className="cs-preview-pages-components-page-366">
              <HighlightText
                text="The AuthHandler validates JWT tokens and attaches user context."
                query={highlightQuery}
              />
            </p>
            <p className="cs-preview-pages-components-page-366">
              <HighlightText
                text="src/auth/login.ts:42 — authenticate(email, password)"
                query={highlightQuery}
                className="cs-preview-pages-components-page-369"
              />
            </p>
            <p className="cs-preview-pages-components-page-370 ">
              No match here:{" "}
              <HighlightText
                text="This sentence has no matching substring."
                query={highlightQuery}
              />
            </p>
          </div>
        </div>
      </Section>

      {/* Input */}
      <Section title="Input">
        <p className="cs-preview-pages-components-page-305 ">
          Text input with type variants, sizes, error state, prefix/suffix slots, and a multiline (textarea) mode.
        </p>
        <InputDemo />
      </Section>

      {/* FormGroup */}
      <Section title="FormGroup">
        <p className="cs-preview-pages-components-page-305 ">
          Label + control + helper/error composition. Auto-wires <code className="cs-preview-pages-components-page-375 ">htmlFor</code>, <code className="cs-preview-pages-components-page-375 ">aria-describedby</code>, and <code className="cs-preview-pages-components-page-375 ">aria-invalid</code>. Type a non-email below to see the error state.
        </p>
        <FormGroupDemo />
      </Section>

      {/* Dropdown */}
      <Section title="Dropdown">
        <div className="cs-preview-pages-components-page-377 ">
          <Dropdown
            value={dropdownValue}
            onChange={setDropdownValue}
            options={sampleDropdownOptions}
          />
          <Dropdown
            value=""
            onChange={() => {}}
            options={sampleDropdownOptions}
            placeholder="Select framework..."
          />
          <Dropdown
            value="react"
            onChange={() => {}}
            options={sampleDropdownOptions}
            disabled
          />
        </div>
      </Section>

      {/* SearchInput */}
      <Section title="SearchInput">
        <div className="cs-preview-pages-components-page-40">
          <p className="cs-preview-pages-components-page-169 ">
            Manual search — press Enter or click the search icon.
          </p>
          <div className="cs-preview-pages-components-page-382 ">
            <SearchInput
              value={searchValue}
              onChange={setSearchValue}
              onSearch={handleSearchDemo}
              placeholder="Manual search..."
            />
            {searchResult && (
              <span className="cs-preview-pages-components-page-169 ">
                {searchResult}
              </span>
            )}
          </div>
          <p className="cs-preview-pages-components-page-169 ">
            Auto-search — fires after 3+ characters with 300ms debounce.
          </p>
          <div className="cs-preview-pages-components-page-382 ">
            <SearchInput
              value={searchAutoValue}
              onChange={setSearchAutoValue}
              onSearch={handleSearchAutoDemo}
              placeholder="Auto-search (3+ chars)..."
              minChars={3}
            />
            {searchAutoResult && (
              <span className="cs-preview-pages-components-page-169 ">
                {searchAutoResult}
              </span>
            )}
          </div>
          <div className="cs-preview-pages-components-page-382 ">
            <SearchInput
              value=""
              onChange={() => {}}
              onSearch={() => {}}
              placeholder="Disabled search..."
              disabled
            />
          </div>
        </div>
      </Section>

      {/* CheckboxGroup */}
      <Section title="CheckboxGroup">
        <div className="cs-preview-pages-components-page-388 ">
          <div className="cs-preview-pages-components-page-389">
            <p className="cs-preview-pages-components-page-390 ">
              Flat with color dots.
            </p>
            <div className="cs-preview-pages-components-page-391">
              <CheckboxGroup
                options={cbOptions}
                selected={cbSelected}
                onChange={setCbSelected}
                label="File types"
              />
            </div>
            <p className="cs-preview-pages-components-page-393 ">
              Selected: {[...cbSelected].join(", ") || "none"}
            </p>
          </div>
          <div className="cs-preview-pages-components-page-389">
            <p className="cs-preview-pages-components-page-390 ">
              Filterable (10 options).
            </p>
            <div className="cs-preview-pages-components-page-391">
              <CheckboxGroup
                options={cbFilterableOptions}
                selected={cbFilterableSelected}
                onChange={setCbFilterableSelected}
                label="Extensions"
                filterable
                filterPlaceholder="Find type..."
              />
            </div>
            <p className="cs-preview-pages-components-page-393 ">
              Selected: {cbFilterableSelected.size} of {cbFilterableOptions.length}
            </p>
          </div>
          <div className="cs-preview-pages-components-page-389">
            <p className="cs-preview-pages-components-page-390 ">
              Grouped with sections.
            </p>
            <div className="cs-preview-pages-components-page-398 ">
              <CheckboxGroup
                options={cbGroupedOptions}
                selected={cbGroupedSelected}
                onChange={setCbGroupedSelected}
                label="By category"
                filterable
                filterPlaceholder="Find type..."
              />
            </div>
            <p className="cs-preview-pages-components-page-393 ">
              Selected: {cbGroupedSelected.size} of {cbGroupedOptions.length}
            </p>
          </div>
        </div>
      </Section>

      {/* RadioGroup */}
      <Section title="RadioGroup">
        <p className="cs-preview-pages-components-page-305 ">
          An exclusive choice among options that each need a line of explanation —
          the case <code>SegmentedControl</code> (compact, 2–5, no descriptions) and{" "}
          <code>Dropdown</code> (options hidden until opened) do not cover.
        </p>
        <div className="cs-preview-pages-components-page-388 ">
          <div className="cs-preview-pages-components-page-389">
            <p className="cs-preview-pages-components-page-390 ">
              Vertical, with descriptions and a disabled option.
            </p>
            <div className="cs-preview-pages-components-page-391">
              <RadioGroup
                options={radioOptions}
                value={radioValue}
                onChange={setRadioValue}
                aria-label="Card density"
              />
            </div>
            <p className="cs-preview-pages-components-page-393 ">
              Selected: {radioValue}
            </p>
          </div>
          <div className="cs-preview-pages-components-page-389">
            <p className="cs-preview-pages-components-page-390 ">
              Horizontal — a short row of short labels, no descriptions.
            </p>
            <div className="cs-preview-pages-components-page-391">
              <RadioGroup
                options={radioRowOptions}
                value={radioRowValue}
                onChange={setRadioRowValue}
                orientation="horizontal"
                aria-label="Theme preference"
              />
            </div>
            <p className="cs-preview-pages-components-page-393 ">
              Selected: {radioRowValue}
            </p>
          </div>
        </div>
      </Section>

      {/* ThemeToggle */}
      <Section title="ThemeToggle">
        <div className="cs-preview-pages-components-page-402 ">
          <div className="cs-preview-pages-components-page-403 ">
            <ThemeToggle variant="icon-cycle" />
          </div>
          <ThemeToggle variant="radio-group" />
        </div>
      </Section>

      {/* EventLanes */}
      <Section title="EventLanes">
        <EventLanesDemo />
      </Section>

      {/* Table */}
      <Section title="Table">
        <Table
          columns={[
            {
              id: "name",
              header: "Component",
              sortable: true,
              searchValue: (row) => row.name,
              cell: (row, filterQuery) => (
                <HighlightText text={row.name} query={filterQuery} />
              ),
            },
            {
              id: "status",
              header: "Status",
              searchValue: (row) => row.status,
              wrap: true,
              cell: (row) => (
                <StatusBadge
                  label={row.status}
                  status={row.status === "stable" ? "success" : "warning"}
                />
              ),
            },
            {
              id: "props",
              header: "Props",
              cell: (row) => row.props,
              sortable: true,
              align: "right",
            },
            {
              id: "group",
              header: "Group",
              searchValue: (row) => row.group,
              cell: (row, filterQuery) => (
                <HighlightText text={row.group} query={filterQuery} />
              ),
            },
          ]}
          data={sortedTableData}
          rowKey={(row) => row.id}
          selectedKey={selectedTableRow}
          onRowClick={(row) => setSelectedTableRow(row.id)}
          sort={sort}
          onSort={(columnId, direction) => setSort({ columnId, direction })}
          filterable
          pageSize={5}
        />
      </Section>

      {/* Panel + Tree (with filterable) */}
      <Section title="Panel + Tree">
        <p className="cs-preview-pages-components-page-169 ">
          Tree with search/filter, display mode toggle, match navigation, and expand all.
        </p>
        <div className="cs-preview-pages-components-page-422 ">
          <Panel title="File Explorer" width={280} collapsed={panelCollapsed} onCollapse={() => setPanelCollapsed((value) => !value)}>
            <Tree
              nodes={sampleTreeNodes}
              expandedIds={expandedIds}
              selectedId={selectedTreeId}
              onToggle={(id) => {
                setExpandedIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                });
                setAllTreeExpanded(false);
              }}
              onSelect={(node: TreeNode) => setSelectedTreeId(node.id)}
              filterable
              filterPlaceholder="Search files..."
              onToggleExpandAll={() => {
                setAllTreeExpanded((prev) => {
                  const next = !prev;
                  if (next) {
                    // Expand all branches
                    const allBranches = new Set<string>();
                    const walk = (nodes: TreeNode[]) => {
                      for (const n of nodes) {
                        if (n.type === "branch") {
                          allBranches.add(n.id);
                          if (n.children) walk(n.children);
                        }
                      }
                    };
                    walk(sampleTreeNodes);
                    setExpandedIds(allBranches);
                  } else {
                    setExpandedIds(new Set());
                  }
                  return next;
                });
              }}
              allExpanded={allTreeExpanded}
            />
          </Panel>
          <div className="cs-preview-pages-components-page-426 ">
            {selectedTreeId
              ? `Selected: ${selectedTreeId}`
              : "Select a file from the tree"}
          </div>
        </div>
      </Section>

      {/* SectionedTree */}
      <Section title="SectionedTree">
        <p className="cs-preview-pages-components-page-169 ">
          Multiple independent tree sections with collapsible headers, per-section search, and shared selection.
        </p>
        <div className="cs-preview-pages-components-page-431 ">
          <Panel title="Explorer" width={300}>
            <SectionedTree
              sections={stSections}
              selectedId={stSelectedId}
              onSelect={(node: TreeNode) => setStSelectedId(node.id)}
            />
          </Panel>
          <div className="cs-preview-pages-components-page-426 ">
            {stSelectedId
              ? `Selected: ${stSelectedId}`
              : "Select a node from any section"}
          </div>
        </div>
      </Section>

      {/* SectionedTree (flipped) */}
      <Section title="SectionedTree (flipped)">
        <p className="cs-preview-pages-components-page-169 ">
          Mirror-image tree — indentation grows right-to-left. Same data, <code>flipped</code> prop.
        </p>
        <div className="cs-preview-pages-components-page-431 ">
          <div className="cs-preview-pages-components-page-426 ">
            {stFlippedSelectedId
              ? `Selected: ${stFlippedSelectedId}`
              : "Select a node from any section"}
          </div>
          <Panel title="Explorer (flipped)" width={300}>
            <SectionedTree
              sections={stSections}
              selectedId={stFlippedSelectedId}
              onSelect={(node: TreeNode) => setStFlippedSelectedId(node.id)}
              flipped
            />
          </Panel>
        </div>
      </Section>

      {/* SplitPane */}
      <Section title="SplitPane">
        <div className="cs-preview-pages-components-page-442 ">
          <SplitPane
            panes={[
              {
                id: "left",
                defaultWidth: 200,
                minWidth: 100,
                maxWidth: 400,
                children: (
                  <div className="cs-preview-pages-components-page-444 ">
                    Left Pane (resizable)
                  </div>
                ),
              },
              {
                id: "center",
                children: (
                  <div className="cs-preview-pages-components-page-446 ">
                    Center (flex-fill)
                  </div>
                ),
              },
              {
                id: "right",
                defaultWidth: 180,
                minWidth: 100,
                maxWidth: 300,
                children: (
                  <div className="cs-preview-pages-components-page-444 ">
                    Right Pane
                  </div>
                ),
              },
            ]}
          />
        </div>
      </Section>

      {/* Master-Detail (SplitPane in contained layout) */}
      <Section title="Master-Detail (contained SplitPane)">
        <div className="cs-preview-pages-components-page-341 ">
          <SplitPane
            panes={[
              {
                id: "md-list",
                defaultWidth: 340,
                minWidth: 240,
                maxWidth: 500,
                children: (
                  <div className="cs-preview-pages-components-page-454 ">
                    <Table<ClassRecord>
                      columns={[
                        {
                          id: "name",
                          header: "Name",
                          sortable: true,
                          cell: (row) => row.name,
                        },
                        {
                          id: "package",
                          header: "Pkg",
                          sortable: true,
                          cell: (row) => (
                            <span className="cs-preview-pages-components-page-459">{row.package}</span>
                          ),
                        },
                        {
                          id: "status",
                          header: "Status",
                          width: "90px",
                          cell: (row) => (
                            <StatusBadge label={row.status} status={row.status} />
                          ),
                        },
                      ]}
                      data={mdSorted}
                      rowKey={(row) => row.name}
                      sort={mdSort}
                      onSort={(columnId, direction) => setMdSort({ columnId, direction })}
                      onRowClick={(row) => setMdSelected(row.name)}
                      selectedKey={mdSelected}
                    />
                  </div>
                ),
              },
              {
                id: "md-detail",
                children: (
                  <div className="cs-preview-pages-components-page-454 ">
                    {mdDetail ? (
                      <Card header={mdDetail.name}>
                        <div className="cs-preview-pages-components-page-464 ">
                          <div className="cs-preview-pages-components-page-360 ">
                            <StatusBadge label={mdDetail.status} status={mdDetail.status} />
                            <span className="cs-preview-pages-components-page-451 ">
                              {mdDetail.package}
                            </span>
                          </div>
                          <p className="cs-preview-pages-components-page-465 ">
                            {mdDetail.description}
                          </p>
                          <CodeBlock
                            code={mdDetail.code}
                            language="typescript"
                            source={`${mdDetail.package}/${mdDetail.name}.ts`}
                          />
                        </div>
                      </Card>
                    ) : (
                      <div className="cs-preview-pages-components-page-470 ">
                        Select a class from the table
                      </div>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </div>
      </Section>

      {/* CodeBlock */}
      <Section title="CodeBlock">
        <CodeBlock
          code={sampleCode}
          language="tsx"
          source="src/components/Counter.tsx"
          highlightedLines={[5, 6]}
        />
      </Section>

      {/* MarkdownViewer */}
      <Section title="MarkdownViewer">
        <p className="cs-preview-pages-components-page-305 ">
          Rich markdown renderer with heading outline and canvas minimap. This is
          the top of a ladder: see{" "}
          <a href="?page=patterns&tab=markdown-viewer">
            Patterns → Markdown Viewer
          </a>{" "}
          for the four flavors side by side and what each one costs.
        </p>
        <div className="cs-preview-pages-components-page-341 ">
          <MarkdownViewer {...richMarkdownProps} content={sampleMarkdown} outline minimap />
        </div>
      </Section>

      {/* MarkdownMinimap */}
      <Section title="MarkdownMinimap">
        <p className="cs-preview-pages-components-page-305 ">
          Standalone overview navigation for an independently scrollable long-form container.
        </p>
        <MarkdownMinimapDemo />
      </Section>

      {/* MermaidDiagram */}
      <Section title="MermaidDiagram">
        <p className="cs-preview-pages-components-page-305 ">
          Theme-aware Mermaid rendering, shown in both standard and sketch treatments.
        </p>
        <div className="cs-preview-pages-components-page-334 ">
          <Card header="Standard">
            <MermaidDiagram chart={"flowchart LR\n  Source --> Analyze\n  Analyze --> Report"} />
          </Card>
          <Card header="Sketch">
            <MermaidDiagram
              chart={"flowchart TD\n  Prompt --> Agent\n  Agent --> Tools\n  Tools --> Result"}
              sketch
              sketchHandwriting
            />
          </Card>
        </div>
      </Section>

      {/* Modal */}
      <Section title="Modal">
        <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
        {modalOpen && (
          <Modal
            title="Example Modal"
            onClose={() => setModalOpen(false)}
            actions={
              <>
                <Button
                  variant="secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => setModalOpen(false)}>
                  Confirm
                </Button>
              </>
            }
          >
            <p className="cs-preview-pages-components-page-485">
              This is a modal dialog. It closes on Escape key, backdrop click,
              or the close button. The footer contains action buttons.
            </p>
            <div className="cs-preview-pages-components-page-486 ">
              <Card variant="muted">
                Content inside the modal can include any component.
              </Card>
            </div>
          </Modal>
        )}
      </Section>

      {/* PulseBadge */}
      <Section title="PulseBadge">
        <p className="cs-preview-pages-components-page-305 ">
          Pulsing dot signaling live activity. Sizes, paused (static), and custom color.
        </p>
        <div className="cs-preview-pages-components-page-489 ">
          <span className="cs-preview-pages-components-page-490 "><PulseBadge size="sm" /> sm</span>
          <span className="cs-preview-pages-components-page-490 "><PulseBadge size="md" /> md</span>
          <span className="cs-preview-pages-components-page-490 "><PulseBadge size="lg" /> lg</span>
          <span className="cs-preview-pages-components-page-490 "><PulseBadge paused /> paused</span>
          <span className="cs-preview-pages-components-page-490 "><PulseBadge color="var(--color-warning)" /> warning</span>
        </div>
      </Section>

      {/* AgentStatus */}
      <Section title="AgentStatus">
        <p className="cs-preview-pages-components-page-305 ">
          Single-line agent work status. One row per state.
        </p>
        <div className="cs-preview-pages-components-page-464 ">
          <AgentStatus state="in-flight">Inferring contracts for auth.legacy…</AgentStatus>
          <AgentStatus state="paused">Waiting for human review on 3 callsites</AgentStatus>
          <AgentStatus state="settled">Generated 412 parity specs</AgentStatus>
          <AgentStatus state="error">Failed to read repo manifest</AgentStatus>
        </div>
      </Section>

      {/* StreamingText */}
      <Section title="StreamingText">
        <p className="cs-preview-pages-components-page-305 ">
          Character-reveal output with a blinking cursor. Replay to watch the reveal; "Mark done" snaps to full and drops the cursor.
        </p>
        <StreamingTextDemo />
      </Section>

      {/* AgentTrace */}
      <Section title="AgentTrace">
        <p className="cs-preview-pages-components-page-305 ">
          Chronological agent steps with status icons, timestamps, and expandable detail (click a row with a chevron). Toggle the loading/error/empty states.
        </p>
        <AgentTraceDemo />
      </Section>

      {/* ChartFrame */}
      <Section title="ChartFrame">
        <p className="cs-preview-pages-components-page-305 ">
          Card frame owning a chart's loading/error/empty states. The chart (an inline SVG sparkline here) only renders the happy path.
        </p>
        <ChartFrameDemo />
      </Section>

      {/* ChartTooltip */}
      <Section title="ChartTooltip">
        <p className="cs-preview-pages-components-page-305 ">
          Token-styled, absolutely-positioned tooltip. The chart supplies cursor coordinates + content; the box owns the chrome.
        </p>
        <ChartTooltipDemo />
      </Section>

      {/* Toast */}
      <Section title="Toast">
        <p className="cs-preview-pages-components-page-305 ">
          All four single-toast variants with persistent preview fixtures.
        </p>
        <div className="cs-preview-pages-components-page-505 ">
          {previewToasts.map((item) => (
            <Toast key={item.id} item={item} onDismiss={() => {}} />
          ))}
        </div>
      </Section>

      {/* ToastContainer */}
      <Section title="ToastContainer">
        <p className="cs-preview-pages-components-page-305 ">
          Trigger notifications to exercise the global fixed-position stack and dismiss behavior.
        </p>
        <div className="cs-preview-pages-components-page-122 ">
          <Button onClick={() => toast.success("Preview saved")}>Success toast</Button>
          <Button variant="warning" onClick={() => toast.warning("Review requested", { duration: null })}>Warning toast</Button>
          <Button variant="danger" onClick={() => toast.error("Preview failed", { important: true })}>Error toast</Button>
          <Button variant="secondary" onClick={() => toast.info("Analysis running")}>Info toast</Button>
          <Button variant="ghost" onClick={() => toast.clear()}>Clear all</Button>
        </div>
        <ToastContainer />
      </Section>
    </div>
  );
}

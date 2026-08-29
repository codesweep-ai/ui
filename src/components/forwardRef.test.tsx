import { createRef } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AgentStatus } from "./AgentStatus";
import { AgentTrace } from "./AgentTrace";
import { AppShell, Footer, Header } from "./AppShell";
import { Card } from "./Card";
import { CardGroup } from "./CardGroup";
import { ChartFrame } from "./ChartFrame";
import { ChartTooltip } from "./ChartTooltip";
import { CheckboxGroup } from "./CheckboxGroup";
import { CodeBlock } from "./CodeBlock";
import { Dropdown } from "./Dropdown";
import { EventLanes } from "./EventLanes";
import { FormGroup } from "./FormGroup";
import { HighlightText } from "./HighlightText";
import { MarkdownMinimap } from "./MarkdownMinimap";
import { MarkdownViewer } from "./MarkdownViewer";
import { MermaidDiagram } from "./MermaidDiagram";
import { Modal } from "./Modal";
import { Panel } from "./Panel";
import { PulseBadge } from "./PulseBadge";
import { SearchInput } from "./SearchInput";
import { SectionedTree } from "./SectionedTree";
import { Skeleton } from "./Skeleton";
import { SplitPane } from "./SplitPane";
import { StatusBadge } from "./StatusBadge";
import { StreamingText } from "./StreamingText";
import { Table } from "./Table";
import { ThemeToggle } from "./ThemeToggle";
import { Toast } from "./Toast";
import { ToastContainer } from "./ToastContainer";
import { Tree } from "./Tree";

vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async () => ({ svg: "<svg><g>diagram</g></svg>" })),
  },
}));

function expectComponent(ref: { current: Element | null }, name: string) {
  expect(ref.current).not.toBeNull();
  expect(ref.current).toHaveAttribute("data-component", name);
}

describe("component root refs", () => {
  it("forwards AgentStatus ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<AgentStatus ref={ref} state="settled">Done</AgentStatus>);
    expectComponent(ref, "AgentStatus");
  });

  it("forwards AgentTrace ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<AgentTrace ref={ref} steps={[]} />);
    expectComponent(ref, "AgentTrace");
  });

  it("forwards Header ref", () => {
    const ref = createRef<HTMLElement>();
    render(<Header ref={ref} title="App" />);
    expectComponent(ref, "Header");
  });

  it("forwards Footer ref", () => {
    const ref = createRef<HTMLElement>();
    render(<Footer ref={ref}>Footer</Footer>);
    expectComponent(ref, "Footer");
  });

  it("forwards AppShell ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<AppShell ref={ref}>App</AppShell>);
    expectComponent(ref, "AppShell");
  });

  it("forwards Card ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Card ref={ref}>Card</Card>);
    expectComponent(ref, "Card");
  });

  it("forwards CardGroup ref through its provider", () => {
    const ref = createRef<HTMLDivElement>();
    render(<CardGroup ref={ref}><Card>Card</Card></CardGroup>);
    expectComponent(ref, "CardGroup");
  });

  it("forwards ChartFrame ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<ChartFrame ref={ref}><div /></ChartFrame>);
    expectComponent(ref, "ChartFrame");
  });

  it("forwards ChartTooltip ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<ChartTooltip ref={ref} x={0} y={0}>Value</ChartTooltip>);
    expectComponent(ref, "ChartTooltip");
  });

  it("forwards CheckboxGroup ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<CheckboxGroup ref={ref} options={[]} selected={new Set()} onChange={() => {}} />);
    expectComponent(ref, "CheckboxGroup");
  });

  it("forwards CodeBlock ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<CodeBlock ref={ref} code="const x = 1" />);
    expectComponent(ref, "CodeBlock");
  });

  it("forwards Dropdown ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Dropdown ref={ref} value="" options={[]} onChange={() => {}} />);
    expectComponent(ref, "Dropdown");
  });

  it("forwards FormGroup ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<FormGroup ref={ref}><input /></FormGroup>);
    expectComponent(ref, "FormGroup");
  });

  it("forwards HighlightText ref", () => {
    const ref = createRef<HTMLSpanElement>();
    render(<HighlightText ref={ref} text="hello" />);
    expectComponent(ref, "HighlightText");
  });

  it("forwards MarkdownMinimap ref", () => {
    const ref = createRef<HTMLDivElement>();
    const contentRef = createRef<HTMLDivElement>();
    render(<MarkdownMinimap ref={ref} contentRef={contentRef} />);
    expectComponent(ref, "MarkdownMinimap");
  });

  it("forwards MarkdownViewer ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<MarkdownViewer ref={ref} content="# Hello" />);
    expectComponent(ref, "MarkdownViewer");
  });

  it("forwards MermaidDiagram ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<MermaidDiagram ref={ref} chart="graph TD; A-->B" />);
    expectComponent(ref, "MermaidDiagram");
  });

  it("forwards Modal ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Modal ref={ref} title="Dialog" onClose={() => {}}>Body</Modal>);
    expectComponent(ref, "Modal");
  });

  it("forwards Panel ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Panel ref={ref} title="Panel">Body</Panel>);
    expectComponent(ref, "Panel");
  });

  it("forwards PulseBadge ref", () => {
    const ref = createRef<HTMLSpanElement>();
    render(<PulseBadge ref={ref} />);
    expectComponent(ref, "PulseBadge");
  });

  it("forwards SearchInput ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<SearchInput ref={ref} value="" onChange={() => {}} onSearch={() => {}} />);
    expectComponent(ref, "SearchInput");
  });

  it("forwards SectionedTree ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<SectionedTree ref={ref} sections={[]} />);
    expectComponent(ref, "SectionedTree");
  });

  it("forwards Skeleton ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Skeleton ref={ref} />);
    expectComponent(ref, "Skeleton");
  });

  it("forwards SplitPane ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<SplitPane ref={ref} panes={[{ id: "a", children: "A" }, { id: "b", children: "B" }]} />);
    expectComponent(ref, "SplitPane");
  });

  it("forwards StatusBadge ref", () => {
    const ref = createRef<HTMLSpanElement>();
    render(<StatusBadge ref={ref} label="Ready" status="success" />);
    expectComponent(ref, "StatusBadge");
  });

  it("forwards EventLanes ref while retaining its internal refs", () => {
    const ref = createRef<HTMLDivElement>();
    render(<EventLanes ref={ref} lanes={[]} events={[]} palette={{}} />);
    expectComponent(ref, "EventLanes");
  });

  it("forwards StreamingText ref", () => {
    const ref = createRef<HTMLSpanElement>();
    render(<StreamingText ref={ref} text="Done" done />);
    expectComponent(ref, "StreamingText");
  });

  it("forwards Table ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Table ref={ref} columns={[]} data={[]} rowKey={() => "row"} />);
    expectComponent(ref, "Table");
  });

  it("forwards ThemeToggle ref", () => {
    const ref = createRef<HTMLElement>();
    render(<ThemeToggle ref={ref} />);
    expectComponent(ref, "ThemeToggle");
  });

  it("forwards Toast ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Toast ref={ref} item={{ id: "1", variant: "info", message: "Saved", duration: null, important: false }} onDismiss={() => {}} />);
    expectComponent(ref, "Toast");
  });

  it("forwards ToastContainer ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<ToastContainer ref={ref} />);
    expectComponent(ref, "ToastContainer");
  });

  it("forwards Tree ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Tree ref={ref} nodes={[]} expandedIds={new Set()} />);
    expectComponent(ref, "Tree");
  });
});

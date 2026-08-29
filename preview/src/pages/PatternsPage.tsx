import { useState, useCallback } from "react";
import { ExplorerDemo } from "./patterns/ExplorerDemo";
import { DashboardDemo } from "./patterns/DashboardDemo";
import { MasterDetailDemo } from "./patterns/MasterDetailDemo";
import { FormResultsDemo } from "./patterns/FormResultsDemo";
import { DataTableDemo } from "./patterns/DataTableDemo";
import { MarkdownViewerDemo } from "./patterns/MarkdownViewerDemo";
import { FormDemo } from "./patterns/FormDemo";
import { AgentActivityDemo } from "./patterns/AgentActivityDemo";
import { ChartDemo } from "./patterns/ChartDemo";

const tabs = [
  { id: "explorer", label: "Explorer" },
  { id: "dashboard", label: "Dashboard" },
  { id: "master-detail", label: "Master-Detail" },
  { id: "form", label: "Form" },
  { id: "agent-activity", label: "Agent Activity" },
  { id: "chart", label: "Chart" },
  { id: "form-results", label: "Form + Results" },
  { id: "data-table", label: "Data Table" },
  { id: "markdown-viewer", label: "Markdown Viewer" },
] as const;

type PatternTab = (typeof tabs)[number]["id"];

const validTabs: PatternTab[] = tabs.map((t) => t.id);

function readTabFromURL(): PatternTab {
  const params = new URLSearchParams(window.location.search);
  const t = params.get("tab");
  if (t && validTabs.includes(t as PatternTab)) return t as PatternTab;
  return "explorer";
}

export function PatternsPage() {
  const [active, setActiveState] = useState<PatternTab>(readTabFromURL);

  const setActive = useCallback((tab: PatternTab) => {
    setActiveState(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url.toString());
  }, []);

  return (
    <div className="cs-preview-pages-patterns-page-37 ">
      <h1 className="cs-preview-pages-patterns-page-46">
        {tabs.find((tab) => tab.id === active)?.label} pattern
      </h1>
      <div className="cs-preview-pages-patterns-page-38 ">
        {tabs.map((t) => (
          <a
            key={t.id}
            href={`?page=patterns&tab=${t.id}`}
            onClick={(e) => {
              e.preventDefault();
              setActive(t.id);
            }}
            className={`cs-preview-pages-patterns-page-41 ${
              active === t.id
                ? "cs-preview-pages-patterns-page-42 "
                : "cs-preview-pages-patterns-page-43 "
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>
      <div className="cs-preview-pages-patterns-page-45 ">
        {active === "explorer" && <ExplorerDemo />}
        {active === "dashboard" && <DashboardDemo />}
        {active === "master-detail" && <MasterDetailDemo />}
        {active === "form" && <FormDemo />}
        {active === "agent-activity" && <AgentActivityDemo />}
        {active === "chart" && <ChartDemo />}
        {active === "form-results" && <FormResultsDemo />}
        {active === "data-table" && <DataTableDemo />}
        {active === "markdown-viewer" && <MarkdownViewerDemo />}
      </div>
    </div>
  );
}

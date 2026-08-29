import { useState } from "react";
import {
  AgentStatus,
  StreamingText,
  AgentTrace,
  type AgentTraceStep,
  Button,
} from "@codesweep-ai/ui";

const STREAM =
  "The handleAuth function maps cookie-based sessions to OIDC subjects. I'll generate parity tests covering the legacy and v2 paths, then flag any callsite that can't be mechanically migrated…";

const settledSteps: AgentTraceStep[] = [
  { id: "1", status: "success", label: "Read 142 files", timestamp: "10:01" },
  { id: "2", status: "success", label: "Inferred 38 contracts", timestamp: "10:02", detail: "Cookie sessions → OIDC subjects across auth.legacy and auth.v2." },
  { id: "3", status: "success", label: "Generated 412 parity specs", timestamp: "10:03" },
  { id: "4", status: "warning", label: "3 callsites need human review", timestamp: "10:04", detail: "src/legacy/login.ts:42 · src/legacy/sso.ts:88 · src/legacy/logout.ts:12" },
];

export function AgentActivityDemo() {
  const [runId, setRunId] = useState(0);
  const [done, setDone] = useState(false);

  return (
    <div className="cs-preview-pages-patterns-agent-activity-demo-22 ">
      <div className="cs-preview-pages-patterns-agent-activity-demo-23 ">
        <div>
          <h2 className="cs-preview-pages-patterns-agent-activity-demo-24 ">Agent activity panel</h2>
          <p className="cs-preview-pages-patterns-agent-activity-demo-25 ">
            The canonical composition: <code className="cs-preview-pages-patterns-agent-activity-demo-26 ">AgentStatus</code> (in-flight) → <code className="cs-preview-pages-patterns-agent-activity-demo-26 ">StreamingText</code> (live output) → <code className="cs-preview-pages-patterns-agent-activity-demo-26 ">AgentTrace</code> (settled history). See <code className="cs-preview-pages-patterns-agent-activity-demo-26 ">patterns/AgentActivity.md</code>.
          </p>
        </div>

        <Button size="sm" onClick={() => { setDone(false); setRunId((n) => n + 1); }}>
          Replay
        </Button>

        <div className="cs-preview-pages-patterns-agent-activity-demo-28 ">
          <div className="cs-preview-pages-patterns-agent-activity-demo-29">
            <AgentStatus state={done ? "settled" : "in-flight"}>
              {done ? "Finished inferring contracts for auth.legacy" : "Inferring contracts for auth.legacy…"}
            </AgentStatus>
          </div>
          <div className="cs-preview-pages-patterns-agent-activity-demo-29">
            <StreamingText key={runId} text={STREAM} speed={55} done={done} onDone={() => setDone(true)} />
          </div>
          <div className="cs-preview-pages-patterns-agent-activity-demo-29">
            <AgentTrace steps={settledSteps} />
          </div>
        </div>
      </div>
    </div>
  );
}

import type { TreeNode, TreeSection } from "@codesweep-ai/ui";

/**
 * A documentation site's navigation, at the size where the layout question
 * actually bites: seven sections, 52 entries, three of them nested. A sidebar of
 * three items proves nothing, because everything fits.
 */

const leaf = (id: string, name: string): TreeNode => ({ id, name, type: "leaf" });

const branch = (id: string, name: string, children: TreeNode[]): TreeNode => ({
  id,
  name,
  type: "branch",
  children,
});

export const navSections: TreeSection[] = [
  {
    id: "start",
    label: "Getting started",
    nodes: [
      leaf("start/install", "Installation"),
      leaf("start/first-run", "Your first run"),
      leaf("start/config", "Configuration file"),
      leaf("start/editor", "Editor integration"),
      leaf("start/upgrade", "Upgrading"),
    ],
  },
  {
    id: "concepts",
    label: "Concepts",
    nodes: [
      leaf("concepts/model", "The scan model"),
      leaf("concepts/rules", "Rules and rulesets"),
      leaf("concepts/severity", "Severity levels"),
      branch("concepts/suppression", "Suppression", [
        leaf("concepts/suppression/inline", "Inline comments"),
        leaf("concepts/suppression/file", "File-level ignores"),
        leaf("concepts/suppression/baseline", "Baselines"),
      ]),
      leaf("concepts/caching", "Incremental caching"),
      leaf("concepts/exit-codes", "Exit codes"),
    ],
  },
  {
    id: "cli",
    label: "Command line",
    nodes: [
      leaf("cli/scan", "scan"),
      leaf("cli/watch", "watch"),
      leaf("cli/explain", "explain"),
      leaf("cli/baseline", "baseline"),
      leaf("cli/report", "report"),
      leaf("cli/rules", "rules"),
      leaf("cli/cache", "cache"),
      leaf("cli/doctor", "doctor"),
      leaf("cli/completions", "completions"),
    ],
  },
  {
    id: "rules",
    label: "Rule reference",
    nodes: [
      branch("rules/correctness", "Correctness", [
        leaf("rules/correctness/unreachable", "unreachable-branch"),
        leaf("rules/correctness/await", "floating-await"),
        leaf("rules/correctness/compare", "always-true-compare"),
        leaf("rules/correctness/shadow", "shadowed-binding"),
      ]),
      branch("rules/security", "Security", [
        leaf("rules/security/injection", "template-injection"),
        leaf("rules/security/secrets", "hardcoded-secret"),
        leaf("rules/security/tls", "insecure-tls-options"),
      ]),
      branch("rules/style", "Style", [
        leaf("rules/style/naming", "inconsistent-naming"),
        leaf("rules/style/imports", "unsorted-imports"),
      ]),
      leaf("rules/writing-your-own", "Writing your own"),
      leaf("rules/testing", "Testing a rule"),
    ],
  },
  {
    id: "integrations",
    label: "Integrations",
    nodes: [
      leaf("integrations/github", "GitHub Actions"),
      leaf("integrations/gitlab", "GitLab CI"),
      leaf("integrations/jenkins", "Jenkins"),
      leaf("integrations/precommit", "pre-commit"),
      leaf("integrations/sarif", "SARIF output"),
      leaf("integrations/slack", "Slack notifications"),
      leaf("integrations/webhooks", "Webhooks"),
    ],
  },
  {
    id: "api",
    label: "API",
    nodes: [
      leaf("api/scan", "scan()"),
      leaf("api/loadConfig", "loadConfig()"),
      leaf("api/defineRule", "defineRule()"),
      leaf("api/formatters", "formatters"),
      leaf("api/types", "Types"),
      leaf("api/errors", "Errors"),
    ],
  },
  {
    id: "help",
    label: "Troubleshooting",
    nodes: [
      leaf("help/slow", "Scans are slow"),
      leaf("help/false-positives", "False positives"),
      leaf("help/memory", "Out of memory"),
      leaf("help/support", "Getting support"),
    ],
  },
];

/** Every branch open, so the sidebar shows its real height rather than a stub. */
export const navExpandedIds = new Set(
  navSections.flatMap((section) =>
    section.nodes.filter((node) => node.type === "branch").map((node) => node.id),
  ),
);

/** Deep enough that reaching it proves the sidebar follows the page's selection. */
export const navSelectedId = "rules/security/injection";

/** One line per section, so the content pane says something rather than nothing. */
export const navSectionBlurbs: Record<string, string> = {
  start: "Getting the scanner onto a machine and pointed at a repository.",
  concepts: "The vocabulary the rest of the documentation assumes.",
  cli: "Every subcommand, its flags, and what it writes to stdout.",
  rules: "What each rule looks for, why it fires, and how to silence it honestly.",
  integrations: "Running the scanner where the rest of the pipeline already lives.",
  api: "Calling the scanner from your own code rather than the command line.",
  help: "What to try when the scanner does something you did not expect.",
};

/** The section and ancestors a node sits under, for the content pane's breadcrumb. */
export function navTrail(id: string): string[] {
  for (const section of navSections) {
    const walk = (nodes: TreeNode[], trail: string[]): string[] | null => {
      for (const node of nodes) {
        if (node.id === id) return [...trail, node.name];
        const found = node.children ? walk(node.children, [...trail, node.name]) : null;
        if (found) return found;
      }
      return null;
    };
    const found = walk(section.nodes, [section.label]);
    if (found) return found;
  }
  return [];
}

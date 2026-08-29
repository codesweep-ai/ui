import type { TreeNode } from "@codesweep-ai/ui";

/**
 * The preview reads the library's own specs — `components/*.md`, `patterns/*.md`
 * and `docs/*.md` — rather than inventing sample documents.
 *
 * Two reasons. It is the honest exercise of MarkdownViewer: these are real
 * documents, with tables, fenced code, nested lists and alerts, and if the
 * viewer renders them badly that is a defect worth seeing. And it puts each
 * component's `use_when` / `avoid_when` guidance on screen beside the live
 * component, instead of in a file nobody opens.
 *
 * Eager on purpose: the gates drive this page and wait on rendered selectors,
 * so the content must be present on first paint rather than arriving later.
 * The preview is not part of the published package (`files` excludes it), so
 * none of this reaches a consumer's bundle.
 */
const rawComponents = import.meta.glob("../../../components/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const rawPatterns = import.meta.glob("../../../patterns/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const rawDocs = import.meta.glob("../../../docs/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export interface SpecFrontmatter {
  name?: string;
  status?: string;
  since?: string;
  summary?: string;
  note?: string;
  keywords?: string[];
  use_when?: string[];
  avoid_when?: string[];
  related?: string[];
  patterns?: string[];
}

export interface SpecDoc {
  id: string;
  /** File stem, e.g. `MarkdownViewer`. */
  name: string;
  group: "components" | "patterns" | "docs";
  frontmatter: SpecFrontmatter;
  /** The document with its frontmatter block removed. */
  content: string;
}

const LIST_KEYS = new Set(["keywords", "use_when", "avoid_when", "related", "patterns"]);

/**
 * A deliberately small frontmatter reader. These files use a narrow subset of
 * YAML — scalars, inline `[a, b]` lists, `- item` lists and `>` block scalars —
 * and a dependency to parse that much would ship a parser into the preview to
 * read eleven keys. Anything it does not understand is left out of the panel
 * rather than guessed at; the body is never affected.
 */
function parseFrontmatter(source: string): { frontmatter: SpecFrontmatter; content: string } {
  if (!source.startsWith("---")) return { frontmatter: {}, content: source };
  const end = source.indexOf("\n---", 3);
  if (end === -1) return { frontmatter: {}, content: source };

  const block = source.slice(source.indexOf("\n") + 1, end);
  const content = source.slice(source.indexOf("\n", end + 1) + 1);
  const frontmatter: Record<string, string | string[]> = {};

  const lines = block.split("\n");
  let key: string | null = null;
  let listBuffer: string[] = [];
  let blockBuffer: string[] = [];
  let mode: "none" | "list" | "block" = "none";

  const flush = () => {
    if (!key) return;
    if (mode === "list") frontmatter[key] = listBuffer;
    else if (mode === "block") frontmatter[key] = blockBuffer.join(" ").trim();
    listBuffer = [];
    blockBuffer = [];
    mode = "none";
  };

  for (const line of lines) {
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && mode === "list") {
      listBuffer.push(item[1].trim());
      continue;
    }
    if (mode === "block" && /^\s+\S/.test(line)) {
      blockBuffer.push(line.trim());
      continue;
    }
    // A continuation line of a wrapped inline list, e.g. a long `keywords: [...]`.
    if (mode === "list" && listBuffer.length > 0 && /^\s+\S/.test(line) && !line.includes(":")) {
      listBuffer[listBuffer.length - 1] += ` ${line.trim()}`;
      continue;
    }

    const kv = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!kv) continue;
    flush();
    key = kv[1];
    const value = kv[2].trim();

    if (value === ">" || value === "|") {
      mode = "block";
    } else if (value.startsWith("[")) {
      // Inline list, possibly wrapped across lines — closed below if needed.
      const inline = value.replace(/^\[/, "").replace(/\]$/, "");
      frontmatter[key] = inline
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
      key = null;
    } else if (value === "") {
      mode = "list";
    } else {
      frontmatter[key] = value;
      key = null;
    }
  }
  flush();

  // Normalise: anything declared as a list key must end up an array.
  for (const listKey of LIST_KEYS) {
    const value = frontmatter[listKey];
    if (typeof value === "string") frontmatter[listKey] = [value];
  }

  return { frontmatter: frontmatter as SpecFrontmatter, content };
}

function build(
  raw: Record<string, string>,
  group: SpecDoc["group"],
): SpecDoc[] {
  return Object.entries(raw)
    .map(([filePath, source]) => {
      const name = filePath.split("/").pop()!.replace(/\.md$/, "");
      const { frontmatter, content } = parseFrontmatter(source);
      return { id: `${group}/${name}`, name, group, frontmatter, content };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export const specDocs: SpecDoc[] = [
  ...build(rawPatterns, "patterns"),
  ...build(rawComponents, "components"),
  ...build(rawDocs, "docs"),
];

export const specDocsById: Record<string, SpecDoc> = Object.fromEntries(
  specDocs.map((doc) => [doc.id, doc]),
);

const GROUP_LABEL: Record<SpecDoc["group"], string> = {
  patterns: "patterns",
  components: "components",
  docs: "docs",
};

export const specDocTree: TreeNode[] = (
  ["patterns", "components", "docs"] as const
).map((group) => ({
  id: `group-${group}`,
  name: GROUP_LABEL[group],
  type: "branch" as const,
  children: specDocs
    .filter((doc) => doc.group === group)
    .map((doc) => ({ id: doc.id, name: `${doc.name}.md`, type: "leaf" as const })),
}));

/** The document the browser opens on: the spec this whole page is about. */
export const DEFAULT_SPEC_ID = "components/MarkdownViewer";

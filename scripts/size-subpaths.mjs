import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { build } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scratch = path.join(root, ".size-subpaths");
const coreCss = `import "@codesweep-ai/ui/styles/core.css";\n`;
const componentCss = (...names) => names
  .map((name) => `import "@codesweep-ai/ui/styles/components/${name}.css";`)
  .join("\n");
const markdown = `# Title

Some **plain** markdown with a [link](https://example.com) and a list:

- one
- two

\`\`\`ts
const x = 1;
\`\`\`
`;

// Keep the chrome case in sync with the adoption-plan size budget.
const cases = [
  {
    name: ".",
    code: `${coreCss}${componentCss("button", "card")}import React from "react"; import { createRoot } from "react-dom/client"; import { Button, Card } from "@codesweep-ai/ui";
createRoot(document.getElementById("root")).render(<Card header="h"><Button>hi</Button></Card>);`,
  },
  {
    name: "chrome",
    code: `${coreCss}${componentCss("app-shell", "theme-toggle", "button", "card")}import React from "react"; import { createRoot } from "react-dom/client"; import { AppShell, Header, Footer, ThemeToggle, Button, Card } from "@codesweep-ai/ui";
createRoot(document.getElementById("root")).render(<AppShell><Header title="tool" navItems={[{label:"A",href:"#",active:true}]} actions={<ThemeToggle/>}/><main><Card header="h"><Button>hi</Button></Card></main><Footer>tool v1</Footer></AppShell>);`,
  },
  {
    name: "./markdown",
    code: `${coreCss}${componentCss("markdown-viewer")}import "@codesweep-ai/ui/styles/markdown-content.css"; import React from "react"; import { createRoot } from "react-dom/client"; import { MarkdownViewer } from "@codesweep-ai/ui/markdown";
createRoot(document.getElementById("root")).render(<MarkdownViewer content={${JSON.stringify(markdown)}} />);`,
  },
  {
    name: "./markdown/rich",
    code: `${coreCss}${componentCss("markdown-viewer")}import "@codesweep-ai/ui/styles/markdown-content.css"; import React from "react"; import { createRoot } from "react-dom/client"; import { MarkdownViewer } from "@codesweep-ai/ui/markdown/rich";
createRoot(document.getElementById("root")).render(<MarkdownViewer content={${JSON.stringify(markdown)}} />);`,
  },
  {
    name: "./mermaid",
    code: `${coreCss}${componentCss("mermaid-diagram")}import React from "react"; import { createRoot } from "react-dom/client"; import { MermaidDiagram } from "@codesweep-ai/ui/mermaid";
createRoot(document.getElementById("root")).render(<MermaidDiagram chart="graph TD; A-->B" />);`,
  },
  {
    name: "./code",
    code: `${coreCss}${componentCss("code-block")}import "@codesweep-ai/ui/styles/syntax.css"; import React from "react"; import { createRoot } from "react-dom/client"; import { CodeBlock } from "@codesweep-ai/ui/code";
createRoot(document.getElementById("root")).render(<CodeBlock code="const x = 1" language="ts" />);`,
  },
  {
    name: "./chart",
    code: `${coreCss}${componentCss("chart-frame", "chart-tooltip")}import React from "react"; import { createRoot } from "react-dom/client"; import { ChartFrame, ChartTooltip } from "@codesweep-ai/ui/chart";
createRoot(document.getElementById("root")).render(<ChartFrame title="t"><ChartTooltip x={0} y={0}>x</ChartTooltip></ChartFrame>);`,
  },
  {
    name: "./minimap",
    code: `${coreCss}${componentCss("markdown-minimap")}import React from "react"; import { createRoot } from "react-dom/client"; import { MarkdownMinimap } from "@codesweep-ai/ui/minimap";
createRoot(document.getElementById("root")).render(<MarkdownMinimap contentRef={{ current: null }} />);`,
  },
];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const file = path.join(directory, entry.name);
      return entry.isDirectory() ? walk(file) : [file];
    }),
  );
  return nested.flat();
}

async function fileBytes(file) {
  return (await stat(file)).size;
}

async function standardSizes(outDir) {
  const files = await walk(outDir);
  const jsFiles = files.filter((file) => file.endsWith(".js"));
  const cssFiles = files.filter((file) => file.endsWith(".css"));
  let raw = 0;
  let gzip = 0;
  for (const file of jsFiles) {
    const data = await readFile(file);
    raw += data.length;
    gzip += gzipSync(data).length;
  }
  let css = 0;
  for (const file of cssFiles) css += await fileBytes(file);

  const manifest = JSON.parse(
    await readFile(path.join(outDir, ".vite", "manifest.json"), "utf8"),
  );
  const entryKey = Object.keys(manifest).find((key) => manifest[key].isEntry);
  if (!entryKey) throw new Error("Vite manifest has no entry chunk");

  const eagerFiles = new Set();
  const visited = new Set();
  const visit = (key) => {
    if (visited.has(key)) return;
    visited.add(key);
    const chunk = manifest[key];
    if (!chunk) return;
    if (chunk.file) eagerFiles.add(chunk.file);
    for (const file of chunk.css ?? []) eagerFiles.add(file);
    for (const file of chunk.assets ?? []) eagerFiles.add(file);
    for (const imported of chunk.imports ?? []) visit(imported);
  };
  visit(entryKey);

  let eager = 0;
  for (const file of eagerFiles) eager += await fileBytes(path.join(outDir, file));
  return { raw, gzip, css, eager };
}

async function runCase(spec, index) {
  const caseDir = path.join(scratch, "cases", String(index));
  const standardDir = path.join(scratch, "dist", String(index));
  const singleDir = path.join(scratch, "dist-single", String(index));
  await mkdir(caseDir, { recursive: true });
  await writeFile(
    path.join(caseDir, "index.html"),
    '<!doctype html><html><body><div id="root"></div><script type="module" src="./main.tsx"></script></body></html>',
  );
  await writeFile(path.join(caseDir, "main.tsx"), spec.code);

  const common = {
    root: caseDir,
    configFile: false,
    logLevel: "error",
    cacheDir: path.join(scratch, ".vite"),
  };
  await build({
    ...common,
    plugins: [react()],
    build: {
      outDir: standardDir,
      emptyOutDir: true,
      manifest: true,
      minify: true,
      sourcemap: false,
      chunkSizeWarningLimit: 10_000,
      target: "es2022",
    },
  });
  const standard = await standardSizes(standardDir);

  await build({
    ...common,
    plugins: [react(), viteSingleFile()],
    build: {
      outDir: singleDir,
      emptyOutDir: true,
      minify: true,
      sourcemap: false,
      chunkSizeWarningLimit: 10_000,
      target: "es2022",
    },
  });
  const singleData = await readFile(path.join(singleDir, "index.html"));
  return {
    ...standard,
    single: singleData.length,
    singleGzip: gzipSync(singleData).length,
  };
}

const rows = [];
await rm(scratch, { recursive: true, force: true });
try {
  for (const [index, spec] of cases.entries()) {
    try {
      rows.push({ name: spec.name, ...(await runCase(spec, index)) });
    } catch (error) {
      rows.push({
        name: spec.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
} finally {
  await rm(scratch, { recursive: true, force: true });
}

console.log("case            | raw JS | gzip JS | CSS bytes | eager bytes | single-file | single gzip");
console.log("----------------|--------|---------|-----------|-------------|-------------|------------");
for (const row of rows) {
  if (row.error) {
    console.log(`${row.name.padEnd(15)} | ERROR: ${row.error}`);
  } else {
    console.log(
      `${row.name.padEnd(15)} | ${String(row.raw).padStart(6)} | ${String(row.gzip).padStart(7)} | ${String(row.css).padStart(9)} | ${String(row.eager).padStart(11)} | ${String(row.single).padStart(11)} | ${String(row.singleGzip).padStart(10)}`,
    );
  }
}

// The preview renders these numbers, so they are generated here rather than
// typed into a component where they would quietly rot.
await writeFile(
  path.join(root, "preview/src/data/subpath-sizes.json"),
  JSON.stringify(
    Object.fromEntries(
      rows
        .filter((row) => !row.error)
        .map((row) => [row.name, { raw: row.raw, gzip: row.gzip, eager: row.eager }]),
    ),
    null,
    2,
  ) + "\n",
);

const markdownRow = rows.find((row) => row.name === "./markdown");
const chromeRow = rows.find((row) => row.name === "chrome");
const failures = rows.filter((row) => row.error);
if (
  !markdownRow ||
  markdownRow.error ||
  markdownRow.eager > 400_000 ||
  markdownRow.single > 600_000
) {
  failures.push({
    error: "./markdown exceeds 400000 eager bytes or 600000 single-file bytes",
  });
}

if (!chromeRow || chromeRow.error || chromeRow.css > 25_000) {
  failures.push({ error: "chrome exceeds 25000 CSS bytes" });
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`size:subpaths: ${failure.error}`);
  process.exitCode = 1;
} else {
  console.log("size:subpaths: PASS");
}

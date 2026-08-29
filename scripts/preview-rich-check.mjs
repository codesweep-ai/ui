import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import puppeteer from "puppeteer";

const root = path.resolve(import.meta.dirname, "..");
const PORT = 4173;
const base = `http://127.0.0.1:${PORT}/?page=patterns&tab=markdown-viewer`;

/**
 * The flavors page renders one rung at a time, so this drives it rather than
 * relying on a single page that happens to contain everything. Each case names
 * the `?flavor=` slug it needs; those slugs are a contract with
 * `preview/src/pages/patterns/MarkdownFlavors.tsx`.
 *
 * `visible: true` matters. If the page ever kept unselected flavors mounted and
 * hidden, a selector-only assertion would pass while a reader saw nothing —
 * a green check that measured nothing at all.
 */
const cases = [
  {
    flavor: "highlight",
    what: "highlight token",
    // No documented hook can express this. `.hljs` and its token classes are
    // highlight.js's output, not part of our contract, and "a code block
    // exists" is not the assertion — "it was tokenised" is. A library's own
    // gate may read its own rendering; a consumer should not, which is why this
    // is not offered as a supported selector.
    selector: '[data-component="MarkdownViewer"] .hljs span[class^="hljs-"]',
  },
  {
    flavor: "diagrams",
    what: "diagram",
    // Documented hook, set only once Mermaid returns SVG — see
    // components/MermaidDiagram.md. Previously this descended into Mermaid's
    // generated `svg`, which the contract never promised.
    selector: '[data-component="MermaidDiagram"][data-mermaid-rendered="true"]',
  },
];

const server = spawn(
  process.execPath,
  [
    path.join(root, "node_modules/vite/bin/vite.js"),
    "preview",
    "--config",
    "preview/vite.config.ts",
    "--host",
    "127.0.0.1",
    "--port",
    String(PORT),
    "--strictPort",
  ],
  { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
);

let serverError = "";
server.stderr.on("data", (chunk) => {
  serverError += chunk.toString();
});

async function waitForServer() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(base);
      if (response.ok) return;
    } catch {
      // Vite has not bound the port yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`preview server did not become ready: ${serverError}`);
}

let browser;
try {
  await waitForServer();
  browser = await puppeteer.launch({
    executablePath: process.env.CHROME_BIN || undefined,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const checked = [];
  for (const testCase of cases) {
    const page = await browser.newPage();
    await page.goto(`${base}&flavor=${testCase.flavor}`, { waitUntil: "networkidle0" });
    await page.waitForSelector(testCase.selector, { visible: true });

    // Prove the page is actually on the flavor we asked for, so a fallback to
    // some other rung cannot quietly satisfy the assertion.
    const active = await page.$eval(
      '[data-component="RadioGroup"] [data-radio-active]',
      (element) => element.getAttribute("data-radio-option"),
    );
    if (active !== testCase.flavor) {
      throw new Error(
        `expected flavor "${testCase.flavor}" to be selected, but "${active}" was`,
      );
    }

    checked.push(`${testCase.what} in flavor "${testCase.flavor}"`);
    await page.close();
  }

  console.log(`preview:rich-check: PASS (${checked.join("; ")})`);
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}

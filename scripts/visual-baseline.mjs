import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import AxeBuilder from "@axe-core/playwright";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "..");
const BASELINE_DIR = path.join(ROOT, "visual-baseline");
const DIFF_DIR = path.join(ROOT, "visual-diff");
const PREVIEW_URL = "http://127.0.0.1:4173/?page=components&brand=codesweep";
// An unset CHROME_BIN used to mean "whatever chromium playwright bundles",
// which renders a contributor's pixels with one browser and the workflow's with
// another and says nothing about having done so. The gate names its browser or
// it does not run. scripts/visual-container.mjs sets this.
const CHROME_BIN = process.env.CHROME_BIN;
if (!CHROME_BIN) {
  throw new Error(
    "CHROME_BIN is unset. Run the gate through `npm run visual:compare`, which renders "
    + "in the pinned Playwright image, or set it to the browser you mean to measure.",
  );
}

const PIXEL_THRESHOLD = 0.1;
const MAX_DIFF_RATIO = 0.001;
const THEMES = ["light", "dark"];
const COMPONENTS = [
  "AgentStatus", "AgentTrace", "AppShell",
  "Button", "Card", "CardGroup", "ChartFrame", "ChartTooltip",
  "CheckboxGroup", "CodeBlock", "Dropdown", "Footer", "FormGroup",
  "Header", "HighlightText", "Input", "MarkdownMinimap",
  "MarkdownViewer", "MermaidDiagram", "Modal", "Panel", "PulseBadge",
  "SearchInput", "SectionedTree", "Skeleton", "SplitPane", "StatusBadge",
  "StreamingText", "Table", "ThemeToggle", "Toast",
  "ToastContainer", "Tree",
];

function slug(value) {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

async function waitForPreview() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(PREVIEW_URL);
      if (response.ok) return;
    } catch {
      // Vite has not bound the port yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("preview server did not become ready within 20 seconds");
}

function section(page, title) {
  return page.locator("section", {
    has: page.getByRole("heading", { name: title, exact: true }),
  }).first();
}

async function screenshot(locator, file) {
  await locator.scrollIntoViewIfNeeded();
  await locator.screenshot({ path: file, animations: "disabled" });
}

async function preparePage(page, theme, outputDir) {
  await page.addInitScript((selectedTheme) => {
    localStorage.setItem("preview-theme", selectedTheme);
  }, theme);
  // The localStorage seed above only reaches the boot script in preview/index.html,
  // which paints before React mounts. ThemeToggle then mounts useTheme with its
  // defaults — key "cs-theme", param "theme" — finds neither, resolves "system", and
  // repaints from the headless browser preference, which is always light. The URL
  // param is the one input useTheme reads ahead of storage, so it is what survives.
  await page.goto(`${PREVIEW_URL}&theme=${theme}`, { waitUntil: "networkidle" });
  await page.locator('[data-component="AppShell"]').waitFor();
  await page.locator('[data-component="MermaidDiagram"] svg').first().waitFor();

  const applied = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  if (applied !== theme) {
    throw new Error(`${theme}: preview rendered data-theme=${JSON.stringify(applied)}`);
  }

  await section(page, "AgentTrace").getByRole("button", { name: "loading" }).click();
  await page.locator('[data-component="Skeleton"]').first().waitFor();

  const tooltipSection = section(page, "ChartTooltip");
  await tooltipSection.locator("circle").first().hover();
  await page.locator('[data-component="ChartTooltip"]').waitFor();
  await screenshot(
    page.locator('[data-component="ChartTooltip"]'),
    path.join(outputDir, theme, "chart-tooltip.png"),
  );

  const toastSection = section(page, "ToastContainer");
  await toastSection.getByRole("button", { name: "Warning toast" }).click();
  await page.locator('[data-component="ToastContainer"] [data-component="Toast"]').waitFor();

  const modalSection = section(page, "Modal");
  await modalSection.getByRole("button", { name: "Open Modal" }).click();
  await screenshot(
    page.locator('[data-component="Modal"]'),
    path.join(outputDir, theme, "modal.png"),
  );
  await page.keyboard.press("Escape");
}

async function captureTheme(page, theme, outputDir) {
  await mkdir(path.join(outputDir, theme), { recursive: true });
  await preparePage(page, theme, outputDir);

  const alreadyCaptured = new Set(["ChartTooltip", "Modal"]);
  const eventLanesSection = section(page, "EventLanes");
  await screenshot(
    eventLanesSection.locator('[data-event-lanes-fixture="dense-1366"]'),
    path.join(outputDir, theme, "event-lanes-dense-1366.png"),
  );
  await screenshot(
    eventLanesSection.locator('[data-event-lanes-fixture="multilane-73"]'),
    path.join(outputDir, theme, "event-lanes-multilane-73.png"),
  );
  for (const component of COMPONENTS) {
    if (alreadyCaptured.has(component)) continue;
    const componentRoot = ["Button", "Card"].includes(component)
      ? section(page, component)
      : page;
    const locator = componentRoot.locator(`[data-component="${component}"]`).first();
    if (await locator.count() === 0) {
      throw new Error(`${theme}: preview did not render ${component}`);
    }
    await screenshot(locator, path.join(outputDir, theme, `${slug(component)}.png`));
  }

  const modalSection = section(page, "Modal");
  await modalSection.getByRole("button", { name: "Open Modal" }).click();
  await page.getByRole("button", { name: "Close dialog" }).waitFor();
  await page.keyboard.press("Shift+Tab");
  const trappedFocus = await page.evaluate(() => document.activeElement?.textContent?.trim());
  if (trappedFocus !== "Confirm") {
    throw new Error(`${theme}: Modal focus trap ended on ${JSON.stringify(trappedFocus)}`);
  }
  await screenshot(
    page.getByRole("dialog"),
    path.join(outputDir, theme, "interaction-modal-focus-trap.png"),
  );
  await page.keyboard.press("Escape");

  const treeSection = section(page, "Panel + Tree");
  const tree = treeSection.locator('[data-component="Tree"]');
  const firstTreeItem = tree.getByRole("treeitem").first();
  await firstTreeItem.focus();
  await page.waitForFunction(() => (document.activeElement)?.tabIndex === 0);
  await page.keyboard.press("ArrowDown");
  await page.waitForFunction(() => document.activeElement?.getAttribute("data-tree-node-id") === "components");
  await tree.locator('[data-tree-node-id="components"]').press("ArrowRight");
  await tree.locator('[data-tree-node-id="button-tsx"]').waitFor();
  await tree.locator('[data-tree-node-id="components"]').press("ArrowDown");
  await page.waitForFunction(() => document.activeElement?.getAttribute("data-tree-node-id") === "button-tsx");
  const focusedTreeItem = await tree.locator('[role="treeitem"]:focus').getAttribute("data-tree-node-id");
  if (!focusedTreeItem) {
    throw new Error(`${theme}: Tree arrow navigation did not leave a tree item focused`);
  }
  await screenshot(tree, path.join(outputDir, theme, "interaction-tree-arrow-navigation.png"));

  const splitPane = section(page, "SplitPane").locator('[data-component="SplitPane"]');
  const separator = splitPane.getByRole("separator").first();
  const beforeWidth = Number(await separator.getAttribute("aria-valuenow"));
  const box = await separator.boundingBox();
  if (!box) throw new Error(`${theme}: SplitPane separator has no bounding box`);
  const pointer = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await separator.dispatchEvent("pointerdown", {
    clientX: pointer.x,
    clientY: pointer.y,
    pointerId: 1,
    pointerType: "mouse",
    button: 0,
    buttons: 1,
  });
  await page.evaluate(({ x, y }) => {
    window.dispatchEvent(new PointerEvent("pointermove", {
      clientX: x + 60,
      clientY: y,
      pointerId: 1,
      pointerType: "mouse",
      button: 0,
      buttons: 1,
      bubbles: true,
    }));
    window.dispatchEvent(new PointerEvent("pointerup", {
      clientX: x + 60,
      clientY: y,
      pointerId: 1,
      pointerType: "mouse",
      button: 0,
      buttons: 0,
      bubbles: true,
    }));
  }, pointer);
  await page.waitForTimeout(100);
  const afterWidth = Number(await separator.getAttribute("aria-valuenow"));
  if (afterWidth <= beforeWidth) {
    throw new Error(`${theme}: SplitPane drag did not increase width (${beforeWidth} -> ${afterWidth})`);
  }
  await screenshot(splitPane, path.join(outputDir, theme, "interaction-split-pane-drag.png"));

  const axe = await new AxeBuilder({ page }).analyze();
  await writeFile(
    path.join(outputDir, `axe-${theme}.json`),
    `${JSON.stringify({
      theme,
      violations: axe.violations,
      incomplete: axe.incomplete,
      passes: axe.passes.length,
    }, null, 2)}\n`,
  );
  return {
    theme,
    components: COMPONENTS.length + 2,
    interactionStates: 3,
    axeViolations: axe.violations.length,
    focusedTreeItem,
    splitPane: `${beforeWidth} -> ${afterWidth}`,
  };
}

/**
 * Both passes drive the same preview, so a capture that fails to switch theme
 * writes one theme into both directories and every later comparison passes against
 * a baseline with no dark coverage. Catch that here, not in a reviewer's eye months
 * later.
 */
async function assertThemesDiffer(outputDir) {
  const [light, dark] = THEMES;
  const identical = [];
  for (const entry of await readdir(path.join(outputDir, light))) {
    if (!entry.endsWith(".png")) continue;
    const [a, b] = await Promise.all([
      readFile(path.join(outputDir, light, entry)),
      readFile(path.join(outputDir, dark, entry)),
    ]);
    if (a.equals(b)) identical.push(entry);
  }
  if (identical.length === 0) return;
  const shown = identical.slice(0, 5).join(", ");
  throw new Error(
    `${identical.length} capture(s) are byte-identical in ${light}/ and ${dark}/, so the `
    + `theme never switched: ${shown}${identical.length > 5 ? ", …" : ""}`,
  );
}

async function capture(outputDir) {
  const server = spawn(
    process.execPath,
    [path.join(ROOT, "node_modules/vite/bin/vite.js"), "preview", "--config", "preview/vite.config.ts", "--host", "127.0.0.1", "--port", "4173", "--strictPort"],
    { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] },
  );
  let serverError = "";
  server.stderr.on("data", (chunk) => { serverError += chunk; });

  try {
    await waitForPreview();
    const browser = await chromium.launch({
      executablePath: CHROME_BIN,
      headless: true,
    });
    try {
      const summaries = [];
      for (const theme of THEMES) {
        const context = await browser.newContext({
          viewport: { width: 1440, height: 900 },
          deviceScaleFactor: 1,
          reducedMotion: "reduce",
        });
        const page = await context.newPage();
        summaries.push(await captureTheme(page, theme, outputDir));
        await context.close();
      }
      await assertThemesDiffer(outputDir);
      await writeFile(path.join(outputDir, "capture-summary.json"), `${JSON.stringify(summaries, null, 2)}\n`);
      return summaries;
    } finally {
      await browser.close();
    }
  } finally {
    server.kill("SIGTERM");
    await new Promise((resolve) => server.once("exit", resolve));
    if (server.exitCode && server.exitCode !== 0 && server.exitCode !== 143) {
      throw new Error(`preview server exited ${server.exitCode}: ${serverError}`);
    }
  }
}

async function listPngs(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(path.join(directory, prefix), { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await listPngs(directory, relative));
    else if (entry.name.endsWith(".png")) files.push(relative);
  }
  return files.sort();
}

/**
 * axe writes a report each run and nothing has ever compared one. Counting only
 * the totals would let a fixed rule pay for a new one, so this compares the nodes
 * each rule matched: a rule may improve or disappear, and anything that grows or
 * arrives fails. Incomplete counts too — 21 of the nodes carried there are serious
 * and none of them are passes.
 */
function axeRegressions(baseline, current) {
  const byRule = (report, key) => new Map(report[key].map((rule) => [rule.id, rule.nodes.length]));
  const regressions = [];
  for (const key of ["violations", "incomplete"]) {
    const was = byRule(baseline, key);
    for (const [id, nodes] of byRule(current, key)) {
      const before = was.get(id) ?? 0;
      if (nodes > before) regressions.push(`${key} ${id}: ${before} -> ${nodes} node(s)`);
    }
  }
  return regressions;
}

async function readAxe(directory, theme) {
  return JSON.parse(await readFile(path.join(directory, `axe-${theme}.json`), "utf8"));
}

async function writeFailure(relative, expected, actual) {
  const target = path.join(DIFF_DIR, relative).replace(/\.png$/, "");
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(`${target}-current.png`, PNG.sync.write(actual));
  if (expected.width !== actual.width || expected.height !== actual.height) return;
  const diff = new PNG({ width: expected.width, height: expected.height });
  pixelmatch(expected.data, actual.data, diff.data, expected.width, expected.height, {
    threshold: PIXEL_THRESHOLD,
  });
  await writeFile(`${target}-diff.png`, PNG.sync.write(diff));
}

async function compare() {
  const currentDir = await mkdtemp(path.join(tmpdir(), "cs-ui-visual-"));
  try {
    const summaries = await capture(currentDir);
    await rm(DIFF_DIR, { recursive: true, force: true });
    const baselineFiles = await listPngs(BASELINE_DIR);
    const currentFiles = await listPngs(currentDir);
    if (JSON.stringify(baselineFiles) !== JSON.stringify(currentFiles)) {
      throw new Error("baseline and current screenshot manifests differ");
    }

    let failed = 0;
    let differingPixels = 0;
    for (const relative of baselineFiles) {
      const expected = PNG.sync.read(await readFile(path.join(BASELINE_DIR, relative)));
      const actual = PNG.sync.read(await readFile(path.join(currentDir, relative)));
      if (expected.width !== actual.width || expected.height !== actual.height) {
        failed += 1;
        console.error(`FAIL ${relative}: ${expected.width}x${expected.height} != ${actual.width}x${actual.height}`);
        await writeFailure(relative, expected, actual);
        continue;
      }
      const count = pixelmatch(expected.data, actual.data, null, expected.width, expected.height, {
        threshold: PIXEL_THRESHOLD,
      });
      const ratio = count / (expected.width * expected.height);
      differingPixels += count;
      if (ratio > MAX_DIFF_RATIO) {
        failed += 1;
        console.error(`FAIL ${relative}: ${count} pixels (${(ratio * 100).toFixed(4)}%)`);
        await writeFailure(relative, expected, actual);
      }
    }
    let axeFailed = 0;
    for (const theme of THEMES) {
      const regressions = axeRegressions(
        await readAxe(BASELINE_DIR, theme),
        await readAxe(currentDir, theme),
      );
      for (const regression of regressions) console.error(`FAIL axe ${theme}: ${regression}`);
      axeFailed += regressions.length;
    }

    const compared = baselineFiles.length;
    console.log(`Visual compare: ${compared - failed}/${compared} compared screenshots passed; ${differingPixels} differing pixels; threshold ${MAX_DIFF_RATIO * 100}% at pixelmatch ${PIXEL_THRESHOLD}.`);
    for (const summary of summaries) {
      console.log(`${summary.theme}: ${summary.components} components, ${summary.interactionStates} interaction states, axe violations=${summary.axeViolations}.`);
    }
    console.log(`Axe compare: ${axeFailed} rule(s) matched more nodes than the baseline.`);
    if (failed > 0) {
      console.log(`What rendered, and where it differs, is in ${path.relative(ROOT, DIFF_DIR)}/.`);
    }
    if (failed > 0 || axeFailed > 0) process.exitCode = 1;
  } finally {
    if (process.env.KEEP_VISUAL_CURRENT) {
      console.log(`Current screenshots kept at ${currentDir}`);
    } else {
      await rm(currentDir, { recursive: true });
    }
  }
}

const command = process.argv[2];
if (command === "capture") {
  await rm(BASELINE_DIR, { recursive: true, force: true });
  await mkdir(BASELINE_DIR, { recursive: true });
  const summaries = await capture(BASELINE_DIR);
  for (const summary of summaries) {
    console.log(`${summary.theme}: captured ${summary.components} components and ${summary.interactionStates} interaction states; axe violations=${summary.axeViolations}.`);
  }
} else if (command === "compare") {
  await compare();
} else {
  throw new Error("usage: node scripts/visual-baseline.mjs <capture|compare>");
}

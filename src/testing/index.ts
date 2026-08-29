import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import puppeteer, { type Browser, type Page } from "puppeteer";

export interface PageSnapshot {
  url: string;
  text: string[];
  semantics: string[];
  screenshot: Uint8Array;
}

export interface RenderOptions {
  browser?: Browser;
  executablePath?: string;
  selector?: string;
  settleMs?: number;
  viewport?: { width: number; height: number };
  prepare?: (page: Page) => Promise<void>;
}

export interface SetDifference {
  onlyLeft: string[];
  onlyRight: string[];
}

export interface SnapshotComparison {
  text: SetDifference;
  semantics: SetDifference;
  screenshot: {
    changedPixels: number;
    ratio: number;
    threshold: number;
    dimensionsMatch: boolean;
  };
  equal: boolean;
  diff?: Uint8Array;
}

const unique = (values: string[]) => [...new Set(values)].sort();

export async function renderAndSnapshot(url: string, options: RenderOptions = {}): Promise<PageSnapshot> {
  const ownBrowser = options.browser == null;
  const browser = options.browser ?? await puppeteer.launch({
    executablePath: options.executablePath ?? process.env.CHROME_BIN,
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setViewport(options.viewport ?? { width: 1280, height: 900, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: "networkidle0" });
    if (options.selector) await page.waitForSelector(options.selector);
    if (options.prepare) await options.prepare(page);
    await page.evaluate(async () => {
      await document.fonts?.ready;
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    });
    if (options.settleMs) await new Promise((resolve) => setTimeout(resolve, options.settleMs));

    const extracted = await page.evaluate(() => {
      const text = (document.body.innerText ?? "")
        .split("\n")
        .map((line) => line.trim().replace(/\s+/g, " "))
        .filter(Boolean);
      const selectors = [
        "header", "nav", "main", "aside", "section", "article", "footer",
        "h1", "h2", "h3", "h4", "h5", "h6", "a", "button", "input", "select", "textarea",
        "[role]", "[aria-label]", "[data-component]", "[data-testid]",
      ].join(",");
      const semantics = [...document.querySelectorAll<HTMLElement>(selectors)].map((element) => {
        const name = element.getAttribute("aria-label")
          ?? element.getAttribute("alt")
          ?? element.innerText?.trim().replace(/\s+/g, " ").slice(0, 120)
          ?? "";
        return [
          element.tagName.toLowerCase(),
          element.getAttribute("role") ? `role=${element.getAttribute("role")}` : "",
          name ? `name=${name}` : "",
          element.dataset.component ? `component=${element.dataset.component}` : "",
          element.dataset.testid ? `testid=${element.dataset.testid}` : "",
        ].filter(Boolean).join("|");
      });
      return { text, semantics };
    });
    const screenshot = await page.screenshot({ type: "png", fullPage: true });
    await page.close();
    return {
      url,
      text: unique(extracted.text),
      semantics: unique(extracted.semantics),
      screenshot: Buffer.from(screenshot),
    };
  } finally {
    if (ownBrowser) await browser.close();
  }
}

function compareSets(left: string[], right: string[]): SetDifference {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  return {
    onlyLeft: [...leftSet].filter((value) => !rightSet.has(value)).sort(),
    onlyRight: [...rightSet].filter((value) => !leftSet.has(value)).sort(),
  };
}

export function compareSnapshots(
  left: PageSnapshot,
  right: PageSnapshot,
  threshold = 0.001,
): SnapshotComparison {
  const text = compareSets(left.text, right.text);
  const semantics = compareSets(left.semantics, right.semantics);
  const leftPng = PNG.sync.read(Buffer.from(left.screenshot));
  const rightPng = PNG.sync.read(Buffer.from(right.screenshot));
  const dimensionsMatch = leftPng.width === rightPng.width && leftPng.height === rightPng.height;
  let changedPixels = Math.max(leftPng.width * leftPng.height, rightPng.width * rightPng.height);
  let diff: Uint8Array | undefined;

  if (dimensionsMatch) {
    const output = new PNG({ width: leftPng.width, height: leftPng.height });
    changedPixels = pixelmatch(leftPng.data, rightPng.data, output.data, leftPng.width, leftPng.height, {
      threshold: 0.1,
    });
    diff = PNG.sync.write(output);
  }

  const denominator = Math.max(leftPng.width * leftPng.height, rightPng.width * rightPng.height);
  const ratio = denominator === 0 ? 0 : changedPixels / denominator;
  const equal = dimensionsMatch
    && ratio <= threshold
    && text.onlyLeft.length === 0
    && text.onlyRight.length === 0
    && semantics.onlyLeft.length === 0
    && semantics.onlyRight.length === 0;
  return { text, semantics, screenshot: { changedPixels, ratio, threshold, dimensionsMatch }, equal, diff };
}

export async function saveSnapshot(directory: string, snapshot: PageSnapshot): Promise<void> {
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "screenshot.png"), snapshot.screenshot);
  await writeFile(path.join(directory, "snapshot.json"), `${JSON.stringify({
    url: snapshot.url,
    text: snapshot.text,
    semantics: snapshot.semantics,
  }, null, 2)}\n`);
}

export async function loadSnapshot(directory: string): Promise<PageSnapshot> {
  const metadata = JSON.parse(await readFile(path.join(directory, "snapshot.json"), "utf8")) as Omit<PageSnapshot, "screenshot">;
  const screenshot = await readFile(path.join(directory, "screenshot.png"));
  return { ...metadata, screenshot };
}

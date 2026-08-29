import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const componentDir = path.join(root, "components");
const scratch = path.join(root, ".docs-compile");
const marker = /<!-- docs-compile -->\s*```tsx\n([\s\S]*?)\n```/g;

function traceabilitySelectors(spec, source) {
  const sectionMatch = source.match(/(?:^|\n)## Traceability\s*\n([\s\S]*?)(?=\n## |$)/);
  if (!sectionMatch) throw new Error(`${spec} must contain a Traceability section`);

  const selectors = new Set();
  for (const match of sectionMatch[1].matchAll(/`([^`\n]+)`/g)) {
    const token = match[1].trim();
    if (token.startsWith("[") && token.endsWith("]")) {
      selectors.add(token);
      continue;
    }
    for (const attr of token.matchAll(/\b(data-[a-z0-9-]+|aria-[a-z0-9-]+|role)(?:="([^"]*)"|=\{[^}]+\})?/gi)) {
      const [, name, value] = attr;
      selectors.add(value === undefined || value.includes("{") ? `[${name}]` : `[${name}="${value}"]`);
    }
  }
  if (selectors.size === 0) {
    throw new Error(`${spec} Traceability must document at least one attribute hook in backticks`);
  }
  return [...selectors];
}

await rm(scratch, { recursive: true, force: true });
await mkdir(scratch, { recursive: true });

try {
  const specs = (await readdir(componentDir))
    .filter((file) => file.endsWith(".md"))
    .sort();

  const contracts = [];
  for (const [index, spec] of specs.entries()) {
    const source = await readFile(path.join(componentDir, spec), "utf8");
    const examples = [...source.matchAll(marker)];
    if (examples.length !== 1) {
      throw new Error(`${spec} must contain exactly one marked compiling TSX example; found ${examples.length}`);
    }
    await writeFile(
      path.join(scratch, `${path.basename(spec, ".md")}.tsx`),
      `${examples[0][1]}\n`,
    );
    contracts.push({
      spec,
      importName: `Example${index}`,
      module: `./${path.basename(spec, ".md")}`,
      selectors: traceabilitySelectors(spec, source),
    });
  }

  const imports = contracts
    .map(({ importName, module }) => `import { Example as ${importName} } from ${JSON.stringify(module)};`)
    .join("\n");
  const cases = contracts.map(({ spec, importName, selectors }) => ({
    spec,
    Example: importName,
    selectors,
  }));
  await writeFile(
    path.join(scratch, "hooks.test.tsx"),
    `import React from "react";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, it } from "vitest";
${imports}

const contracts = [
${cases.map(({ spec, Example, selectors }) => `  { spec: ${JSON.stringify(spec)}, Example: ${Example}, selectors: ${JSON.stringify(selectors)} },`).join("\n")}
];

afterEach(cleanup);

describe("documented DOM hooks", () => {
  for (const { spec, Example, selectors } of contracts) {
    it(spec, async () => {
      render(<Example />);
      await waitFor(() => {
        const missing = selectors.filter((selector) => !document.body.querySelector(selector));
        if (missing.length) throw new Error(\`${"${spec}"} example did not render: ${"${missing.join(\", \")}"}\`);
      });
    });
  }
});
`,
  );

  await writeFile(
    path.join(scratch, "tsconfig.json"),
    `${JSON.stringify({
      extends: "../tsconfig.json",
      compilerOptions: {
        allowImportingTsExtensions: false,
        noEmit: true,
      },
      include: ["*.tsx"],
    }, null, 2)}\n`,
  );

  execFileSync(
    process.execPath,
    [path.join(root, "node_modules/typescript/bin/tsc"), "-p", path.join(scratch, "tsconfig.json")],
    { cwd: root, stdio: "inherit" },
  );
  await writeFile(
    path.join(scratch, "vitest.config.mjs"),
    `import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["../src/test/setup.ts"],
    include: ["hooks.test.tsx"],
  },
});
`,
  );
  execFileSync(
    process.execPath,
    [path.join(root, "node_modules/vitest/vitest.mjs"), "run", "--config", path.join(scratch, "vitest.config.mjs")],
    { cwd: scratch, stdio: "inherit" },
  );
  console.log(`docs:compile: PASS (${specs.length} compiling examples + rendered hook contracts)`);
} finally {
  await rm(scratch, { recursive: true, force: true });
}

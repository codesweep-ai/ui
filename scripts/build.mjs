import { cp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { build } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = (name) => path.join(root, "src", `${name}.ts`);

await rm(path.join(root, "dist"), { recursive: true, force: true });

await build({
  root,
  configFile: false,
  plugins: [
    react(),
    {
      name: "preserve-client-directives",
      async renderChunk(code, chunk) {
        if (!chunk.facadeModuleId) return null;
        const input = await readFile(chunk.facadeModuleId, "utf8");
        if (!input.startsWith('"use client"')) return null;
        return { code: `"use client";\n${code}`, map: null };
      },
    },
  ],
  build: {
    emptyOutDir: false,
    lib: {
      entry: {
        index: source("index"),
        mermaid: source("mermaid"),
        markdown: source("markdown"),
        "markdown/rich": source("markdown/rich"),
        code: source("code"),
        minimap: source("minimap"),
        chart: source("chart"),
        "testing/index": source("testing/index"),
      },
      formats: ["es"],
    },
    rollupOptions: {
      external: (id) => !id.startsWith(".") && !path.isAbsolute(id),
      output: {
        preserveModules: true,
        preserveModulesRoot: path.join(root, "src"),
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
      },
    },
  },
});

execFileSync(
  process.execPath,
  [path.join(root, "node_modules/typescript/bin/tsc"), "-p", "tsconfig.build.json", "--emitDeclarationOnly"],
  { cwd: root, stdio: "inherit" },
);

await cp(path.join(root, "src/styles"), path.join(root, "dist/styles"), { recursive: true });

const sha = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: root,
  encoding: "utf8",
}).trim();
await writeFile(path.join(root, "dist/BUILD.json"), `${JSON.stringify({ sha })}\n`);

import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The preview consumes the design system from source — `@codesweep-ai/ui`
// resolves to ../src so edits to components show up live (no rebuild/publish).
export default defineConfig({
  root: __dirname,
  // Relative asset paths, so a built preview is portable: it works served from
  // a domain root, from a sub-folder, and straight off the filesystem. Without
  // it vite emits root-absolute paths and a preview served from a sub-folder
  // 404s every asset and renders BLANK while still returning HTTP 200 — the
  // failure looks like a broken page, not a broken path.
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@codesweep-ai/ui": path.resolve(__dirname, "../src"),
    },
  },
  css: {
    postcss: path.resolve(__dirname),
  },
  server: {
    port: 25177,
    strictPort: true,
    host: "0.0.0.0",
  },
});

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";

const browserSuites = [
  "src/components/Modal.test.tsx",
  "src/components/Tree.test.tsx",
  "src/components/SplitPane.test.tsx",
  "src/components/AppShell.nav.test.tsx",
  "src/components/AppShell.layout.test.tsx",
  "src/components/MarkdownViewer.scroll.test.tsx",
  "src/components/MarkdownViewer.mermaid.test.tsx",
  "src/components/Legend.test.tsx",
  "src/components/Chip.test.tsx",
  "src/components/SegmentedControl.test.tsx",
  "src/components/EventLanes.test.tsx",
];

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "jsdom",
          environment: "jsdom",
          globals: true,
          setupFiles: ["./src/test/setup.ts"],
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: browserSuites,
        },
      },
      {
        extends: true,
        test: {
          name: "browser",
          globals: true,
          setupFiles: ["./src/test/setup.ts"],
          include: browserSuites,
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({
              launchOptions: {
                executablePath: process.env.CHROME_BIN,
              },
            }),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/test/**",
        "src/index.ts",
        "src/global.d.ts",
        "src/types/**",
      ],
    },
  },
});

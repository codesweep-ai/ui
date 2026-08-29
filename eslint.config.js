import tsParser from "@typescript-eslint/parser";

// Parse the design-system and preview TypeScript. CSS token discipline is
// enforced by Stylelint now that component styling is plain CSS.
export default [
  {
    ignores: [
      "**/*.test.{ts,tsx}",
      "**/*.d.ts",
      "dist/**",
      "preview/dist/**",
      "node_modules/**",
    ],
  },
  {
    files: ["src/**/*.{ts,tsx}", "preview/src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
  },
];

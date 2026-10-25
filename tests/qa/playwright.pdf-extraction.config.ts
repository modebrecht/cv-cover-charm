import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import pagination from "./playwright.pagination.config";

// Run the two existing download regressions without rerunning the complete
// dossier matrix during test development.
export default defineConfig({
  ...pagination,
  testDir: "../e2e",
  testMatch: "dossier-regression.spec.ts",
  grep: /standalone Motivationsschreiben PDF downloads|start screen keeps JSON available/,
  workers: 1,
  reporter: [
    ["line"],
    ["json", { outputFile: resolve("artifacts/pdf-text-extraction/results.json") }],
  ],
  outputDir: resolve("test-results/pdf-text-extraction"),
});

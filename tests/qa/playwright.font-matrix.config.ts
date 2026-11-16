import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import pagination from "./playwright.pagination.config";

export default defineConfig({
  ...pagination,
  testMatch: "dossier-font-matrix.qa.ts",
  workers: 1,
  retries: 0,
  timeout: 90_000,
  globalTimeout: 15 * 60_000,
  use: { ...pagination.use, viewport: { width: 1800, height: 1600 } },
  reporter: [
    ["line"],
    ["json", { outputFile: resolve("artifacts/dossier-font-matrix/results.json") }],
  ],
  outputDir: resolve("test-results/dossier-font-matrix"),
});

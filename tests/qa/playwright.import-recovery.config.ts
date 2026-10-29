import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import pagination from "./playwright.pagination.config";

export default defineConfig({
  ...pagination,
  testDir: "../e2e",
  testMatch: "dossier-import-recovery.spec.ts",
  workers: 1,
  retries: 0,
  globalTimeout: 15 * 60_000,
  timeout: 90_000,
  reporter: [["line"], ["json", { outputFile: resolve("artifacts/import-recovery/results.json") }]],
  outputDir: resolve("test-results/import-recovery"),
});

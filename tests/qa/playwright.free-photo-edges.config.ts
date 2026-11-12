import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import pagination from "./playwright.pagination.config";

export default defineConfig({
  ...pagination,
  testMatch: "free-photo-edges.qa.ts",
  workers: 1,
  retries: 0,
  timeout: 120_000,
  globalTimeout: 12 * 60_000,
  use: { ...pagination.use, viewport: { width: 1800, height: 1600 } },
  reporter: [
    ["line"],
    ["json", { outputFile: resolve("artifacts/free-photo-edges/results.json") }],
  ],
  outputDir: resolve("test-results/free-photo-edges"),
});

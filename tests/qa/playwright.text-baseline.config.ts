import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import pagination from "./playwright.pagination.config";

export default defineConfig({
  ...pagination,
  testDir: resolve("tests/e2e"),
  testMatch: "pdf-text-baseline.spec.ts",
  workers: 1,
  retries: 0,
  timeout: 90_000,
  reporter: [
    ["line"],
    ["json", { outputFile: resolve("artifacts/pdf-text-baseline/results.json") }],
  ],
  outputDir: resolve("test-results/pdf-text-baseline"),
});

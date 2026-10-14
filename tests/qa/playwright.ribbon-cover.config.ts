import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import pagination from "./playwright.pagination.config";

export default defineConfig({
  ...pagination,
  testDir: resolve("tests/e2e"),
  testMatch: "ribbon-cover-overflow.spec.ts",
  workers: 1,
  fullyParallel: false,
  timeout: 240_000,
  reporter: [
    ["line"],
    ["json", { outputFile: resolve("artifacts/ribbon-cover-overflow/results.json") }],
  ],
  outputDir: resolve("test-results/ribbon-cover-overflow"),
});

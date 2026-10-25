import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import pagination from "./playwright.pagination.config";

export default defineConfig({
  ...pagination,
  testDir: "../e2e",
  testMatch: ["pdf-word-boundaries.spec.ts", "native-print-text-order.spec.ts"],
  workers: 1,
  reporter: [["line"], ["json", { outputFile: resolve("artifacts/pdf-text-search/results.json") }]],
  outputDir: resolve("test-results/pdf-text-search"),
});

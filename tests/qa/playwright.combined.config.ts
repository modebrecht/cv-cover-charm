import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import pagination from "./playwright.pagination.config";
export default defineConfig({
  ...pagination,
  testMatch: "pagination-combined.qa.ts",
  reporter: [
    ["line"],
    ["json", { outputFile: resolve("artifacts/pagination-2page-combined/results.json") }],
  ],
  outputDir: resolve("test-results/pagination-combined"),
});

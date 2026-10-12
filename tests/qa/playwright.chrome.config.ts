import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import pagination from "./playwright.pagination.config";
export default defineConfig({
  ...pagination,
  testMatch: "pagination-chrome.qa.ts",
  reporter: [
    ["line"],
    ["json", { outputFile: resolve("artifacts/pagination-2page-chrome/results.json") }],
  ],
  outputDir: resolve("test-results/pagination-chrome"),
});

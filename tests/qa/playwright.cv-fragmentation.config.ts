import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import pagination from "./playwright.pagination.config";
export default defineConfig({
  ...pagination,
  testMatch: ["pagination-2page.qa.ts", "cv-flow-fragmentation.qa.ts", "pagination-chrome.qa.ts"],
  grep: /(?:matrix|boundary|variant|live|fragmentation|chrome).*\bcv\b/,
  reporter: [
    ["line"],
    ["json", { outputFile: resolve("artifacts/cv-flow-fragmentation/results.json") }],
  ],
  outputDir: resolve("test-results/cv-flow-fragmentation"),
});

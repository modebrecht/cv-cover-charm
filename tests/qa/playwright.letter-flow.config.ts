import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import pagination from "./playwright.pagination.config";

export default defineConfig({
  ...pagination,
  testMatch: [
    "pagination-2page.qa.ts",
    "pagination-chrome.qa.ts",
    "letter-pdf-textlayer.qa.ts",
    "letter-flow-boundaries.qa.ts",
  ],
  grep: /(?:matrix|boundary|variant|live|chrome).*\bletter\b|textlayer |flow /,
  reporter: [["line"], ["json", { outputFile: resolve("artifacts/letter-flow/results.json") }]],
  outputDir: resolve("test-results/letter-flow"),
});

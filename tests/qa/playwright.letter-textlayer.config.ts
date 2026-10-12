import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import pagination from "./playwright.pagination.config";

export default defineConfig({
  ...pagination,
  testMatch: ["pagination-2page.qa.ts", "pagination-chrome.qa.ts", "letter-pdf-textlayer.qa.ts"],
  grep: /(?:matrix|boundary|live|chrome).*\bletter\b|textlayer /,
  reporter: [
    ["line"],
    ["json", { outputFile: resolve("artifacts/letter-textlayer/results.json") }],
  ],
  outputDir: resolve("test-results/letter-textlayer"),
});

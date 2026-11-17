import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import pagination from "./playwright.pagination.config";

export default defineConfig({
  ...pagination,
  testMatch: "word-default-chrome.qa.ts",
  workers: 1,
  retries: 0,
  timeout: 180_000,
  reporter: [
    ["line"],
    ["json", { outputFile: resolve("artifacts/word-default-chrome/results.json") }],
  ],
  outputDir: resolve("test-results/word-default-chrome"),
});

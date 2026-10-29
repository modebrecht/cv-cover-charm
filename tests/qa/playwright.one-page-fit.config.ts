import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import pagination from "./playwright.pagination.config";

export default defineConfig({
  ...pagination,
  testMatch: "cv-one-page-fit.qa.ts",
  workers: 1,
  reporter: [["line"], ["json", { outputFile: resolve("artifacts/one-page-fit/results.json") }]],
  outputDir: resolve("test-results/one-page-fit"),
});

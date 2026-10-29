import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import pagination from "./playwright.pagination.config";

export default defineConfig({
  ...pagination,
  testMatch: "cv-smart-page-fit.qa.ts",
  workers: 1,
  reporter: [["line"], ["json", { outputFile: resolve("artifacts/smart-fit-29okt/results.json") }]],
  outputDir: resolve("test-results/smart-fit-29okt"),
});

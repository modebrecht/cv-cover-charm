import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import pagination from "./playwright.pagination.config";

export default defineConfig({
  ...pagination,
  testMatch: "cv-one-page-matrix.qa.ts",
  workers: 2,
  reporter: [["line"], ["json", { outputFile: resolve("artifacts/one-page-matrix/results.json") }]],
  outputDir: resolve("test-results/one-page-matrix"),
});

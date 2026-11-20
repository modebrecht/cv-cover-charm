import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import pagination from "./playwright.pagination.config";

export default defineConfig({
  ...pagination,
  testMatch: "classic-docx-pagination.qa.ts",
  workers: 1,
  reporter: "line",
  outputDir: resolve("test-results/classic-docx-pagination"),
});

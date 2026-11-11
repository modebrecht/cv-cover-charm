import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import pagination from "./playwright.pagination.config";

export default defineConfig({
  ...pagination,
  testMatch: "web-pdf-gallery.qa.ts",
  workers: 1,
  retries: 0,
  timeout: 90_000,
  globalTimeout: 25 * 60_000,
  use: { ...pagination.use, viewport: { width: 1800, height: 1600 } },
  reporter: [["line"], ["json", { outputFile: resolve("artifacts/web-pdf-gallery/results.json") }]],
  outputDir: resolve("test-results/web-pdf-gallery"),
});

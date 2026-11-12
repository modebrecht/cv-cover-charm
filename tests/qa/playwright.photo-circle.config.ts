import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import pagination from "./playwright.pagination.config";

export default defineConfig({
  ...pagination,
  testMatch: "photo-circle-raster.qa.ts",
  workers: 1,
  retries: 0,
  timeout: 90_000,
  use: { ...pagination.use, viewport: { width: 1800, height: 1600 }, deviceScaleFactor: 3 },
  reporter: [
    ["line"],
    ["json", { outputFile: resolve("artifacts/photo-circle-raster/results.json") }],
  ],
  outputDir: resolve("test-results/photo-circle-raster"),
});

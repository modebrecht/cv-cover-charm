import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import pagination from "./playwright.pagination.config";

export default defineConfig({
  ...pagination,
  testMatch: [
    "pdf-preflight.qa.ts",
    "pdf-preflight-safety.qa.ts",
    "pdf-consent-boundaries.qa.ts",
    "pdf-raster-parity.qa.ts",
  ],
  reporter: [["line"], ["json", { outputFile: resolve("artifacts/pdf-preflight/results.json") }]],
  outputDir: resolve("test-results/pdf-preflight"),
});

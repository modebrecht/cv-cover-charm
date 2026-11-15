import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import pagination from "./playwright.pagination.config";

export default defineConfig({
  ...pagination,
  testMatch: "lo-product-roundtrip.qa.ts",
  workers: 1,
  retries: 0,
  timeout: 90_000,
  reporter: [
    ["line"],
    ["json", { outputFile: resolve("artifacts/lo-product-roundtrip/results.json") }],
  ],
  outputDir: resolve("test-results/lo-product-roundtrip"),
});

import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import pagination from "./playwright.pagination.config";

export default defineConfig({
  ...pagination,
  testDir: "../e2e",
  testMatch: [
    "cv-demo-pagination.spec.ts",
    "cv-long-pagination.spec.ts",
    "letter-adversarial-content.spec.ts",
    "letter-physical-preflight.spec.ts",
    "cv-sidebar-mirror-refresh.spec.ts",
    "cv-combined-parity.spec.ts",
  ],
  reporter: [
    ["line"],
    ["json", { outputFile: resolve("artifacts/pagination-2page/product-results.json") }],
  ],
  outputDir: resolve("test-results/pagination-product"),
});

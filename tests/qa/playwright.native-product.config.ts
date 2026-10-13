import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import pagination from "./playwright.pagination.config";

export default defineConfig({
  ...pagination,
  testDir: "../e2e",
  testMatch: [
    "dossier-native-print.spec.ts",
    "native-print-physical-fitting.spec.ts",
    "native-print-background-paint.spec.ts",
    "native-print-text-order.spec.ts",
    "pdf-word-boundaries.spec.ts",
    "cv-demo-pagination.spec.ts",
    "cv-long-pagination.spec.ts",
    "letter-adversarial-content.spec.ts",
    "letter-physical-preflight.spec.ts",
    "cv-sidebar-mirror-refresh.spec.ts",
    "cv-combined-parity.spec.ts",
  ],
  workers: 1,
  reporter: [
    ["line"],
    ["json", { outputFile: resolve("artifacts/native-pdf-search-13okt/product-results.json") }],
  ],
  outputDir: resolve("test-results/native-pdf-search-product"),
});

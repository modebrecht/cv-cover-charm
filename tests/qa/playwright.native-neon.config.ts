import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import pagination from "./playwright.pagination.config";
export default defineConfig({
  ...pagination,
  testDir: resolve("tests"),
  testMatch: [
    "**/native-neon-text.qa.ts",
    "**/native-print-physical-fitting.spec.ts",
    "**/native-print-background-paint.spec.ts",
    "**/prism-neon-header-identity.spec.ts",
    "**/cv-card-refresh.spec.ts",
  ],
  fullyParallel: false,
  workers: 1,
  reporter: [
    ["line"],
    ["json", { outputFile: resolve("artifacts/native-neon-14okt/playwright.json") }],
  ],
  outputDir: resolve("test-results/native-neon"),
});

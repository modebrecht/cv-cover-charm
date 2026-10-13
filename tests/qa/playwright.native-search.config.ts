import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import pagination from "./playwright.pagination.config";

export default defineConfig({
  ...pagination,
  testMatch: "native-pdf-search.qa.ts",
  workers: 1,
  reporter: [
    ["line"],
    ["json", { outputFile: resolve("artifacts/native-pdf-search-13okt/results.json") }],
  ],
  outputDir: resolve("test-results/native-pdf-search-13okt"),
});

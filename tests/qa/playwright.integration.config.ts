import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import pagination from "./playwright.pagination.config";

// Both complete suites share the authoritative gallery and the production DOM.
export default defineConfig({
  ...pagination,
  testMatch: [
    "pagination-2page.qa.ts",
    "pagination-chrome.qa.ts",
    "cv-flow-fragmentation.qa.ts",
    "letter-pdf-textlayer.qa.ts",
    "letter-flow-boundaries.qa.ts",
  ],
  reporter: [
    ["line"],
    [
      "json",
      {
        outputFile: resolve(
          process.env.PAGINATION_QA_REPORT ?? "artifacts/pagination-integration/results.json",
        ),
      },
    ],
  ],
  outputDir: resolve("test-results/pagination-integration"),
});

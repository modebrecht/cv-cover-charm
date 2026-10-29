import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import pagination from "./playwright.pagination.config";

export default defineConfig({
  ...pagination,
  webServer: {
    command: "node_modules/.bin/vite dev --host 127.0.0.1 --port 4174",
    cwd: process.cwd(),
    url: "http://127.0.0.1:4174",
    timeout: 60_000,
    reuseExistingServer: false,
  },
  testDir: ".",
  testMatch: "dossier-historical-import.qa.ts",
  workers: 1,
  retries: 0,
  timeout: 120_000,
  globalTimeout: 25 * 60_000,
  reporter: [
    ["line"],
    [
      "json",
      {
        outputFile: resolve(
          process.env.HISTORICAL_IMPORT_REPORT ??
            "artifacts/historical-import-28okt/browser-results.json",
        ),
      },
    ],
  ],
  outputDir: resolve("test-results/historical-import-28okt"),
});

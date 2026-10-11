import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";

// Explicit opt-in suite: existing product failures must not alter release CI.
export default defineConfig({
  webServer: {
    command: "node_modules/.bin/vite dev --host 127.0.0.1 --port 4173",
    cwd: process.cwd(),
    url: "http://127.0.0.1:4173/lebenslauf",
    timeout: 60_000,
    reuseExistingServer: false,
  },
  testDir: ".",
  testMatch: "pagination-2page.qa.ts",
  timeout: 180_000,
  retries: 0,
  workers: 2,
  use: { viewport: { width: 1800, height: 1500 }, screenshot: "only-on-failure" },
  reporter: [
    ["line"],
    ["json", { outputFile: resolve("artifacts/pagination-2page/playwright-results.json") }],
  ],
  outputDir: resolve("test-results/pagination-2page"),
});

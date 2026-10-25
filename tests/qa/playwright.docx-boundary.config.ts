import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";

/** Existing browser regressions for the shared contact and saved-state edges only. */
export default defineConfig({
  testDir: resolve("tests/e2e"),
  testMatch: ["dossier-chrome-document-content.spec.ts", "dossier-state-roundtrip.spec.ts"],
  workers: 1,
  retries: 0,
  timeout: 90_000,
  use: { viewport: { width: 1600, height: 1200 }, screenshot: "only-on-failure" },
  webServer: {
    command: "bun run dev -- --host 127.0.0.1 --port 4173",
    cwd: process.cwd(),
    url: "http://127.0.0.1:4173/lebenslauf",
    timeout: 60_000,
    reuseExistingServer: false,
  },
  reporter: [
    ["line"],
    ["json", { outputFile: resolve("artifacts/docx-next-boundary/browser-results.json") }],
  ],
  outputDir: resolve("test-results/docx-next-boundary"),
});

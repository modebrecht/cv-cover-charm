import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import preflight from "./playwright.preflight.config";

// Bounded policy diagnostic. The normal preflight config still includes every
// CV raster case; a green core run alone is not full raster/release acceptance.
export default defineConfig({
  ...preflight,
  testDir: "..",
  testMatch: [
    "**/pdf-preflight.qa.ts",
    "**/pdf-preflight-safety.qa.ts",
    "**/pdf-consent-boundaries.qa.ts",
    "**/letter-physical-preflight.spec.ts",
    "**/dossier-letter-preflight.spec.ts",
  ],
  workers: 1,
  retries: 0,
  globalTimeout: 18 * 60_000,
  use: { ...preflight.use, trace: "off" },
  reporter: [
    ["line"],
    ["json", { outputFile: resolve("artifacts/pdf-core-recovery/results.json") }],
  ],
  outputDir: resolve("test-results/pdf-core-recovery"),
});

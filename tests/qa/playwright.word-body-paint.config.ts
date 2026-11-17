import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import base from "./playwright.word-default-chrome.config";

export default defineConfig({
  ...base,
  testMatch: "word-body-paint.qa.ts",
  reporter: [["line"], ["json", { outputFile: resolve("artifacts/word-body-paint/results.json") }]],
  outputDir: resolve("test-results/word-body-paint"),
});

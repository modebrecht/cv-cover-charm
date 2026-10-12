import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import product from "./playwright.product.config";

export default defineConfig({
  ...product,
  testMatch: [
    ...(Array.isArray(product.testMatch) ? product.testMatch : []),
    "letter-pdf-richtext.spec.ts",
    "shared-editor-controls-consistency.spec.ts",
    "dossier-chrome-sync.spec.ts",
  ],
  reporter: [
    ["line"],
    ["json", { outputFile: resolve("artifacts/letter-textlayer/product-results.json") }],
  ],
  outputDir: resolve("test-results/letter-textlayer-product"),
});

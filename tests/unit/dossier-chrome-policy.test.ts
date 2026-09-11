import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const chrome = readFileSync(
  new URL("../../src/components/dossier/DossierHeaderFooterChrome.tsx", import.meta.url),
  "utf8",
);
const css = readFileSync(
  new URL("../../src/components/dossier/chrome-policy.css", import.meta.url),
  "utf8",
);

describe("global quiet chrome policy", () => {
  test("shared chrome loads the global policy", () => {
    expect(chrome).toContain('import "./chrome-policy.css";');
  });

  test("detached Fresh header micro-rules are suppressed centrally", () => {
    for (const motif of [
      "edge-rule",
      "glow-rule",
      "mono-bottom-rule",
      "top-rule",
      "rail-rule",
      "clay-rule",
      "cool-rule",
      "warm-rule",
    ]) {
      expect(css).toContain(`[data-letter-motif="${motif}"]`);
    }
    expect(css).toContain('[data-dossier-sheet-background="horizon"] > div:nth-child(2)');
    expect(css).toContain('[data-dossier-sheet-background="violetPulse"] > div:nth-child(2)');
    expect(css).toContain('[data-dossier-sheet-background="orbit"] > div:nth-child(3)');
    expect(css).toContain("display: none !important;");
  });
});

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const cvCss = readFileSync(
  new URL("../../src/components/cv/full-section-rules.css", import.meta.url),
  "utf8",
);
const letterCss = readFileSync(
  new URL("../../src/components/dossier/edel-stationery.css", import.meta.url),
  "utf8",
);

describe("Kolumne contact rail cleanup", () => {
  test("suppresses the legacy Terracotta contact rail in the CV", () => {
    expect(cvCss).toContain('[data-dossier-sheet-background="terracotta"]');
    expect(cvCss).toContain('.left-\\[6mm\\].top-\\[20mm\\].h-\\[38mm\\].w-\\[1px\\]');
    expect(cvCss).toContain("display: none !important;");
  });

  test("suppresses the same rail in the motivation letter", () => {
    expect(letterCss).toContain('[data-letter-background-variant="quiet-column"]');
    expect(letterCss).toContain('[data-dossier-sheet-background="terracotta"]');
    expect(letterCss).toContain('[data-letter-motif="rail-rule"]');
    expect(letterCss).toContain("display: none !important;");
  });
});

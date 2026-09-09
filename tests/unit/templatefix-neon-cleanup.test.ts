import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const coverFixes = readFileSync(
  new URL("../../src/components/cover/template-typography-fixes.css", import.meta.url),
  "utf8",
);
const cvRules = readFileSync(
  new URL("../../src/components/cv/full-section-rules.css", import.meta.url),
  "utf8",
);

describe("Neon template cleanup", () => {
  test("cover hides the legacy separator above Kontakt", () => {
    expect(coverFixes).toContain('html[data-dossier-template="neon"]');
    expect(coverFixes).toContain('[data-block-id="trenner"]');
    expect(coverFixes).toContain("display: none !important;");
  });

  test("CV removes the old inner card that covered the white hero heading", () => {
    expect(cvRules).toContain('[data-dossier-sheet-background="neon"]');
    expect(cvRules).toContain("> div:last-child");
    expect(cvRules).toContain("display: none !important;");
  });

  test("Neon modern CV hides sidebar and header micro-rules without route-only attrs", () => {
    expect(cvRules).toContain('html[data-dossier-template="neon"]');
    expect(cvRules).toContain('[data-cv-section="sidebar"]');
    expect(cvRules).toContain('[data-cv-accent="header"]');
  });
});

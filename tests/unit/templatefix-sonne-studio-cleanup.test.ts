import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const decorations = readFileSync(
  new URL("../../src/components/cover/template-decorations.ts", import.meta.url),
  "utf8",
);
const stationery = readFileSync(
  new URL("../../src/components/dossier/edel-stationery.css", import.meta.url),
  "utf8",
);
const cvRules = readFileSync(
  new URL("../../src/components/cv/full-section-rules.css", import.meta.url),
  "utf8",
);

describe("Sonne and Studio template cleanup", () => {
  test("Sonne drops the oversized lower cover circle and uses a calmer letter header", () => {
    expect(decorations).not.toContain("decor-bottom-circle");
    expect(stationery).toContain('[data-dossier-sheet-background="sonne"]');
    expect(stationery).toContain("height: 38mm !important;");
  });

  test("Studio removes isolated cover/letter dashes and lengthens the letter accent", () => {
    expect(decorations).not.toContain("decor-accent-bar");
    expect(stationery).toContain('[data-dossier-sheet-background="studio"]');
    expect(stationery).toContain('[data-letter-motif="accent-block"]');
    expect(stationery).toContain("height: 24mm !important;");
    expect(stationery).toContain('[data-letter-motif="rail-rule"]');
    expect(stationery).toContain("display: none !important;");
  });

  test("Studio suppresses the legacy CV footer and modern CV micro-dashes stay hidden", () => {
    expect(stationery).toContain('[data-dossier-document="cv"]');
    expect(stationery).toContain("> .absolute.inset-x-0.bottom-0");
    expect(cvRules).toContain('[data-cv-section="sidebar"]');
    expect(cvRules).toContain('[data-cv-accent="header"]');
  });
});

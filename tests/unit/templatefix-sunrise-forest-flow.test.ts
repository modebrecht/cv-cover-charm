import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const css = readFileSync(
  new URL("../../src/components/cover/templatefix-24-25.css", import.meta.url),
  "utf8",
);
const freshTemplates = readFileSync(
  new URL("../../src/components/cover/fresh-templates.ts", import.meta.url),
  "utf8",
);
const letterBackground = readFileSync(
  new URL("../../src/components/letter/LetterSheetBackground.tsx", import.meta.url),
  "utf8",
);

describe("templateFIX Sunrise + Forest Flow", () => {
  test("Sunrise motivation letter has no orphan top rule", () => {
    expect(css).toContain('[data-letter-fresh-template="sunrise"] [data-letter-motif="top-rule"]');
    expect(css).toContain("display: none !important;");
  });

  test("Forest Flow no longer uses a permanent full-height rail", () => {
    expect(css).toContain('html[data-dossier-template="forestFlow"]');
    expect(css).toContain('height: 24mm !important;');
    expect(css).toContain('[data-letter-motif="rail"]');
    expect(css).toContain('width: 210mm !important;');
    expect(css).toContain('height: 10mm !important;');
    expect(css).toContain('[data-letter-motif="rail-rule"]');
  });

  test("Forest Flow CV is a quiet top-canopy family and does not force layout", () => {
    expect(css).toContain('[data-dossier-document="cv"]');
    expect(css).toContain('height: 9mm !important;');
    expect(css).toContain('background: transparent !important;');
    expect(css).not.toContain('data-cv-layout="modern"');
  });

  test("override stylesheet loads in cover/CV and letter render paths", () => {
    expect(freshTemplates).toContain('import "./templatefix-24-25.css";');
    expect(letterBackground).toContain(
      'import "@/components/cover/templatefix-24-25.css";',
    );
  });
});

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const css = readFileSync(
  new URL("../../src/components/cover/templatefix-24-25.css", import.meta.url),
  "utf8",
);
const acceptanceCss = readFileSync(
  new URL("../../src/components/cover/fresh-cover-visual-cleanup.css", import.meta.url),
  "utf8",
);
const gradientCss = readFileSync(
  new URL("../../src/components/cover/gradient-templates.css", import.meta.url),
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

  test("Forest Flow has one geometry owner and no permanent full-height rail", () => {
    expect(css).toContain('html[data-dossier-template="forestFlow"]');
    expect(css).toContain("height: 24mm !important;");
    expect(css).toContain('[data-letter-motif="rail"]');
    expect(css).toContain("width: 210mm !important;");
    expect(css).toContain("height: 10mm !important;");
    expect(css).toContain('[data-letter-motif="rail-rule"]');

    // Both older stylesheets previously reintroduced a large vertical rail.
    // The dedicated 24/25 stylesheet is now the only Forest Flow geometry owner.
    expect(acceptanceCss).not.toContain('[data-fresh-cover-background="forestFlow"]');
    expect(acceptanceCss).not.toContain('data-dossier-template="forestFlow"');
    expect(gradientCss).not.toContain('data-dossier-template="forestFlow"');
  });

  test("Forest Flow cover keeps the shared title stack on the paper", () => {
    expect(css).toContain(
      ':is([data-block-id="name"], [data-block-id="beruf"], [data-block-id="lehrbeginn"])',
    );
    expect(css).not.toContain("translate(-34mm");
  });

  test("Forest Flow CV targets the three direct signature siblings", () => {
    expect(css).toContain(
      '> [data-dossier-sheet-background="forestFlow"]\n  > div:nth-child(1)',
    );
    expect(css).toContain(
      '> [data-dossier-sheet-background="forestFlow"]\n  > div:nth-child(2)',
    );
    expect(css).toContain(
      '> [data-dossier-sheet-background="forestFlow"]\n  > div:nth-child(3)',
    );
    expect(css).not.toContain(
      '> div:first-child\n  > div:first-child\n  > div:first-child',
    );
  });

  test("Forest Flow CV is a quiet top-canopy family and does not force layout", () => {
    expect(css).toContain('[data-dossier-document="cv"]');
    expect(css).toContain("height: 9mm !important;");
    expect(css).toContain("background: transparent !important;");
    expect(css).toContain('[data-cv-accent="section"]');
    expect(css).not.toContain('data-cv-layout="modern"');
  });

  test("override stylesheet loads in cover/CV and letter render paths", () => {
    expect(freshTemplates).toContain('import "./templatefix-24-25.css";');
    expect(letterBackground).toContain(
      'import "@/components/cover/templatefix-24-25.css";',
    );
  });
});

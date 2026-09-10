import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const css = readFileSync(
  new URL("../../src/components/cover/templatefix-32-36-cv-masthead.css", import.meta.url),
  "utf8",
);
const freshTemplates = readFileSync(
  new URL("../../src/components/cover/fresh-templates.ts", import.meta.url),
  "utf8",
);

describe("32-36 CV masthead DOM repair", () => {
  test("loads after the original 32-36 cleanup", () => {
    const oldImport = freshTemplates.indexOf('import "./templatefix-32-36.css";');
    const repairImport = freshTemplates.indexOf('import "./templatefix-32-36-cv-masthead.css";');
    expect(oldImport).toBeGreaterThanOrEqual(0);
    expect(repairImport).toBeGreaterThan(oldImport);
  });

  test("targets the real DossierSheetSignature sibling contract", () => {
    expect(css).toContain('> [data-dossier-sheet-background="orbit"]\n  > div:nth-child(1)');
    expect(css).toContain('> [data-dossier-sheet-background="prism"]\n  > div:nth-child(2)');
    expect(css).toContain('> [data-dossier-sheet-background="gallery"]\n  > div:nth-child(2)');
    expect(css).toContain('> [data-dossier-sheet-background="ribbon"]\n  > div:nth-child(2)');
    expect(css).toContain('> [data-dossier-sheet-background="cove"]\n  > div:nth-child(2)');
  });

  test("Orbit cannot stretch its ring into a rectangular frame", () => {
    const orbit = css.slice(css.indexOf('html[data-dossier-template="orbit"]'));
    expect(orbit).toContain("height: 0 !important;");
    expect(orbit).toContain("border-width: 10mm 0 0 0 !important;");
    expect(orbit).toContain("border-radius: 0 !important;");
  });

  test("retires the third signature colour from all five CV mastheads", () => {
    expect(css).toContain("> div:nth-child(3) {\n  display: none !important;");
  });
});

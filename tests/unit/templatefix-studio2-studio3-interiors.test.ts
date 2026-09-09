import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const css = readFileSync(
  new URL("../../src/components/cover/templatefix-27-28.css", import.meta.url),
  "utf8",
);
const freshTemplates = readFileSync(
  new URL("../../src/components/cover/fresh-templates.ts", import.meta.url),
  "utf8",
);

describe("templateFIX Studio 2 / Studio 3 interiors", () => {
  test("loads the interior-only cleanup after the legacy studio variant CSS", () => {
    const legacy = freshTemplates.indexOf('import "./studio-warm-variants.css";');
    const cleanup = freshTemplates.indexOf('import "./templatefix-27-28.css";');
    expect(legacy).toBeGreaterThanOrEqual(0);
    expect(cleanup).toBeGreaterThan(legacy);
  });

  test("does not target either title page", () => {
    expect(css).not.toContain('[data-dossier-document="cover"]');
  });

  test("Studio 2 letter and CV use a compact two-tone masthead", () => {
    expect(css).toContain('[data-letter-fresh-template="studio2"] [data-letter-motif="rail"]');
    expect(css).toContain('[data-letter-fresh-template="studio2"] [data-letter-motif="signal"]');
    expect(css).toContain('width: 58mm !important;');
    expect(css).toContain('[data-letter-motif="rail-rule"]');
    expect(css).toContain('html[data-dossier-template="studio2"]');
    expect(css).toContain('height: 10mm !important;');
  });

  test("Studio 3 letter and CV use the deep-green/mint masthead without orphan rules", () => {
    expect(css).toContain('[data-letter-fresh-template="studio3"] [data-letter-motif="rail"]');
    expect(css).toContain('[data-letter-fresh-template="studio3"] [data-letter-motif="top-field"]');
    expect(css).toContain('[data-letter-motif="top-rule"]');
    expect(css).toContain('html[data-dossier-template="studio3"]');
    expect(css).toContain('height: 12mm !important;');
  });

  test("both CV interiors remove the detached header and rubric strokes", () => {
    expect(css.match(/\[data-cv-accent="header"\]/g)?.length).toBe(2);
    expect(css.match(/\[data-cv-accent="section"\]/g)?.length).toBe(2);
  });
});

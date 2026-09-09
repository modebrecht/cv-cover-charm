import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const layout = readFileSync(new URL("../../src/components/cv/layout.ts", import.meta.url), "utf8");
const letter = readFileSync(
  new URL("../../src/components/letter/fresh-letter-system.ts", import.meta.url),
  "utf8",
);
const cvRules = readFileSync(
  new URL("../../src/components/cv/full-section-rules.css", import.meta.url),
  "utf8",
);

describe("Edge dossier consistency", () => {
  test("unsaved CVs default to the one-column Standard layout", () => {
    expect(layout).toContain('const DEFAULT_LAYOUT: CvLayoutId = "classic";');
    expect(layout).toContain("return valid(value) ? value : DEFAULT_LAYOUT;");
  });

  test("Edge letter echoes the cover masthead instead of a permanent rail", () => {
    const edge = letter.slice(letter.indexOf("  edge: {"), letter.indexOf("  glow: {"));
    expect(edge).toContain('archetype: "band"');
    expect(edge).toContain("left: 25");
    expect(edge).toContain('rect("edge-band", 0, 0, 210, 12, "primary")');
    expect(edge).toContain('rect("edge-signal", 0, 0, 5, 12, "secondary")');
    expect(edge).not.toContain('rect("rail"');
    expect(edge).not.toContain("top-rule");
  });

  test("Edge CV keeps the same narrow signal edge and drops the card treatment", () => {
    expect(cvRules).toContain('html[data-dossier-template="edge"]');
    expect(cvRules).toContain("width: 5mm !important;");
    expect(cvRules).toContain("height: 12mm !important;");
    expect(cvRules).toContain("top: 12mm !important;");
    expect(cvRules).toContain("left: 0 !important;");
    expect(cvRules).toContain("right: 0 !important;");
    expect(cvRules).toContain("box-shadow: none !important;");
  });
});

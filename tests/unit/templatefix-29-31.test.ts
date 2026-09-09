import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/components/cover/templatefix-29-31.css", "utf8");

describe("templateFIX 29-31", () => {
  it("keeps Warm 2 to coral/apricot geometry without the third large field", () => {
    expect(css).toContain('data-dossier-template="warm2"');
    expect(css).toContain('data-letter-fresh-template="warm2"');
    expect(css).toContain('data-letter-motif="top-rule"');
    expect(css).toContain("display: none !important");
  });

  it("keeps Warm 3 to teal/amber geometry without the terracotta field", () => {
    expect(css).toContain('data-dossier-template="warm3"');
    expect(css).toContain('data-letter-fresh-template="warm3"');
    expect(css).toContain('data-letter-motif="right-field"');
  });

  it("turns Ledger into a full-width readable CV in classic layout", () => {
    expect(css).toContain('data-dossier-template="ledger"');
    expect(css).toContain('data-cv-layout="classic"');
    expect(css).toContain("left: 20mm !important");
    expect(css).toContain("right: 20mm !important");
    expect(css).toContain('data-cv-accent="section"');
  });
});

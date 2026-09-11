import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/components/cover/templatefix-29-31.css", "utf8");
const chromePolicy = readFileSync("src/components/dossier/chrome-policy.css", "utf8");

describe("templateFIX 29-31", () => {
  it("keeps Warm 2 to coral/apricot geometry while rule suppression stays global", () => {
    expect(css).toContain('data-dossier-template="warm2"');
    expect(css).toContain('data-letter-fresh-template="warm2"');
    expect(css).not.toContain('[data-letter-fresh-template="warm2"] [data-letter-motif="top-rule"]');
    expect(chromePolicy).toContain('[data-letter-motif="top-rule"]');
  });

  it("keeps Warm 3 to teal/amber geometry without a local chrome-line patch", () => {
    expect(css).toContain('data-dossier-template="warm3"');
    expect(css).toContain('data-letter-fresh-template="warm3"');
    expect(css).toContain('data-letter-motif="right-field"');
    expect(css).not.toContain('Never add a second chrome hairline');
  });

  it("turns Ledger into a full-width readable CV in classic layout", () => {
    expect(css).toContain('data-dossier-template="ledger"');
    expect(css).toContain('data-cv-layout="classic"');
    expect(css).toContain("left: 20mm !important");
    expect(css).toContain("right: 20mm !important");
    expect(css).toContain('data-cv-accent="section"');
  });
});

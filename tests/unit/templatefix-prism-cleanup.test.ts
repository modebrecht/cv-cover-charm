import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const css = readFileSync(
  new URL("../../src/components/cover/templatefix-prism.css", import.meta.url),
  "utf8",
);
const registry = readFileSync(
  new URL("../../src/components/cover/fresh-templates.ts", import.meta.url),
  "utf8",
);

describe("Prism interior cleanup", () => {
  test("leaves the title page untouched and loads only interior overrides", () => {
    expect(registry).toContain('import "./templatefix-prism.css";');
    expect(css).not.toContain('[data-dossier-document="cover"]');
  });

  test("motivation letter uses one compact two-tone masthead without the cyan micro-rule", () => {
    expect(css).toContain('[data-letter-motif="top-wedge"]');
    expect(css).toContain("height: 7mm !important;");
    expect(css).toContain('[data-letter-motif="top-signal"]');
    expect(css).toContain('[data-letter-motif="top-rule"]');
    expect(css).toContain("display: none !important;");
  });

  test("CV removes the large diagonal hero and decorative heading rules", () => {
    expect(css).toContain('[data-dossier-document="cv"]');
    expect(css).toContain("height: 9mm !important;");
    expect(css).toContain('[data-cv-sidebar-tint]');
    expect(css).toContain('[data-cv-accent="header"]');
    expect(css).toContain('[data-cv-accent="section"]');
    expect(css).toContain("box-shadow: none !important;");
  });
});

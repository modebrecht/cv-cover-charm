import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const css = readFileSync(
  new URL("../../src/components/cover/templatefix-violet-pulse.css", import.meta.url),
  "utf8",
);
const chromePolicy = readFileSync(
  new URL("../../src/components/dossier/chrome-policy.css", import.meta.url),
  "utf8",
);
const registry = readFileSync(
  new URL("../../src/components/cover/fresh-templates.ts", import.meta.url),
  "utf8",
);

describe("Violet Pulse interior cleanup", () => {
  test("keeps the title page untouched and loads only interior overrides", () => {
    expect(registry).toContain('import "./templatefix-violet-pulse.css";');
    expect(css).not.toContain('[data-dossier-document="cover"]');
  });

  test("motivation letter uses one calm top signature and global rule suppression", () => {
    expect(css).toContain('[data-letter-motif="top-field"]');
    expect(css).toContain("width: 210mm !important;");
    expect(css).toContain("height: 6mm !important;");
    expect(css).not.toContain('[data-letter-motif="top-rule"]');
    expect(chromePolicy).toContain('[data-letter-motif="top-rule"]');
  });

  test("CV removes old giant motif treatment and decorative heading dashes", () => {
    expect(css).toContain('[data-dossier-document="cv"]');
    expect(css).toContain("width: 62mm !important;");
    expect(css).toContain("height: 28mm !important;");
    expect(css).toContain('[data-cv-accent="section"]');
    expect(css).toContain('[data-cv-accent="header"]');
    expect(css).toContain("box-shadow: none !important;");
    expect(chromePolicy).toContain('[data-dossier-sheet-background="violetPulse"] > div:nth-child(2)');
  });
});

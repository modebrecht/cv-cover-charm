import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const css = readFileSync(
  new URL("../../src/components/letter/warm-letter-polish.css", import.meta.url),
  "utf8",
);
const background = readFileSync(
  new URL("../../src/components/letter/LetterSheetBackground.tsx", import.meta.url),
  "utf8",
);

describe("templateFIX Warm motivation letter header", () => {
  test("Warm owns the first-page compact header without a stray chrome border", () => {
    expect(background).toContain('import "./warm-letter-polish.css";');
    expect(css).toContain('[data-dossier-header-border]');
    expect(css).toContain("display: none !important;");
  });

  test("Warm sender is visually centred without changing document flow", () => {
    expect(css).toContain("[data-letter-warm-sender]");
    expect(css).toContain("transform: translateY(-11mm);");
  });

  test("Warm polish no longer rewrites the ring/orb via positional child selectors", () => {
    expect(css).not.toContain("> div:nth-child(2)");
    expect(css).not.toContain("> div:nth-child(3)");
  });
});

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const canvas = readFileSync(
  new URL("../../src/components/letter/LetterCanvas.tsx", import.meta.url),
  "utf8",
);
const chrome = readFileSync(
  new URL("../../src/components/dossier/DossierHeaderFooterChrome.tsx", import.meta.url),
  "utf8",
);
const background = readFileSync(
  new URL("../../src/components/letter/LetterSheetBackground.tsx", import.meta.url),
  "utf8",
);
const layout = readFileSync(
  new URL("../../src/components/letter/layout-system.ts", import.meta.url),
  "utf8",
);
const warmLayout = readFileSync(
  new URL("../../src/components/letter/warm-letter-layout.ts", import.meta.url),
  "utf8",
);

describe("templateFIX Warm motivation letter header", () => {
  test("Warm owns the first-page compact header without a shared chrome border", () => {
    expect(chrome).toContain('template === "freundlich"');
    expect(chrome).toContain("!warmLetterOwnsFirstPageHeader");
    expect(chrome).not.toContain("data-dossier-header-border");
    expect(background).not.toContain("warm-letter-polish.css");
  });

  test("Warm sender is structurally centred inside the masthead without transforms", () => {
    expect(canvas).toContain("data-letter-warm-sender");
    expect(canvas).toContain('className="absolute z-[4] flex items-center');
    expect(canvas).toContain("WARM_FIRST_PAGE_HEADER_HEIGHT_MM");
    expect(canvas).not.toContain("translateY(");
  });

  test("Warm sender PDF text owns the full masthead text width", () => {
    expect(canvas).toContain('data-letter-pdf-text="sender" className="w-full min-w-0"');
  });

  test("Warm masthead height has one shared geometry source", () => {
    expect(warmLayout).toContain("WARM_FIRST_PAGE_HEADER_HEIGHT_MM = 52");
    expect(layout).toContain("return WARM_FIRST_PAGE_HEADER_HEIGHT_MM;");
    expect(background).toContain("WARM_FIRST_PAGE_HEADER_HEIGHT_MM");
  });

  test("Warm ring and orb remain explicit named motifs", () => {
    expect(background).toContain("data-letter-warm-ring");
    expect(background).toContain("data-letter-warm-orb");
    expect(background).not.toContain("> div:nth-child(2)");
    expect(background).not.toContain("> div:nth-child(3)");
  });
});

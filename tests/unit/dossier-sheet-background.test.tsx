import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DossierSheetBackground,
  letterLayoutFor,
} from "../../src/components/dossier/DossierSheetBackground";
import { TEMPLATES } from "../../src/components/cover/types";
import { defaultLetterColors } from "../../src/components/letter/types";

const markupFor = (
  template: Parameters<typeof DossierSheetBackground>[0]["template"],
  pageIndex = 0,
) =>
  renderToStaticMarkup(
    createElement(DossierSheetBackground, {
      template,
      colors: defaultLetterColors(template),
      pageIndex,
    }),
  );

// Release guard: this contract is part of the parallel 39-PDF + browser smoke gate.
describe("shared dossier sheet background", () => {
  test("every dossier template renders the shared non-brief background", () => {
    for (const { id } of TEMPLATES) {
      const markup = markupFor(id);
      expect(markup).toContain(`data-dossier-sheet-background="${id}"`);
      expect(markup).not.toContain('data-dossier-sheet-background="brief"');
      expect(markup).not.toContain('data-letter-background="brief"');
      expect(markup).not.toContain("bg-white");
    }
  });

  test("established templates use CV archetype geometry on the letter too", () => {
    expect(markupFor("freundlich")).toContain("height:52mm");
    expect(markupFor("colorful")).toContain("height:40mm");
    expect(markupFor("colorful")).toContain("height:8mm");
    expect(markupFor("blockig")).toContain("width:66mm");
    expect(markupFor("terracotta")).toContain("width:70mm");
    expect(markupFor("studio")).toContain("width:72mm");
    expect(markupFor("studio")).toContain("height:38mm");
    expect(letterLayoutFor("modern").top).toBe(14);
    expect(letterLayoutFor("freundlich").top).toBe(60);
    expect(letterLayoutFor("blockig").left).toBe(74);
    expect(letterLayoutFor("studio").left).toBe(80);
    expect(letterLayoutFor("edel").left).toBe(19);
  });

  test("continuation pages collapse large CV headers without overlapping content", () => {
    expect(markupFor("freundlich", 1)).toContain("height:14mm");
    expect(markupFor("colorful", 1)).toContain("height:14mm");
    expect(markupFor("studio", 1)).toContain("height:13mm");
    expect(markupFor("studio", 1)).toContain("top:0mm");
    expect(markupFor("studio", 1)).toContain("width:72mm");
  });

  test("Brief remains the deliberate plain-white alternative", () => {
    const markup = markupFor("brief");
    expect(markup).toContain('data-dossier-sheet-background="brief"');
    expect(markup).toContain('data-letter-background="brief"');
    expect(markup).toContain("bg-white");
  });
});

import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DossierSheetBackground } from "../../src/components/dossier/DossierSheetBackground";
import { TEMPLATES } from "../../src/components/cover/types";
import { defaultLetterColors } from "../../src/components/letter/types";

describe("shared dossier sheet background", () => {
  test("every dossier template renders the shared non-brief background", () => {
    for (const { id } of TEMPLATES) {
      const markup = renderToStaticMarkup(
        createElement(DossierSheetBackground, { template: id, colors: defaultLetterColors(id) }),
      );
      expect(markup).toContain(`data-dossier-sheet-background="${id}"`);
      expect(markup).not.toContain('data-dossier-sheet-background="brief"');
    }
  });

  test("Brief remains the deliberate plain-white alternative", () => {
    const markup = renderToStaticMarkup(
      createElement(DossierSheetBackground, {
        template: "brief",
        colors: defaultLetterColors("brief"),
      }),
    );
    expect(markup).toContain('data-dossier-sheet-background="brief"');
    expect(markup).toContain("bg-white");
  });
});

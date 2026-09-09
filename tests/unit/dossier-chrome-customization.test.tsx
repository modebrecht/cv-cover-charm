import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DossierHeaderFooterChrome } from "../../src/components/dossier/DossierHeaderFooterChrome";
import {
  DEFAULT_DOSSIER_CHROME_OPTIONS,
  dossierFooterContentBottomMmForOptions,
  dossierHeaderContentTopMmForOptions,
  normalizeDossierChromeState,
} from "../../src/lib/dossier-chrome";
import { DEMO_LETTER, emptyLetterDesign } from "../../src/components/letter/types";
import { letterPageGeometry } from "../../src/components/letter/layout-system";

const contact = {
  name: "Lea Müller",
  address: "Dorfstrasse 12",
  place: "4535 Hubersdorf",
  phone: "+41 79 123 45 67",
  email: "lea@example.ch",
};

describe("dossier chrome customization", () => {
  test("new defaults use stacked header text, inline footer text and template styling", () => {
    expect(DEFAULT_DOSSIER_CHROME_OPTIONS.headerTextLayout).toBe("stacked");
    expect(DEFAULT_DOSSIER_CHROME_OPTIONS.footerTextLayout).toBe("inline");
    expect(DEFAULT_DOSSIER_CHROME_OPTIONS.headerHeightMm).toBeNull();
    expect(DEFAULT_DOSSIER_CHROME_OPTIONS.footerHeightMm).toBeNull();
    expect(DEFAULT_DOSSIER_CHROME_OPTIONS.headerBackgroundColor).toBeNull();
    expect(DEFAULT_DOSSIER_CHROME_OPTIONS.headerGradientColor).toBeNull();
    expect(DEFAULT_DOSSIER_CHROME_OPTIONS.footerBackgroundColor).toBeNull();
    expect(DEFAULT_DOSSIER_CHROME_OPTIONS.footerGradientColor).toBeNull();
    expect(DEFAULT_DOSSIER_CHROME_OPTIONS.textFont).toBeNull();
  });

  test("normalization keeps valid customization and rejects malformed values", () => {
    const state = normalizeDossierChromeState({
      sync: true,
      shared: {
        ...DEFAULT_DOSSIER_CHROME_OPTIONS,
        headerMode: "contact",
        footerMode: "details",
        headerHeightMm: 28,
        footerHeightMm: 16,
        headerTextLayout: "inline",
        footerTextLayout: "stacked",
        headerBackgroundColor: "#123456",
        headerGradientColor: "#abcdef",
        footerBackgroundColor: "not-a-color",
        textFont: "freundlich",
      },
    });

    expect(state.shared.headerHeightMm).toBe(28);
    expect(state.shared.footerHeightMm).toBe(16);
    expect(state.shared.headerTextLayout).toBe("inline");
    expect(state.shared.footerTextLayout).toBe("stacked");
    expect(state.shared.headerBackgroundColor).toBe("#123456");
    expect(state.shared.headerGradientColor).toBe("#abcdef");
    expect(state.shared.footerBackgroundColor).toBeNull();
    expect(state.shared.textFont).toBe("freundlich");
  });

  test("custom heights reserve matching CV content space", () => {
    const options = {
      ...DEFAULT_DOSSIER_CHROME_OPTIONS,
      headerMode: "contact" as const,
      footerMode: "details" as const,
      headerHeightMm: 30,
      footerHeightMm: 18,
    };

    expect(dossierHeaderContentTopMmForOptions(options)).toBe(39);
    expect(dossierFooterContentBottomMmForOptions(options)).toBe(28);
  });

  test("letter geometry follows the same custom heights", () => {
    const design = {
      ...emptyLetterDesign(),
      headerMode: "contact" as const,
      footerMode: "attachments" as const,
      headerHeightMm: 30,
      footerHeightMm: 18,
    };
    const geometry = letterPageGeometry(DEMO_LETTER, design);

    expect(geometry.content.top).toBe(39);
    expect(geometry.footer.height).toBe(18);
    expect(geometry.content.bottom).toBe(25);
  });

  test("renderer applies custom font, gradient backgrounds and text layouts", () => {
    const options = {
      ...DEFAULT_DOSSIER_CHROME_OPTIONS,
      headerMode: "contact" as const,
      footerMode: "details" as const,
      headerTextLayout: "stacked" as const,
      footerTextLayout: "inline" as const,
      headerBackgroundColor: "#112233",
      headerGradientColor: "#445566",
      footerBackgroundColor: "#778899",
      footerGradientColor: "#aabbcc",
      textFont: "freundlich" as const,
    };
    const markup = renderToStaticMarkup(
      createElement(DossierHeaderFooterChrome, {
        scope: "letter",
        template: "modern",
        colors: { primary: "#000000", accent: "#999999" },
        contact,
        options,
        footerLabel: "Beilagen:",
        footerDetails: ["Lebenslauf", "Zeugnis"],
      }),
    );

    expect(markup).toContain('data-dossier-header-text-layout="stacked"');
    expect(markup).toContain('data-dossier-footer-text-layout="inline"');
    expect(markup).toContain('data-dossier-chrome-font="freundlich"');
    expect(markup).toContain("linear-gradient(90deg, #112233, #445566)");
    expect(markup).toContain("linear-gradient(90deg, #778899, #aabbcc)");
    expect(markup).toContain("Lea Müller");
    expect(markup).toContain("Dorfstrasse 12");
    expect(markup).toContain(">Lebenslauf</div>");
    expect(markup).toContain("> · Zeugnis</div>");
  });
});

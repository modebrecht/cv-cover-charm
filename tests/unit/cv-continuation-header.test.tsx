import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DossierHeaderFooterChrome } from "../../src/components/dossier/DossierHeaderFooterChrome";
import { DEFAULT_DOSSIER_CHROME_OPTIONS } from "../../src/lib/dossier-chrome";

const contact = {
  name: "Lea Müller",
  address: "Bahnhofstrasse 42",
  place: "8000 Zürich",
  email: "lea@example.ch",
  phone: "+41 79 123 45 67",
};

const colors = {
  primary: "#173a5e",
  secondary: "#315d7d",
  accent: "#315d7d",
};

function markup(scope: "cv" | "letter", pageIndex = 1) {
  return renderToStaticMarkup(
    createElement(DossierHeaderFooterChrome, {
      scope,
      template: "klassisch",
      colors,
      contact,
      pageIndex,
      options: {
        ...DEFAULT_DOSSIER_CHROME_OPTIONS,
        headerMode: "compact",
        footerMode: "details",
      },
      footerLeft: contact.name,
      footerRight: `Seite ${pageIndex + 1}`,
    }),
  );
}

describe("CV continuation identity header", () => {
  test("continuation pages show core contact data instead of a page-number label", () => {
    const html = markup("cv", 1);

    expect(html).toContain("data-cv-continuation-header");
    expect(html).toContain("Lea Müller");
    expect(html).toContain("8000 Zürich");
    expect(html).toContain("lea@example.ch");
    expect(html).toContain("+41 79 123 45 67");
    expect(html).not.toContain("Seite 2");
  });

  test("the continuation treatment stays CV-only", () => {
    const html = markup("letter", 1);

    expect(html).not.toContain("data-cv-continuation-header");
    expect(html).toContain("Seite 2");
  });

  test("CV continuation contact respects the existing visibility switches", () => {
    const html = renderToStaticMarkup(
      createElement(DossierHeaderFooterChrome, {
        scope: "cv",
        template: "klassisch",
        colors,
        contact,
        pageIndex: 1,
        options: {
          ...DEFAULT_DOSSIER_CHROME_OPTIONS,
          headerMode: "compact",
          headerShowAddress: false,
          headerShowPhone: false,
          footerMode: "compact",
        },
      }),
    );

    expect(html).toContain("Lea Müller");
    expect(html).toContain("lea@example.ch");
    expect(html).not.toContain("8000 Zürich");
    expect(html).not.toContain("+41 79 123 45 67");
  });
});

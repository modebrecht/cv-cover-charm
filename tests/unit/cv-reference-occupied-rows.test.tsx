import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CvCanvas } from "../../src/components/cv/CvCanvasBase";
import { emptyCv, DEFAULT_CV_PLACEMENTS } from "../../src/components/cv/types";
import type { CvPresentation } from "../../src/components/cv/presentation";
import { DEFAULT_DOSSIER_CHROME_OPTIONS } from "../../src/lib/dossier-chrome";
import { DEFAULT_DOSSIER_PHOTO_STYLE } from "../../src/lib/dossier-photo";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { tableColumnWidths } from "../../src/lib/docx-next/layouts";
import { walkBlocks, type TableBlock } from "../../src/lib/docx-next/model";
import { sidebarFixture } from "../fixtures/docx-next/sidebar";

for (const side of ["left", "right"] as const) {
  for (const count of [1, 2, 3]) {
    test(`${side}: Web and native reference rows use occupied tracks for ${count} references`, async () => {
      const source = sidebarFixture(side);
      const first = source.cv.data.referenzen[0];
      source.cv.data.referenzen = Array.from({ length: count }, (_, index) => ({
        ...first,
        id: `occupied-${index}`,
        name: `Referenzperson ${index + 1}`,
        funktion: "Klassenlehrer, Schulhaus Zentrum",
      }));
      // Empty editor slots must not occupy columns or change pairing.
      source.cv.data.referenzen.splice(1, 0, {
        id: "empty-slot",
        name: "",
        funktion: "",
        kontakt: "",
      });
      source.cv.data.person.foto = "";
      source.settings.placements = { ...DEFAULT_CV_PLACEMENTS, referenzen: "main" };
      const before = structuredClone(source);
      const data = { ...structuredClone(emptyCv), ...source.cv.data };
      const presentation: CvPresentation = {
        layoutChoice: "modern",
        infoPosition: side === "left" ? "standard" : "mirrored",
        placements: { ...DEFAULT_CV_PLACEMENTS, referenzen: "main" },
        photoStyle: { ...DEFAULT_DOSSIER_PHOTO_STYLE },
        photoPlacement: { mode: "auto" },
        sectionGapMm: null,
        documentTitleMarginTopPx: 0,
        continuationTopMarginMm: null,
        pageMargins: null,
        bodyAlignment: "left",
      };
      const html = renderToStaticMarkup(
        createElement(CvCanvas, {
          data,
          design: { template: "modern", colors: {}, bgOpacity: 0.06, useElements: false },
          presentation,
          elements: [],
          chromeOptions: { ...DEFAULT_DOSSIER_CHROME_OPTIONS },
          chromeContact: { name: "Pruefperson", address: "", place: "", phone: "", email: "" },
          exportMode: true,
        }),
      );
      const styles: string[] = [];
      await new HTMLRewriter()
        .on("[data-cv-page] [data-cv-main] [data-cv-reference-grid]", {
          element(node) {
            styles.push(node.getAttribute("style")!);
          },
        })
        .transform(new Response(html))
        .text();
      const expected = Array.from({ length: Math.ceil(count / 2) }, (_, i) =>
        Math.min(2, count - 2 * i),
      );
      expect(styles.length).toBe(expected.length);
      expected.forEach((columns, i) =>
        expect(styles[i]).toContain(`grid-template-columns:repeat(${columns}, minmax(0, 1fr))`),
      );
      const model = buildDossierDocModel(source, { cvSidebarComposition: "shared-body-stories" });
      const rows = walkBlocks(model.cv.blocks).filter(
        (b): b is TableBlock =>
          b.kind === "table" && b.id.startsWith("cv.section.referenzen.pair:"),
      );
      expect(rows.length).toBe(expected.length);
      rows.forEach((row, i) => {
        expect(row.rows[0].cells.flat().length).toBe(expected[i]);
        expect(tableColumnWidths(row, 119)).toEqual(expected[i] === 1 ? [119] : [56.5, 6, 56.5]);
      });
      expect(source).toEqual(before);
    });
  }
}

test("references placed in the Sidebar remain stacked like the Web Sidebar", () => {
  const source = sidebarFixture("left");
  const first = source.cv.data.referenzen[0];
  source.cv.data.referenzen = [first, { ...first, id: "second-side" }];
  source.settings.placements = { ...DEFAULT_CV_PLACEMENTS, referenzen: "side" };
  const model = buildDossierDocModel(source, { cvSidebarComposition: "shared-body-stories" });
  expect(
    walkBlocks(model.cv.blocks).some(
      (b) => b.kind === "table" && b.id.startsWith("cv.section.referenzen.pair:"),
    ),
  ).toBe(false);
  expect(
    walkBlocks(model.cv.blocks).filter(
      (b) => b.kind === "entry" && b.id.startsWith("cv.entry.referenzen:"),
    ).length,
  ).toBe(2);
});

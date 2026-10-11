import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  cssZoomAsTransform,
  cssOpacityFilterValue,
  cssSharpInsetShadowGradient,
  cssGradientAbsoluteLengths,
  scopeDossierTemplateForHtml2Canvas,
} from "../../src/lib/html2canvas-export";

const dossierPdf = readFileSync("src/lib/dossier-pdf.ts", "utf8");
const cvRoute = readFileSync("src/routes/lebenslauf.tsx", "utf8");
const coverRoute = readFileSync("src/routes/titelblatt.tsx", "utf8");
const dossierCanvas = readFileSync("src/components/dossier/DossierPdfCanvas.tsx", "utf8");
const coverCanvas = readFileSync("src/components/cover/CoverCanvas.tsx", "utf8");
const cvCanvas = readFileSync("src/components/cv/CvCanvas.tsx", "utf8");
const html2canvasExport = readFileSync("src/lib/html2canvas-export.ts", "utf8");

describe("html2canvas CSS zoom normalization", () => {
  test("gradient physical lengths become CSS pixels while percentages, colours and URLs stay intact", () => {
    expect(
      cssGradientAbsoluteLengths("linear-gradient(90deg, rgb(1, 2, 3) 0 9mm, white 9mm 100%)"),
    ).toBe("linear-gradient(90deg, rgb(1, 2, 3) 0 34.015748px, white 34.015748px 100%)");
    expect(
      cssGradientAbsoluteLengths(
        'url("https://example.com/9mm-linear-gradient(2cm).png"), radial-gradient(circle 1in, black 12pt, white 100%)',
      ),
    ).toBe(
      'url("https://example.com/9mm-linear-gradient(2cm).png"), radial-gradient(circle 96px, black 16px, white 100%)',
    );
    expect(cssGradientAbsoluteLengths("none")).toBe("none");
  });
  test("sharp inset compatibility preserves the edge and leaves blurred/multiple shadows intact", () => {
    expect(cssSharpInsetShadowGradient("rgb(31, 41, 51) 0px -1.3px 0px 0px inset")).toBe(
      "linear-gradient(to top, rgb(31, 41, 51) 0px, rgb(31, 41, 51) 1.3px, transparent 1.3px, transparent 100%)",
    );
    expect(cssSharpInsetShadowGradient("rgba(0, 0, 0, 0.5) 0px 2px 0px 0px inset")).toContain(
      "to bottom",
    );
    for (const shadow of [
      "none",
      "rgb(0, 0, 0) 0px -1px 2px 0px inset",
      "rgb(0, 0, 0) 2px -1px 0px 0px inset",
      "rgb(0, 0, 0) 0px -1px 0px 0px",
      "rgb(0, 0, 0) 0px -1px 0px 0px inset, rgb(0, 0, 0) 0px 1px 0px 0px inset",
    ])
      expect(cssSharpInsetShadowGradient(shadow)).toBeNull();
  });
  test("opacity compatibility accepts CSS numbers and percentages without dropping other filters", () => {
    expect(cssOpacityFilterValue("opacity(0.9)")).toBe(0.9);
    expect(cssOpacityFilterValue("opacity(25%)")).toBe(0.25);
    expect(cssOpacityFilterValue("opacity(0)")).toBe(0);
    expect(cssOpacityFilterValue("opacity(120%)")).toBe(1);
    for (const filter of [
      "none",
      "blur(2px)",
      "opacity(0.5) blur(2px)",
      "opacity(-1)",
      "opacity(NaN)",
    ])
      expect(cssOpacityFilterValue(filter)).toBeNull();
  });
  test("CV capture keeps deliberately wrong clone html identity untouched", () => {
    const dataset = { dossierTemplate: "brief" };
    const root = {
      closest: (selector: string) =>
        selector === '[data-dossier-document="cv"]'
          ? {}
          : { dataset: { dossierTemplate: "studio3" } },
      ownerDocument: { documentElement: { dataset } },
    } as unknown as HTMLElement;
    scopeDossierTemplateForHtml2Canvas(root);
    expect(dataset.dossierTemplate).toBe("brief");
  });

  test("Cover/Letter keep their legacy clone-only template scope", () => {
    const dataset = { dossierTemplate: "brief" };
    const root = {
      closest: (selector: string) =>
        selector === '[data-dossier-document="cv"]'
          ? null
          : { dataset: { dossierTemplate: "ledger" } },
      ownerDocument: { documentElement: { dataset } },
    } as unknown as HTMLElement;
    scopeDossierTemplateForHtml2Canvas(root);
    expect(dataset.dossierTemplate).toBe("ledger");
  });
  test("preserves compact CV zoom as an equivalent transform", () => {
    expect(cssZoomAsTransform(0.895, "none")).toBe("scale(0.895)");
    expect(cssZoomAsTransform(0.9, "matrix(1, 0, 0, 1, 4, 2)")).toBe(
      "scale(0.9) matrix(1, 0, 0, 1, 4, 2)",
    );
  });

  test("normalizes capture clones in combined and standalone PDFs", () => {
    expect(dossierPdf).toContain("normalizeCssZoomForHtml2Canvas(clonedPage");
    expect(cvRoute).toContain("normalizeCssZoomForHtml2Canvas(clonedPage");
    expect(coverRoute).toContain("normalizeCssZoomForHtml2Canvas(clonedPage");
  });

  test("isolates mixed-template dossier captures from the live html template scope", () => {
    expect(dossierCanvas.match(/manageGlobalTemplateScope=\{false\}/g)?.length).toBe(2);
    expect(coverCanvas).toContain("if (!manageGlobalTemplateScope) return;");
    expect(cvCanvas).toContain("if (!manageGlobalTemplateScope) return;");
    expect(coverCanvas).toContain("data-dossier-template={template}");
    expect(cvCanvas).toContain("data-dossier-template={design.template}");
    expect(dossierCanvas).toContain("data-dossier-template={storedLetter.design.template}");
    expect(html2canvasExport).toContain('root.closest<HTMLElement>("[data-dossier-template]")');
    expect(html2canvasExport).toContain(
      "root.ownerDocument.documentElement.dataset.dossierTemplate = template",
    );
  });
});

import {
  briefFixture,
  briefVariantFixture,
  briefChromeFixture,
  briefElementsFixture,
} from "./brief";
import { coverPdfDocumentFromSaved } from "../../../src/lib/dossier-pdf-document";
import { DEFAULT_DOSSIER_CHROME_STATE } from "../../../src/lib/dossier-chrome";
import { FRESH_TEMPLATE_REGISTRY } from "../../../src/components/cover/fresh-template-registry";

export const PRISM_FIXTURES = [
  "normal",
  "long-letter",
  "long-cv",
  "compact",
  "none",
  "timeline",
  "magazin",
  "images",
  "custom",
  "continuation",
  "custom-colors",
  "custom-surface",
  "long-values",
  "columns",
] as const;
export type PrismFixture = (typeof PRISM_FIXTURES)[number];
export function prismFixture(kind: PrismFixture = "normal", photo?: string) {
  const input =
    kind === "timeline" || kind === "magazin"
      ? briefVariantFixture(kind === "timeline" ? "timeline-long" : "editorial-short")
      : kind === "custom"
        ? briefElementsFixture()
        : kind === "continuation"
          ? briefChromeFixture(true)
          : briefFixture(
              kind === "long-letter" || kind === "long-cv" || kind === "long-values"
                ? kind
                : "normal",
            );
  const colors = Object.fromEntries(
    FRESH_TEMPLATE_REGISTRY.find((t) => t.id === "prism")!.slots.map((s) => [s.key, s.default]),
  );
  const customCover = input.cover.blocks.filter((b) => input.cover.customFieldIds?.includes(b.id));
  const customIds = input.cover.customFieldIds;
  input.cover = coverPdfDocumentFromSaved({
    template: "prism",
    data: input.cover.data,
    colors,
    fontScale: 1,
  })!;
  if (kind === "custom") {
    input.cover.blocks.push(...customCover);
    input.cover.customFieldIds = customIds;
    input.letter.data.richTextHtml =
      '<div><strong>Editierbarer Prism-Inhalt</strong> mit <u>Formatierung</u></div><div data-list="bullet">Native Liste</div><table><tbody><tr><td>Linke Zelle</td><td>Rechte Zelle</td></tr></tbody></table>';
  }
  input.letter.design.template = "prism" as typeof input.letter.design.template;
  input.letter.design.fontOverride = undefined;
  input.letter.design.colors = { ...colors };
  input.cv.design.template = "prism" as typeof input.cv.design.template;
  input.cv.design.colors = { ...colors };
  input.cv.design.font = undefined;
  if (["compact", "none", "continuation", "custom-colors", "custom-surface"].includes(kind)) {
    input.settings.chrome ??= structuredClone(DEFAULT_DOSSIER_CHROME_STATE);
    Object.assign(input.settings.chrome.shared, {
      headerHeightMm: null,
      headerGapMm: 4,
      headerMode: kind === "none" ? "none" : kind === "compact" ? "compact" : "contact",
    });
  }
  if (kind === "custom-colors") {
    for (const palette of [
      input.cover.colors,
      input.letter.design.colors,
      input.cv.design.colors,
    ]) {
      palette.primary = "#ffe9b5";
      palette.secondary = "#80a7c0";
    }
    // Authored foreground is deliberately changed together with the light masthead.
    for (const block of input.cover.blocks) {
      if (["eyebrow", "ortDatum"].includes(block.id) || block.style.color === "primary")
        block.style.color = "ink";
      block.lines = block.lines.map((line) =>
        typeof line === "string"
          ? line
          : line.map((segment) =>
              segment.color === "primary" ? { ...segment, color: "ink" } : segment,
            ),
      );
    }
  }
  if (kind === "custom-surface")
    Object.assign(input.settings.chrome!.shared, {
      headerBackgroundColor: "#EFE6DC",
      headerGradientColor: "#DED3C4",
      headerTextColor: "#18223A",
      headerDifferentFirstPage: true,
      headerContinuationMode: "compact",
    });
  if (kind === "images" && photo) {
    input.cover.data.foto = photo;
    input.cv.data.person.foto = photo;
    input.settings.cvPhotoStyle = { shape: "circle", zoom: 1.5, x: 25, y: 70, borderWidth: 0 };
    input.letter.data.images = [
      { id: "prism-inline", src: photo, side: "left", topMm: 0, widthMm: 18, gapMm: 3 },
    ];
  }
  if (kind === "continuation") {
    Object.assign(input.settings.chrome!.shared, {
      headerDifferentFirstPage: true,
      headerContinuationMode: "contact",
      headerContentOffsetYMm: -4,
      footerContentOffsetYMm: 4,
    });
    input.letter.data.text += "\n\n" + "Fortgesetzter editierbarer Briefinhalt. ".repeat(500);
    input.settings.margins = { cv: { top: 20, left: 20, right: 20, bottom: 18 } };
    input.settings.cvContinuationTopMarginMm = 10;
  }
  if (kind === "columns")
    input.letter.data.richTextHtml =
      '<div>Volle Breite vor den Spalten.</div><div data-columns="2">' +
      "Native Spalten bleiben editierbar. Ä ö ü é è à. ".repeat(120) +
      "</div><div>Volle Breite nach den Spalten.</div>";
  return input;
}

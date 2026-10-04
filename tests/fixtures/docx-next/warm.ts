import {
  briefFixture,
  briefVariantFixture,
  briefChromeFixture,
  briefElementsFixture,
} from "./brief";
import { coverPdfDocumentFromSaved } from "../../../src/lib/dossier-pdf-document";
import { DEFAULT_DOSSIER_CHROME_STATE } from "../../../src/lib/dossier-chrome";
import { TEMPLATES } from "../../../src/components/cover/types";
export const WARM_FIXTURES = [
  "normal",
  "long-letter",
  "long-cv",
  "compact",
  "compact-long",
  "none",
  "timeline",
  "magazin",
  "images",
  "custom",
  "continuation",
  "custom-colors",
  "long-sender",
] as const;
export type WarmFixture = (typeof WARM_FIXTURES)[number];
export function warmFixture(kind: WarmFixture = "normal", photo?: string) {
  const input =
    kind === "timeline" || kind === "magazin"
      ? briefVariantFixture(kind === "timeline" ? "timeline-long" : "editorial-short")
      : kind === "custom"
        ? briefElementsFixture()
        : kind === "continuation"
          ? briefChromeFixture(true)
          : briefFixture(
              kind === "compact-long"
                ? "long-letter"
                : kind === "long-letter" || kind === "long-cv"
                  ? kind
                  : "normal",
            );
  const colors = Object.fromEntries(
    TEMPLATES.find((template) => template.id === "freundlich")!.slots.map((slot) => [
      slot.key,
      slot.default,
    ]),
  );
  const customCover = input.cover.blocks.filter((block) =>
      input.cover.customFieldIds?.includes(block.id),
    ),
    customIds = input.cover.customFieldIds;
  input.cover = coverPdfDocumentFromSaved({
    template: "freundlich",
    data: input.cover.data,
    colors,
    fontScale: 1,
  })!;
  if (kind === "custom") {
    input.cover.blocks.push(...customCover);
    input.cover.customFieldIds = customIds;
  }
  input.letter.design.template = "freundlich";
  input.letter.design.fontOverride = undefined;
  input.letter.design.colors = { ...colors };
  input.cv.design.template = "freundlich";
  input.cv.design.colors = { ...colors };
  input.cv.design.font = undefined;
  if (!["normal", "long-letter", "long-cv", "timeline", "magazin", "custom"].includes(kind)) {
    input.settings.chrome ??= structuredClone(DEFAULT_DOSSIER_CHROME_STATE);
    Object.assign(input.settings.chrome.shared, {
      headerHeightMm: null,
      headerGapMm: 4,
      headerMode:
        kind === "none"
          ? "none"
          : kind === "images" || kind === "custom-colors"
            ? "contact"
            : "compact",
    });
  }
  if (kind === "long-sender")
    input.letter.data.absenderAdresse =
      "Lange Absenderadresse mit Gebäudebezeichnung und editierbaren Details. ".repeat(15);
  if (kind === "custom-colors") {
    input.cover.colors.primary =
      input.letter.design.colors.primary =
      input.cv.design.colors.primary =
        "#ffe9b5";
    input.cover.colors.secondary =
      input.letter.design.colors.secondary =
      input.cv.design.colors.secondary =
        "#80a7c0";
  }
  if (kind === "images" && photo) {
    input.cover.data.foto = photo;
    input.cv.data.person.foto = photo;
    input.settings.cvPhotoStyle = { shape: "circle", zoom: 1.5, x: 25, y: 70, borderWidth: 0 };
    input.letter.data.images = [
      { id: "warm-inline", src: photo, side: "left", topMm: 0, widthMm: 18, gapMm: 3 },
    ];
  }
  if (kind === "custom")
    input.letter.data.richTextHtml =
      '<div><strong>Editierbarer Warm-Inhalt</strong> mit <u>Formatierung</u></div><div data-list="bullet">Native Liste</div><table><tbody><tr><td>Linke Zelle</td><td>Rechte Zelle</td></tr></tbody></table>';
  if (kind === "continuation") {
    Object.assign(input.settings.chrome!.shared, {
      headerDifferentFirstPage: true,
      headerContinuationMode: "contact",
      headerContentOffsetYMm: -4,
      footerContentOffsetYMm: 4,
    });
    input.letter.data.text += "\n\n" + "Fortgesetzter editierbarer Briefinhalt. ".repeat(500);
    input.settings.margins = { cv: { top: 20, left: 24, right: 22, bottom: 22 } };
    input.settings.cvContinuationTopMarginMm = 10;
  }
  return input;
}

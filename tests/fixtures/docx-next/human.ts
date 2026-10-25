import { briefFixture, briefVariantFixture, briefElementsFixture } from "./brief";
import { TEMPLATES } from "../../../src/components/cover/types";
import { coverPdfDocumentFromSaved } from "../../../src/lib/dossier-pdf-document";
import { DEFAULT_DOSSIER_CHROME_STATE } from "../../../src/lib/dossier-chrome";

export const HUMAN_FIXTURES = [
  "normal",
  "long-letter",
  "long-cv",
  "long-values",
  "images",
  "custom",
  "compact",
  "none",
  "continuation",
  "timeline",
  "magazin",
  "no-motifs",
] as const;
export type HumanFixture = (typeof HUMAN_FIXTURES)[number];
export function humanFixture(kind: HumanFixture = "normal", photo?: string) {
  const input =
    kind === "timeline" || kind === "magazin"
      ? briefVariantFixture(kind === "timeline" ? "timeline-long" : "editorial-short")
      : kind === "custom"
        ? briefElementsFixture()
        : briefFixture(
            kind === "long-letter" || kind === "long-cv" || kind === "long-values"
              ? kind
              : "normal",
          );
  const colors = Object.fromEntries(
    TEMPLATES.find((t) => t.id === "human")!.slots.map((s) => [s.key, s.default]),
  );
  const customCover = input.cover.blocks.filter((b) => input.cover.customFieldIds?.includes(b.id));
  const customIds = input.cover.customFieldIds;
  if (kind === "images" && photo) input.cover.data.foto = photo;
  input.cover = coverPdfDocumentFromSaved({
    template: "human",
    data: input.cover.data,
    colors,
    fontScale: 1,
  })!;
  for (const design of [input.letter.design, input.cv.design]) {
    design.template = "human";
    design.colors = { ...colors };
  }
  input.letter.design.fontOverride = undefined;
  input.cv.design.font = undefined;
  input.cv.design.bgOpacity = kind === "no-motifs" ? 0 : 1;
  if (kind === "custom") {
    input.cover.blocks.push(...customCover);
    input.cover.customFieldIds = customIds;
    input.letter.data.richTextHtml =
      '<div><strong>Editierbarer Human-Inhalt</strong></div><div data-list="bullet">Native Liste</div><table><tbody><tr><td>Linke Zelle</td><td>Rechte Zelle</td></tr></tbody></table>';
  }
  if (["compact", "none", "continuation"].includes(kind)) {
    input.settings.chrome = structuredClone(DEFAULT_DOSSIER_CHROME_STATE);
    Object.assign(input.settings.chrome.shared, {
      headerMode: kind === "none" ? "none" : kind === "compact" ? "compact" : "contact",
      headerHeightMm: null,
      headerGapMm: 4,
    });
  }
  if (kind === "continuation") {
    Object.assign(input.settings.chrome!.shared, {
      headerDifferentFirstPage: true,
      headerContinuationMode: "compact",
      headerContentOffsetYMm: -4,
      footerContentOffsetYMm: 4,
    });
    input.letter.data.text += "\n\n" + "Fortgesetzter editierbarer Human-Briefinhalt. ".repeat(500);
    input.settings.cvContinuationTopMarginMm = 10;
  }
  if (kind === "images" && photo) {
    input.cv.data.person.foto = photo;
    input.settings.cvPhotoStyle = { shape: "circle", zoom: 1.5, x: 25, y: 70, borderWidth: 0 };
    input.letter.data.images = [
      { id: "human-inline", src: photo, side: "left", topMm: 0, widthMm: 18, gapMm: 3 },
    ];
  }
  return input;
}

import { briefFixture, briefVariantFixture, briefElementsFixture } from "./brief";
import { TEMPLATES } from "../../../src/components/cover/types";
import { coverPdfDocumentFromSaved } from "../../../src/lib/dossier-pdf-document";
import { DEFAULT_DOSSIER_CHROME_STATE } from "../../../src/lib/dossier-chrome";

export const ORBIT_FIXTURES = [
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
  "custom-colors",
] as const;
export type OrbitFixture = (typeof ORBIT_FIXTURES)[number] | "sidebar";
export function orbitFixture(kind: OrbitFixture = "normal", photo?: string) {
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
    TEMPLATES.find((t) => t.id === "orbit")!.slots.map((s) => [s.key, s.default]),
  );
  const customCover = input.cover.blocks.filter((b) => input.cover.customFieldIds?.includes(b.id));
  const customIds = input.cover.customFieldIds;
  if (kind === "images" && photo) input.cover.data.foto = photo;
  input.cover = coverPdfDocumentFromSaved({
    template: "orbit",
    data: input.cover.data,
    colors,
    fontScale: 1,
  })!;
  for (const design of [input.letter.design, input.cv.design]) {
    design.template = "orbit";
    design.colors = { ...colors };
  }
  input.letter.design.fontOverride = undefined;
  input.cv.design.font = undefined;
  input.cv.design.bgOpacity = kind === "no-motifs" ? 0 : 1;
  if (kind === "custom") {
    input.cover.blocks.push(...customCover);
    input.cover.customFieldIds = customIds;
    input.letter.data.richTextHtml =
      '<div><strong>Editierbarer Orbit-Inhalt</strong></div><div data-list="bullet">Native Liste</div><table><tbody><tr><td>Linke Zelle</td><td>Rechte Zelle</td></tr></tbody></table>';
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
    input.letter.data.text += "\n\n" + "Fortgesetzter editierbarer Orbit-Briefinhalt. ".repeat(500);
    input.settings.cvContinuationTopMarginMm = 10;
  }
  if (kind === "images" && photo) {
    input.cv.data.person.foto = photo;
    input.settings.cvPhotoStyle = { shape: "circle", zoom: 1.5, x: 25, y: 70, borderWidth: 0 };
    input.letter.data.images = [
      { id: "orbit-inline", src: photo, side: "left", topMm: 0, widthMm: 18, gapMm: 3 },
    ];
  }
  if (kind === "custom-colors") {
    for (const palette of [
      input.cover.colors,
      input.letter.design.colors,
      input.cv.design.colors,
    ]) {
      palette.primary = "#385D58";
      palette.secondary = "#D48B35";
      palette.accent = "#6B948C";
    }
  }
  if (kind === "sidebar") input.settings.cvLayout = "sidebar";
  return input;
}

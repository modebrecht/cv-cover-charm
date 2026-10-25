import {
  GRAPHIC_FIXTURES,
  graphicCandidateFixture,
  type GraphicFixture,
} from "./graphic-candidate";
export const CITRUS_FIXTURES = [
  ...GRAPHIC_FIXTURES,
  "contact-long",
  "cover-long",
  "badges-off",
  "legacy-badges-off",
] as const;
export function citrusFixture(kind: (typeof CITRUS_FIXTURES)[number] = "normal", photo?: string) {
  const input = graphicCandidateFixture(
    "citrus",
    kind.endsWith("badges-off") ? "normal" : (kind as GraphicFixture),
    photo,
  );
  if (kind.endsWith("badges-off")) {
    delete input.cv.design.sectionTitlePill;
    delete input.cv.design.citrusRubricPill;
    input.cv.design[kind === "legacy-badges-off" ? "citrusRubricPill" : "sectionTitlePill"] = false;
  }
  return input;
}

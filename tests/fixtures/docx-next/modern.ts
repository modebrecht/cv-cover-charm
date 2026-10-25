import {
  GRAPHIC_FIXTURES,
  graphicCandidateFixture,
  type GraphicFixture,
} from "./graphic-candidate";
export const MODERN_FIXTURES = GRAPHIC_FIXTURES;
export const modernFixture = (kind: GraphicFixture = "normal", photo?: string) =>
  graphicCandidateFixture("modern", kind, photo);

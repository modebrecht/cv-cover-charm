import {
  GRAPHIC_FIXTURES,
  graphicCandidateFixture,
  type GraphicFixture,
} from "./graphic-candidate";
export const COLORFUL_FIXTURES = GRAPHIC_FIXTURES;
export const colorfulFixture = (kind: GraphicFixture = "normal", photo?: string) =>
  graphicCandidateFixture("colorful", kind, photo);

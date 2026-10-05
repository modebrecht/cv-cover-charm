import {
  GRAPHIC_FIXTURES,
  graphicCandidateFixture,
  type GraphicFixture,
} from "./graphic-candidate";
export const VERLAUF_2_FIXTURES = GRAPHIC_FIXTURES;
export const verlauf2Fixture = (kind: GraphicFixture = "normal", photo?: string) =>
  graphicCandidateFixture("verlauf2", kind, photo);

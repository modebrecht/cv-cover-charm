import {
  GRAPHIC_FIXTURES,
  graphicCandidateFixture,
  type GraphicFixture,
} from "./graphic-candidate";
export const STUDIO_2_FIXTURES = GRAPHIC_FIXTURES;
export const studio2Fixture = (kind: GraphicFixture = "normal", photo?: string) =>
  graphicCandidateFixture("studio2", kind, photo);

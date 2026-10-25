import {
  GRAPHIC_FIXTURES,
  graphicCandidateFixture,
  type GraphicFixture,
} from "./graphic-candidate";
export const STUDIO_3_FIXTURES = GRAPHIC_FIXTURES;
export const studio3Fixture = (kind: GraphicFixture = "normal", photo?: string) =>
  graphicCandidateFixture("studio3", kind, photo);

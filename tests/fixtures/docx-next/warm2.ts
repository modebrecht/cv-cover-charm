import {
  GRAPHIC_FIXTURES,
  graphicCandidateFixture,
  type GraphicFixture,
} from "./graphic-candidate";
export const WARM_2_FIXTURES = GRAPHIC_FIXTURES;
export const warm2Fixture = (kind: GraphicFixture = "normal", photo?: string) =>
  graphicCandidateFixture("warm2", kind, photo);

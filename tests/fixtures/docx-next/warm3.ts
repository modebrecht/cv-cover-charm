import {
  GRAPHIC_FIXTURES,
  graphicCandidateFixture,
  type GraphicFixture,
} from "./graphic-candidate";
export const WARM_3_FIXTURES = GRAPHIC_FIXTURES;
export const warm3Fixture = (kind: GraphicFixture = "normal", photo?: string) =>
  graphicCandidateFixture("warm3", kind, photo);

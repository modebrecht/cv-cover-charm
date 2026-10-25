import {
  GRAPHIC_FIXTURES,
  graphicCandidateFixture,
  type GraphicFixture,
} from "./graphic-candidate";
export const HORIZON_FIXTURES = GRAPHIC_FIXTURES;
export type HorizonFixture = GraphicFixture;
export const horizonFixture = (kind: HorizonFixture = "normal", photo?: string) =>
  graphicCandidateFixture("horizon", kind, photo);

import {
  GRAPHIC_FIXTURES,
  graphicCandidateFixture,
  type GraphicFixture,
} from "./graphic-candidate";
export const EDGE_FIXTURES = GRAPHIC_FIXTURES;
export const edgeFixture = (kind: GraphicFixture = "normal", photo?: string) =>
  graphicCandidateFixture("edge", kind, photo);

import {
  GRAPHIC_FIXTURES,
  graphicCandidateFixture,
  type GraphicFixture,
} from "./graphic-candidate";
export const RIBBON_FIXTURES = GRAPHIC_FIXTURES;
export const ribbonFixture = (kind: GraphicFixture = "normal", photo?: string) =>
  graphicCandidateFixture("ribbon", kind, photo);

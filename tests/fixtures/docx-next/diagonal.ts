import {
  GRAPHIC_FIXTURES,
  graphicCandidateFixture,
  type GraphicFixture,
} from "./graphic-candidate";
export const DIAGONAL_FIXTURES = GRAPHIC_FIXTURES;
export const diagonalFixture = (kind: GraphicFixture = "normal", photo?: string) =>
  graphicCandidateFixture("diagonal", kind, photo);

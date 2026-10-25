import {
  GRAPHIC_FIXTURES,
  graphicCandidateFixture,
  type GraphicFixture,
} from "./graphic-candidate";
export const COVE_FIXTURES = GRAPHIC_FIXTURES;
export type CoveFixture = GraphicFixture;
export const coveFixture = (kind: CoveFixture = "normal", photo?: string) =>
  graphicCandidateFixture("cove", kind, photo);

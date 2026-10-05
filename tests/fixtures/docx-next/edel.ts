import {
  GRAPHIC_FIXTURES,
  graphicCandidateFixture,
  type GraphicFixture,
} from "./graphic-candidate";
export const EDEL_FIXTURES = [...GRAPHIC_FIXTURES, "cover-long"] as const;
export const edelFixture = (kind: GraphicFixture = "normal", photo?: string) =>
  graphicCandidateFixture("edel", kind, photo);

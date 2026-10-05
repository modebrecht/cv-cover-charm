import {
  GRAPHIC_FIXTURES,
  graphicCandidateFixture,
  type GraphicFixture,
} from "./graphic-candidate";
export const PASTELL_FIXTURES = [...GRAPHIC_FIXTURES, "cover-long"] as const;
export const pastellFixture = (kind: GraphicFixture = "normal", photo?: string) =>
  graphicCandidateFixture("pastell", kind, photo);

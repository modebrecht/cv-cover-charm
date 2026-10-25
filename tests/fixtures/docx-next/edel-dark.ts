import {
  GRAPHIC_FIXTURES,
  graphicCandidateFixture,
  type GraphicFixture,
} from "./graphic-candidate";

export const EDEL_DARK_FIXTURES = [...GRAPHIC_FIXTURES, "cover-long"] as const;
export const edelDarkFixture = (kind: GraphicFixture = "normal", photo?: string) =>
  graphicCandidateFixture("edelDark", kind, photo);

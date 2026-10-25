import {
  GRAPHIC_FIXTURES,
  graphicCandidateFixture,
  type GraphicFixture,
} from "./graphic-candidate";
export const KLASSISCH_FIXTURES = [...GRAPHIC_FIXTURES, "cover-long"] as const;
export const klassischFixture = (kind: GraphicFixture = "normal", photo?: string) =>
  graphicCandidateFixture("klassisch", kind, photo);

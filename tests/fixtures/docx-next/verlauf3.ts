import {
  GRAPHIC_FIXTURES,
  graphicCandidateFixture,
  type GraphicFixture,
} from "./graphic-candidate";
export const VERLAUF_3_FIXTURES = [...GRAPHIC_FIXTURES, "cover-long"] as const;
export const verlauf3Fixture = (kind: GraphicFixture = "normal", photo?: string) =>
  graphicCandidateFixture("verlauf3", kind, photo);

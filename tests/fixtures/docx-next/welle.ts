import {
  GRAPHIC_FIXTURES,
  graphicCandidateFixture,
  type GraphicFixture,
} from "./graphic-candidate";
export const WELLE_FIXTURES = [...GRAPHIC_FIXTURES, "contact-long"] as const;
export const welleFixture = (kind: GraphicFixture = "normal", photo?: string) =>
  graphicCandidateFixture("welle", kind, photo);

import {
  GRAPHIC_FIXTURES,
  graphicCandidateFixture,
  type GraphicFixture,
} from "./graphic-candidate";
export const SONNE_FIXTURES = [...GRAPHIC_FIXTURES, "contact-long", "hero-long"] as const;
export const sonneFixture = (kind: GraphicFixture = "normal", photo?: string) =>
  graphicCandidateFixture("sonne", kind, photo);

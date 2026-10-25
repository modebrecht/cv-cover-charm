import {
  GRAPHIC_FIXTURES,
  graphicCandidateFixture,
  type GraphicFixture,
} from "./graphic-candidate";
export const BLOCKIG_FIXTURES = [...GRAPHIC_FIXTURES, "contact-long"] as const;
export const blockigFixture = (kind: GraphicFixture = "normal", photo?: string) =>
  graphicCandidateFixture("blockig", kind, photo);

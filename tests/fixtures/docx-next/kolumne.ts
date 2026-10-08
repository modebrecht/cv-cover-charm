import {
  GRAPHIC_FIXTURES,
  graphicCandidateFixture,
  type GraphicFixture,
} from "./graphic-candidate";
export const KOLUMNE_FIXTURES = [...GRAPHIC_FIXTURES, "contact-long", "cover-long"] as const;
export const kolumneFixture = (kind: GraphicFixture = "normal", photo?: string) =>
  graphicCandidateFixture("terracotta", kind, photo);

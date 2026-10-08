import {
  GRAPHIC_FIXTURES,
  graphicCandidateFixture,
  type GraphicFixture,
} from "./graphic-candidate";
export const STUDIO_FIXTURES = [...GRAPHIC_FIXTURES, "cover-long", "contact-long"] as const;
export const studioFixture = (kind: GraphicFixture = "normal", photo?: string) =>
  graphicCandidateFixture("studio", kind, photo);

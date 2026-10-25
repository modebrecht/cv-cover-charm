import {
  GRAPHIC_FIXTURES,
  graphicCandidateFixture,
  type GraphicFixture,
} from "./graphic-candidate";
export const SUNRISE_FIXTURES = GRAPHIC_FIXTURES;
export const sunriseFixture = (kind: GraphicFixture = "normal", photo?: string) =>
  graphicCandidateFixture("sunrise", kind, photo);

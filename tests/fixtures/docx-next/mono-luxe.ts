import {
  GRAPHIC_FIXTURES,
  graphicCandidateFixture,
  type GraphicFixture,
} from "./graphic-candidate";
export const MONO_LUXE_FIXTURES = GRAPHIC_FIXTURES;
export const monoLuxeFixture = (kind: GraphicFixture = "normal", photo?: string) =>
  graphicCandidateFixture("monoLuxe", kind, photo);

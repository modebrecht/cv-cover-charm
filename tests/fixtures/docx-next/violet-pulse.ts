import {
  GRAPHIC_FIXTURES,
  graphicCandidateFixture,
  type GraphicFixture,
} from "./graphic-candidate";
export const VIOLET_PULSE_FIXTURES = GRAPHIC_FIXTURES;
export const violetPulseFixture = (kind: GraphicFixture = "normal", photo?: string) =>
  graphicCandidateFixture("violetPulse", kind, photo);

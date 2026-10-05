import {
  GRAPHIC_FIXTURES,
  graphicCandidateFixture,
  type GraphicFixture,
} from "./graphic-candidate";
export const GLOW_FIXTURES = GRAPHIC_FIXTURES;
export type GlowFixture = GraphicFixture;
export const glowFixture = (kind: GlowFixture = "normal", photo?: string) =>
  graphicCandidateFixture("glow", kind, photo);

import {
  GRAPHIC_FIXTURES,
  graphicCandidateFixture,
  type GraphicFixture,
} from "./graphic-candidate";
export const SERIOES_FIXTURES = GRAPHIC_FIXTURES;
export const serioesFixture = (kind: GraphicFixture = "normal", photo?: string) =>
  graphicCandidateFixture("serioes", kind, photo);

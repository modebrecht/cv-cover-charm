import {
  GRAPHIC_FIXTURES,
  graphicCandidateFixture,
  type GraphicFixture,
} from "./graphic-candidate";
export const LEDGER_FIXTURES = GRAPHIC_FIXTURES;
export const ledgerFixture = (kind: GraphicFixture = "normal", photo?: string) =>
  graphicCandidateFixture("ledger", kind, photo);

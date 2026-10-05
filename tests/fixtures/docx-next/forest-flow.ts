import {
  GRAPHIC_FIXTURES,
  graphicCandidateFixture,
  type GraphicFixture,
} from "./graphic-candidate";
export const FOREST_FLOW_FIXTURES = GRAPHIC_FIXTURES;
export const forestFlowFixture = (kind: GraphicFixture = "normal", photo?: string) =>
  graphicCandidateFixture("forestFlow", kind, photo);

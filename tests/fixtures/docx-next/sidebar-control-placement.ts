/** Move only the first complete semantic control inside its existing paragraph. */
import assert from "node:assert/strict";
import { walkBlocks } from "../../../src/lib/docx-next/model";
import {
  SIDEBAR_CARRIER_STORY_CASES,
  sidebarCarrierStoryFixture,
  type CarrierStoryCase,
} from "./sidebar-carrier-story";

export const SIDEBAR_CONTROL_PLACEMENT_CASES = SIDEBAR_CARRIER_STORY_CASES.map((value) => ({
  ...value,
  name: value.name.replace("carrier-story", "control-placement"),
}));

export function sidebarControlPlacementFixture(value: CarrierStoryCase) {
  const original = sidebarCarrierStoryFixture({
    ...value,
    name: value.name.replace("control-placement", "carrier-story"),
  });
  const model = structuredClone(original.model);
  const canonical = original.fixture.nativeParagraphs[0].fieldId;
  const first = walkBlocks(model.cv.blocks).filter((block) => block.id === canonical);
  assert(first.length === 1 && first[0].kind === "paragraph");
  first[0].controlPlacement = "inline";
  return {
    model,
    control: original.model,
    fixture: { ...original.fixture, fixture: value.name, changedControlId: canonical },
  };
}

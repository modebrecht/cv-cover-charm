/** Targeted owner-lifetime candidate; historical carrier geometry matrix stays stopped. */
import assert from "node:assert/strict";
import {
  SIDEBAR_CARRIER_STORY_CASES,
  sidebarCarrierStoryFixture,
  type CarrierStoryCase,
} from "./sidebar-carrier-story";

export const SIDEBAR_OWNER_BOUNDARY_CASES = SIDEBAR_CARRIER_STORY_CASES.map((value) => ({
  ...value,
  name: value.name.replace("carrier-story", "owner-boundary"),
}));
export function sidebarOwnerBoundaryFixture(value: CarrierStoryCase) {
  const original = sidebarCarrierStoryFixture({
    ...value,
    name: value.name.replace("owner-boundary", "carrier-story"),
  });
  const model = structuredClone(original.model);
  const carrier = model.cv.blocks[0];
  assert(carrier.kind === "table" && carrier.position);
  carrier.position.leadingBoundary = "paragraph";
  return { model, control: original.model, fixture: { ...original.fixture, fixture: value.name } };
}

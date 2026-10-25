/** Whole independent cell stories in one naturally splitting body table. */
import assert from "node:assert/strict";
import { sidebarCarrierStoryFixture, type CarrierStoryCase } from "./sidebar-carrier-story";

export function sidebarBodyCarrierFixture(value: CarrierStoryCase) {
  const original = sidebarCarrierStoryFixture(value);
  const model = structuredClone(original.model);
  const table = model.cv.blocks[0];
  assert(table.kind === "table" && table.position);
  const oldPosition = table.position;
  assert(oldPosition.yMm === model.cv.page.margins.top);
  // Convert physical x to the existing exact body-relative indentation, without width tuning.
  table.indentMm = oldPosition.xMm - model.cv.page.margins.left;
  delete table.position;
  table.bodyBoundary = "paragraph";
  delete model.floatingTableTextFlow;
  return {
    model,
    control: original.model,
    fixture: {
      ...original.fixture,
      fixture: value.name.replace("carrier-story", "body-carrier"),
      bodyBoundaryTwips: 20,
      originalPosition: oldPosition,
      bodyIndentMm: table.indentMm,
    },
  };
}

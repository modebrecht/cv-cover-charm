/** Diagnostic body carrier with semantic entries rendered as native paragraphs. */
import assert from "node:assert/strict";
import { walkBlocks } from "../../../src/lib/docx-next/model";
import { paragraphSignature } from "./sidebar-floating";
import { sidebarBodyCarrierFixture } from "./sidebar-body-carrier";
import type { CarrierStoryCase } from "./sidebar-carrier-story";

export function sidebarEntryFlowFixture(value: CarrierStoryCase) {
  const original = sidebarBodyCarrierFixture(value);
  const model = structuredClone(original.model);
  const before = paragraphSignature(model.cv.blocks);
  const table = model.cv.blocks[0];
  assert(table.kind === "table");
  // The body owns both tracks, so its horizontal extent must include both.
  // The floating predecessor reserved body margins for the main track only.
  const left = Math.min(original.fixture.mainLane.leftMm, original.fixture.sideLane.leftMm);
  const right = Math.max(original.fixture.mainLane.rightMm, original.fixture.sideLane.rightMm);
  model.cv.page.margins.left = left;
  model.cv.page.margins.right = model.cv.page.widthMm - right;
  table.indentMm = 0;
  const entries = walkBlocks(model.cv.blocks).filter(
    (block) => block.kind === "entry" && block.keepTogether,
  );
  for (const entry of entries) {
    assert(entry.kind === "entry");
    // Preserve each field, its native paragraph, styles and existing keepNext chain.
    // Only the redundant one-cell table used for entry grouping is removed.
    entry.keepTogether = false;
  }
  assert.deepEqual(paragraphSignature(model.cv.blocks), before);
  const control = structuredClone(original.model);
  control.cv.page = structuredClone(model.cv.page);
  const controlTable = control.cv.blocks[0];
  assert(controlTable.kind === "table");
  controlTable.indentMm = 0;
  return {
    model,
    control,
    fixture: {
      ...original.fixture,
      fixture: value.name.replace("carrier-story", "entry-flow"),
      removedEntryTables: entries.map((entry) => entry.id),
    },
  };
}

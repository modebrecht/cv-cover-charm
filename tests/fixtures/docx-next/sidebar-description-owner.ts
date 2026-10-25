/** Isolate native ownership of the main description; retain all flags and rows. */
import assert from "node:assert/strict";
import { sidebarLeadBoundaryFixture } from "./sidebar-lead-boundary";

export const SIDEBAR_DESCRIPTION_OWNER_CASES = (["right", "left"] as const).flatMap((orientation) =>
  (["tail-cell", "opening-cell"] as const).map((descriptionOwner) => ({
    name: `${orientation}-${descriptionOwner}-220`,
    orientation,
    variant: "detached" as const,
    scope: "main-only" as const,
    policy: "split-attached" as const,
    leadMm: 220 as const,
    sideSemanticKeepNext: false as const,
    sideEndingKeepNext: false as const,
    descriptionOwner,
  })),
);
export type SidebarDescriptionOwnerCase = (typeof SIDEBAR_DESCRIPTION_OWNER_CASES)[number];

export function sidebarDescriptionOwnerFixture(value: SidebarDescriptionOwnerCase) {
  const result = sidebarLeadBoundaryFixture(value);
  const table = result.model.cv.blocks[0];
  assert(table.kind === "table" && table.rows.length === 3);
  const main = result.fixture.tracks[0].cell;
  const tail = table.rows[2].cells[main];
  assert(tail.length === 1 && tail[0].kind === "paragraph");
  assert(table.rows[1].cells[main].length === 4);
  if (value.descriptionOwner === "opening-cell") {
    table.rows[1].cells[main].push(...tail);
    table.rows[2].cells[main] = [];
  }
  const fields = new Set(result.fixture.completeFields.map((field) => field.fieldId));
  return {
    model: result.model,
    fixture: {
      ...result.fixture,
      mainNativeFieldRows: table.rows.map((row) =>
        row.cells[main].filter((block) => fields.has(block.id)).map((block) => block.id),
      ),
    },
  };
}

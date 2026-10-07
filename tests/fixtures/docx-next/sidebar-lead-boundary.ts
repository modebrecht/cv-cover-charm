/** Isolate the authored main lead height without changing the owning paragraph. */
import assert from "node:assert/strict";
import { sidebarSideEndingFixture } from "./sidebar-side-ending";

export const SIDEBAR_LEAD_BOUNDARY_CASES = (["right", "left"] as const).flatMap((orientation) =>
  ([220, 0] as const).map((leadMm) => ({
    name: `${orientation}-lead-${leadMm}`,
    orientation,
    variant: "detached" as const,
    scope: "main-only" as const,
    policy: "split-attached" as const,
    leadMm,
    sideSemanticKeepNext: false as const,
    sideEndingKeepNext: false as const,
  })),
);
export type SidebarLeadBoundaryCase = (typeof SIDEBAR_LEAD_BOUNDARY_CASES)[number];

export function sidebarLeadBoundaryFixture(
  value: Omit<SidebarLeadBoundaryCase, "leadMm"> & { leadMm: number },
) {
  const result = sidebarSideEndingFixture({ ...value, leadMm: 220 });
  const table = result.model.cv.blocks[0];
  assert(table.kind === "table" && table.rows.length === 3);
  const main = result.fixture.tracks[0].cell;
  const cell = table.rows[0].cells[main];
  assert(cell.length === 1 && cell[0].kind === "spacer" && cell[0].heightMm === 220);
  cell[0].heightMm = value.leadMm;
  return {
    model: result.model,
    fixture: {
      ...result.fixture,
      diagnostic: value,
      leadSpacerFieldId: cell[0].id,
      authoredLeadMm: value.leadMm,
      leadSpacerMm: value.leadMm,
      leadTopPaddingMm: 0,
    },
  };
}

/** Isolate cantSplit on the lead row, which owns the spanning side content. */
import assert from "node:assert/strict";
import { sidebarSideEndingFixture } from "./sidebar-side-ending";

export const SIDEBAR_LEAD_TOGETHER_CASES = (["right", "left"] as const).flatMap((orientation) =>
  ([true, false] as const).map((leadKeepTogether) => ({
    name: `${orientation}-${leadKeepTogether ? "together" : "splittable"}-220`,
    orientation,
    variant: "detached" as const,
    scope: "main-only" as const,
    policy: "split-attached" as const,
    leadMm: 220 as const,
    sideSemanticKeepNext: false as const,
    sideEndingKeepNext: false as const,
    leadKeepTogether,
  })),
);
export type SidebarLeadTogetherCase = (typeof SIDEBAR_LEAD_TOGETHER_CASES)[number];

export function sidebarLeadTogetherFixture(value: SidebarLeadTogetherCase) {
  const result = sidebarSideEndingFixture(value);
  const table = result.model.cv.blocks[0];
  assert(table.kind === "table" && table.rows.length === 3);
  table.rows[0].keepTogether = value.leadKeepTogether;
  result.fixture.rowKeepTogether = table.rows.map((row) => row.keepTogether);
  return result;
}

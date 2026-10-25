/** Isolate only the short opening row's native cantSplit flag. */
import assert from "node:assert/strict";
import { sidebarMainEndingFixture } from "./sidebar-main-ending";

export const SIDEBAR_ROW_TOGETHER_CASES = (["left", "right"] as const).flatMap((orientation) =>
  ([true, false] as const).map((keepTogether) => ({
    name: `${orientation}-${keepTogether ? "together" : "splittable"}-220`,
    orientation,
    scope: "main-only" as const,
    policy: "split-attached" as const,
    leadMm: 220 as const,
    keepTogether,
  })),
);
export type SidebarRowTogetherCase = (typeof SIDEBAR_ROW_TOGETHER_CASES)[number];

export function sidebarRowTogetherFixture(value: SidebarRowTogetherCase) {
  const result = sidebarMainEndingFixture(value);
  const table = result.model.cv.blocks[0];
  assert(table.kind === "table" && table.rows.length === 3);
  table.rows[1].keepTogether = value.keepTogether;
  result.fixture.rowKeepTogether = table.rows.map((row) => row.keepTogether);
  return result;
}

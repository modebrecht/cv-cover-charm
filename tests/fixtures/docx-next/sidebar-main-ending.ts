/** Scope-only controls for the existing guarded native cell-ending primitive. */
import assert from "node:assert/strict";
import { sidebarPopulatedRowFixture } from "./sidebar-populated-row";

export const SIDEBAR_MAIN_ENDING_CASES = (["left", "right"] as const).flatMap((orientation) =>
  (["all-cells", "main-only"] as const).map((scope) => ({
    name: `${orientation}-${scope}-220`,
    orientation,
    scope,
    policy: "split-attached" as const,
    leadMm: 220 as const,
  })),
);
export type SidebarMainEndingCase = (typeof SIDEBAR_MAIN_ENDING_CASES)[number];

export function sidebarMainEndingFixture(value: SidebarMainEndingCase) {
  const result = sidebarPopulatedRowFixture(value);
  const table = result.model.cv.blocks[0];
  assert(table.kind === "table" && table.rows.length === 3);
  const mainCell = result.fixture.tracks[0].cell;
  table.rows[1].cellEndKeepNext = table.rows[1].cells.map(
    (_, cell) => value.scope === "all-cells" || cell === mainCell,
  );
  result.fixture.cellEndKeepNext = table.rows.map((row) => row.cellEndKeepNext!);
  return result;
}

/** Bounded negative controls; cell-ending flags never enable application Sidebar support. */
import assert from "node:assert/strict";
import { sidebarBodyAttachmentFixture } from "./sidebar-body-attachment";

export const SIDEBAR_CELL_END_POLICIES = [
  "default",
  "detached",
  "idle-attached",
  "shared-attached",
] as const;
export const SIDEBAR_CELL_END_CASES = ([220, 228, 234] as const).flatMap((leadMm) =>
  SIDEBAR_CELL_END_POLICIES.map((policy) => ({ name: `${policy}-${leadMm}`, policy, leadMm })),
);
export type SidebarCellEndCase = (typeof SIDEBAR_CELL_END_CASES)[number];

export function sidebarCellEndingFixture(value: SidebarCellEndCase) {
  const { model, fixture } = sidebarBodyAttachmentFixture({ ...value, mode: "grid" });
  const table = model.cv.blocks[0];
  assert(table.kind === "table");
  if (value.policy !== "default")
    for (const row of table.rows)
      row.cellEndKeepNext = row.cells.map((cell) =>
        value.policy === "detached"
          ? false
          : value.policy === "shared-attached" || cell.length === 0
            ? true
            : null,
      );
  const expectedCvPages =
    value.leadMm === 234 && (value.policy === "idle-attached" || value.policy === "shared-attached")
      ? [1, 2, 2, 2, 2]
      : fixture.expectedCvPages;
  return {
    model,
    fixture: {
      ...fixture,
      diagnostic: value,
      tableId: table.id,
      expectedCvPages,
      cellEndKeepNext: table.rows.map((row) => row.cellEndKeepNext ?? [null, null, null]),
      completeFields: fixture.cvSemanticText.map((text, index) => ({
        fieldId: fixture.openingFields[index].fieldId,
        text,
      })),
    },
  };
}

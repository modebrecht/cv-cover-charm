/** Isolate description ownership with the opening row splittable in both controls. */
import assert from "node:assert/strict";
import { sidebarDescriptionOwnerFixture } from "./sidebar-description-owner";

export const SIDEBAR_SPLIT_DESCRIPTION_OWNER_CASES = (["right", "left"] as const).flatMap(
  (orientation) =>
    (["tail-cell", "opening-cell"] as const).map((descriptionOwner) => ({
      name: `${orientation}-split-${descriptionOwner}-220`,
      orientation,
      variant: "detached" as const,
      scope: "main-only" as const,
      policy: "split-attached" as const,
      leadMm: 220 as const,
      sideSemanticKeepNext: false as const,
      sideEndingKeepNext: false as const,
      openingKeepTogether: false as const,
      descriptionOwner,
    })),
);
export type SidebarSplitDescriptionOwnerCase =
  (typeof SIDEBAR_SPLIT_DESCRIPTION_OWNER_CASES)[number];

export function sidebarSplitDescriptionOwnerFixture(value: SidebarSplitDescriptionOwnerCase) {
  const result = sidebarDescriptionOwnerFixture(value);
  const table = result.model.cv.blocks[0];
  assert(table.kind === "table" && table.rows.length === 3);
  table.rows[1].keepTogether = value.openingKeepTogether;
  result.fixture.rowKeepTogether = table.rows.map((row) => row.keepTogether);
  return result;
}

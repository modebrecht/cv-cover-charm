/** Isolate a generic inner table while retaining the outer spanning side owner. */
import assert from "node:assert/strict";
import { sidebarLeadBoundaryFixture } from "./sidebar-lead-boundary";

export const SIDEBAR_NESTED_SIDE_CASES = (["right", "left"] as const).flatMap((orientation) =>
  (["direct", "nested"] as const).map((sideComposition) => ({
    name: `${orientation}-${sideComposition}-side-220`,
    orientation,
    variant: "detached" as const,
    scope: "main-only" as const,
    policy: "split-attached" as const,
    leadMm: 220 as const,
    sideSemanticKeepNext: false as const,
    sideEndingKeepNext: false as const,
    sideComposition,
  })),
);
export type SidebarNestedSideCase = (typeof SIDEBAR_NESTED_SIDE_CASES)[number];

export function sidebarNestedSideFixture(value: SidebarNestedSideCase) {
  const result = sidebarLeadBoundaryFixture(value);
  const table = result.model.cv.blocks[0];
  assert(table.kind === "table" && table.rows.length === 3);
  const side = result.fixture.tracks[1].cell;
  const paragraphs = table.rows[0].cells[side];
  assert(paragraphs.length === 5 && paragraphs.every((block) => block.kind === "paragraph"));
  const lane = result.fixture.tracks[1].lane;
  const innerWidthMm = lane.rightMm - lane.leftMm;
  const nestedTableId = table.id + ".side-inner";
  if (value.sideComposition === "nested") {
    table.rows[0].cells[side] = [
      {
        kind: "table",
        id: nestedTableId,
        widths: [1],
        widthMm: innerWidthMm,
        rows: [{ cells: [paragraphs], keepTogether: false, cellEndKeepNext: [false] }],
        decoration: { borderColor: "FFFFFF", borderWidthMm: 0, paddingXMm: 0, paddingYMm: 0 },
      },
    ];
  }
  return {
    model: result.model,
    fixture: {
      ...result.fixture,
      nestedTableId,
      innerWidthMm,
      sideComposition: value.sideComposition,
    },
  };
}

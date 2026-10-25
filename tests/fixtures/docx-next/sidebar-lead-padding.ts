/** Compare an authored main lead paragraph with the same native cell top padding. */
import assert from "node:assert/strict";
import { sidebarSideEndingFixture } from "./sidebar-side-ending";

export const SIDEBAR_LEAD_PADDING_CASES = (["right", "left"] as const).flatMap((orientation) =>
  (["paragraph", "cell-padding"] as const).map((leadRepresentation) => ({
    name: `${orientation}-${leadRepresentation}-220`,
    orientation,
    variant: "detached" as const,
    scope: "main-only" as const,
    policy: "split-attached" as const,
    leadMm: 220 as const,
    sideSemanticKeepNext: false as const,
    sideEndingKeepNext: false as const,
    leadRepresentation,
  })),
);
export type SidebarLeadPaddingCase = (typeof SIDEBAR_LEAD_PADDING_CASES)[number];

export function sidebarLeadPaddingFixture(value: SidebarLeadPaddingCase) {
  const result = sidebarSideEndingFixture(value);
  const table = result.model.cv.blocks[0];
  assert(table.kind === "table" && table.rows.length === 3);
  const main = result.fixture.tracks[0].cell;
  const lead = table.rows[0].cells[main];
  assert(lead.length === 1 && lead[0].kind === "spacer" && lead[0].heightMm === value.leadMm);
  const paint = table.rows[0].cellDecorations![main]!;
  assert(paint.paddingTopMm === 0);
  if (value.leadRepresentation === "cell-padding") {
    table.rows[0].cells[main] = [];
    table.rows[0].cellDecorations![main] = { ...paint, paddingTopMm: value.leadMm };
  }
  return {
    model: result.model,
    fixture: {
      ...result.fixture,
      authoredLeadMm: value.leadMm,
      leadSpacerMm: value.leadRepresentation === "paragraph" ? value.leadMm : 0,
      leadTopPaddingMm: value.leadRepresentation === "cell-padding" ? value.leadMm : 0,
    },
  };
}

/** Isolate the two terminal keep-next flags without changing native ownership. */
import assert from "node:assert/strict";
import { walkBlocks } from "../../../src/lib/docx-next/model";
import { sidebarMainEndingFixture } from "./sidebar-main-ending";

export const SIDEBAR_SIDE_TERMINAL_VARIANTS = ["detached", "semantic-only", "ending-only"] as const;
export const SIDEBAR_SIDE_TERMINAL_CASES = (["right", "left"] as const).flatMap((orientation) =>
  SIDEBAR_SIDE_TERMINAL_VARIANTS.map((variant) => ({
    name: `${orientation}-${variant}-220`,
    orientation,
    variant,
    scope: "main-only" as const,
    policy: "split-attached" as const,
    leadMm: 220 as const,
    sideSemanticKeepNext: variant === "semantic-only",
    sideEndingKeepNext: variant === "ending-only",
  })),
);
export type SidebarSideTerminalCase = (typeof SIDEBAR_SIDE_TERMINAL_CASES)[number];

export function sidebarSideTerminalFixture(value: SidebarSideTerminalCase) {
  const result = sidebarMainEndingFixture(value);
  const table = result.model.cv.blocks[0];
  assert(table.kind === "table" && table.rows.length === 3);
  const side = result.fixture.tracks[1].cell;
  const paragraphs = walkBlocks(table.rows[0].cells[side]).filter(
    (block) => block.kind === "paragraph",
  );
  assert(paragraphs.length === 5 && !paragraphs[4].keepNext);
  paragraphs[4].keepNext = value.sideSemanticKeepNext;
  table.rows[0].cellEndKeepNext![side] = value.sideEndingKeepNext;
  return {
    model: result.model,
    fixture: {
      ...result.fixture,
      sideTerminalFieldId: paragraphs[4].id,
      sideSemanticKeepNext: value.sideSemanticKeepNext,
      cellEndKeepNext: table.rows.map((row) => row.cellEndKeepNext!),
    },
  };
}

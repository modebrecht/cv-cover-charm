/** Isolate the existing empty main-lead cell ending; never split semantic paragraphs. */
import assert from "node:assert/strict";
import { walkBlocks } from "../../../src/lib/docx-next/model";
import { sidebarSideEndingFixture } from "./sidebar-side-ending";

export const SIDEBAR_LEAD_MAIN_ENDING_CASES = (["right", "left"] as const).flatMap((orientation) =>
  ([false, true] as const).map((mainLeadEndingKeepNext) => ({
    name: `${orientation}-main-lead-${mainLeadEndingKeepNext ? "attached" : "detached"}-220`,
    orientation,
    mainLeadEndingKeepNext,
    variant: "detached" as const,
    scope: "main-only" as const,
    policy: "split-attached" as const,
    leadMm: 220 as const,
    sideSemanticKeepNext: false as const,
    sideEndingKeepNext: false as const,
  })),
);
export type SidebarLeadMainEndingCase = (typeof SIDEBAR_LEAD_MAIN_ENDING_CASES)[number];

export function sidebarLeadMainEndingFixture(value: SidebarLeadMainEndingCase) {
  const result = sidebarSideEndingFixture(value);
  const table = result.model.cv.blocks[0];
  assert(table.kind === "table" && table.rows.length === 3);
  const main = result.fixture.tracks[0].cell;
  assert(table.rows[0].cellEndKeepNext?.[main] === false);
  table.rows[0].cellEndKeepNext[main] = value.mainLeadEndingKeepNext;
  result.fixture.cellEndKeepNext = table.rows.map((row) => row.cellEndKeepNext!);
  return {
    model: result.model,
    fixture: {
      ...result.fixture,
      nativeParagraphs: walkBlocks(table.rows.flatMap((row) => row.cells.flat()))
        .filter((block) => block.kind === "paragraph")
        .map((paragraph) => ({
          fieldId: paragraph.id,
          flags: {
            keepNext: paragraph.keepNext,
            keepLines: paragraph.keepLines,
            widowControl: true,
          },
        })),
    },
  };
}

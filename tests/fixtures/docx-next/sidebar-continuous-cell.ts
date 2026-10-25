/** Bounded continuous native owners; whole paragraphs, no page reconstruction. */
import assert from "node:assert/strict";
import { walkBlocks } from "../../../src/lib/docx-next/model";
import {
  SIDEBAR_LEAD_MAIN_ENDING_CASES,
  sidebarLeadMainEndingFixture,
} from "./sidebar-lead-main-ending";

export const SIDEBAR_CONTINUOUS_CELL_CASES = (["right", "left"] as const).flatMap((orientation) =>
  (["three-row", "continuous-cell"] as const).map((composition) => ({
    name: `${orientation}-${composition}-220`,
    orientation,
    composition,
    leadMm: 220 as const,
  })),
);
export type SidebarContinuousCellCase = (typeof SIDEBAR_CONTINUOUS_CELL_CASES)[number];

export function sidebarContinuousCellFixture(value: SidebarContinuousCellCase) {
  const original = SIDEBAR_LEAD_MAIN_ENDING_CASES.find(
    (row) => row.orientation === value.orientation && !row.mainLeadEndingKeepNext,
  );
  assert(original);
  const result = sidebarLeadMainEndingFixture(original);
  const table = result.model.cv.blocks[0];
  assert(table.kind === "table" && table.rows.length === 3);
  const paragraphs = walkBlocks([table]).filter((block) => block.kind === "paragraph");
  const nativeParagraphs = result.fixture.nativeParagraphs;
  if (value.composition === "continuous-cell") {
    const rows = table.rows;
    // Each track owns one ordered native cell. Remove the row boundaries/merges,
    // not semantic paragraph boundaries; the original lead remains whole.
    table.rows = [
      {
        cells: rows[0].cells.map((_, cell) => rows.flatMap((row) => row.cells[cell])),
        keepTogether: false,
        cellDecorations: rows[0].cellDecorations?.map((paint, cell) =>
          paint
            ? {
                ...structuredClone(paint),
                paddingBottomMm: rows.at(-1)!.cellDecorations?.[cell]?.paddingBottomMm ?? 0,
              }
            : undefined,
        ),
        cellEndKeepNext: [false, false, false],
      },
    ];
    const current = walkBlocks([table]).filter((block) => block.kind === "paragraph");
    assert.equal(current.length, paragraphs.length);
    for (const paragraph of paragraphs)
      assert.deepEqual(
        current.find((row) => row.id === paragraph.id),
        paragraph,
      );
  }
  return {
    model: result.model,
    fixture: {
      ...result.fixture,
      fixture: value.name,
      diagnostic: value,
      originalName: original.name,
      rowKeepTogether: table.rows.map((row) => row.keepTogether),
      cellEndKeepNext: table.rows.map((row) => row.cellEndKeepNext!),
      rowFields: table.rows.map((row) =>
        row.cells.map((cell) => walkBlocks(cell).map((block) => block.id)),
      ),
      nativeParagraphs,
    },
  };
}

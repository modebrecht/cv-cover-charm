/** Neutral ownership controls, never application Sidebar support or pagination policy. */
import assert from "node:assert/strict";
import { walkBlocks } from "../../../src/lib/docx-next/model";
import { sidebarHeadingAttachmentFixture } from "./sidebar-heading-attachment";

const gridPages = {
  220: [1, 1, 1, 1, 2],
  224: [1, 1, 1, 2, 2],
  226: [1, 1, 1, 2, 2],
  228: [1, 1, 2, 2, 2],
  230: [1, 1, 2, 2, 2],
  234: [2, 2, 2, 2, 2],
} as const;
export const SIDEBAR_BODY_MODES = ["grid", "unmerged", "single-column", "body"] as const;
export const SIDEBAR_BODY_CASES = (
  Object.keys(gridPages).map(Number) as (keyof typeof gridPages)[]
).flatMap((leadMm) =>
  SIDEBAR_BODY_MODES.map((mode) => ({ name: `${mode}-${leadMm}`, mode, leadMm })),
);
export type SidebarBodyCase = (typeof SIDEBAR_BODY_CASES)[number];

export function sidebarBodyAttachmentFixture(value: SidebarBodyCase) {
  const { model } = sidebarHeadingAttachmentFixture({
    name: value.name,
    kind: "oversized",
    photo: false,
    rail: true,
    nested: false,
    disableHeadingAttachment: false,
    boundaryLeadMm: value.leadMm,
  });
  const table = model.cv.blocks[0];
  assert(table.kind === "table");
  const mainWidth = table.widths[2];
  const precedingWidth = table.widths[0] + table.widths[1];
  const padding = table.rows[1].cellDecorations?.[2]?.paddingXMm ?? 0;
  const lane = {
    leftMm: model.cv.page.margins.left + precedingWidth + padding,
    rightMm: model.cv.page.widthMm - model.cv.page.margins.right - padding,
  };
  // Only native ownership changes. Paragraph order, attachment flags and typography do not.
  if (value.mode === "unmerged")
    table.rows = table.rows.map((row) => ({ ...row, cellRowSpans: undefined }));
  if (value.mode === "single-column") {
    table.widthMm = mainWidth;
    table.indentMm = precedingWidth;
    table.widths = [1];
    table.rows = table.rows.map((row) => ({
      ...row,
      cells: [row.cells[2]],
      cellDecorations: [row.cellDecorations?.[2]],
      cellRowSpans: undefined,
    }));
  }
  if (value.mode === "body") {
    model.cv.blocks = table.rows.flatMap((row) => row.cells[2]);
    model.cv.page.margins.left = lane.leftMm;
    model.cv.page.margins.right = model.cv.page.widthMm - lane.rightMm;
  }
  const paragraphs = walkBlocks(model.cv.blocks).filter((block) => block.kind === "paragraph");
  assert(paragraphs.length === 5 && !paragraphs.at(-1)!.keepNext);
  assert(paragraphs.slice(0, -1).every((paragraph) => paragraph.keepNext));
  const fields = paragraphs.map((paragraph, index) => {
    const text = paragraph.runs.map((run) => run.text).join("");
    return {
      fieldId: paragraph.id,
      text: index === paragraphs.length - 1 ? text.slice(0, 35) : text,
      ...lane,
    };
  });
  return {
    model,
    fixture: {
      fixture: value.name,
      diagnostic: value,
      lane,
      cvSemanticText: paragraphs.map((paragraph) => paragraph.runs.map((run) => run.text).join("")),
      openingFields: fields,
      expectedCvPages:
        value.mode === "body" || value.mode === "single-column"
          ? [2, 2, 2, 2, 2]
          : gridPages[value.leadMm],
      parts: [
        { expectedPages: 1, contentBoxMm: model.cover.page.margins },
        { expectedPages: 1, contentBoxMm: model.letter.page.margins },
        { expectedPages: 8, contentBoxMm: model.cv.page.margins },
      ],
    },
  };
}

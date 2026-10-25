/** Neutral outer-row ownership controls; never an application pagination policy. */
import assert from "node:assert/strict";
import { walkBlocks } from "../../../src/lib/docx-next/model";
import { sidebarBodyAttachmentFixture } from "./sidebar-body-attachment";

export const SIDEBAR_SELECTIVE_ROW_POLICIES = ["grid", "split-detached", "split-attached"] as const;
export const SIDEBAR_SELECTIVE_ROW_CASES = ([220, 224, 226, 228, 230, 234] as const).flatMap(
  (leadMm) =>
    SIDEBAR_SELECTIVE_ROW_POLICIES.map((policy) => ({
      name: `${policy}-${leadMm}`,
      policy,
      leadMm,
    })),
);
export type SidebarSelectiveRowCase = (typeof SIDEBAR_SELECTIVE_ROW_CASES)[number];

export function sidebarSelectiveRowFixture(value: SidebarSelectiveRowCase) {
  const { model, fixture } = sidebarBodyAttachmentFixture({ ...value, mode: "grid" });
  const table = model.cv.blocks[0];
  assert(table.kind === "table" && table.rows.length === 2);
  // Explicit semantic boundary: heading/date/title/place; the description stays whole.
  const openingFieldIds = fixture.openingFields.slice(0, 4).map((field) => field.fieldId);
  if (value.policy !== "grid") {
    const [lead, content] = table.rows;
    const paragraphs = walkBlocks(content.cells[2]).filter((block) => block.kind === "paragraph");
    assert(paragraphs.length === 5);
    assert.deepEqual(
      paragraphs.slice(0, 4).map((paragraph) => paragraph.id),
      openingFieldIds,
    );
    assert(paragraphs.slice(0, 4).every((paragraph) => paragraph.keepNext));
    assert(!paragraphs[4].keepNext);
    lead.cellEndKeepNext = [false, false, false];
    // Extend existing vertical spans through the extra outer row, preserving paint.
    lead.cellRowSpans = lead.cellRowSpans?.map((span) => (span === 2 ? 3 : span));
    const opening = {
      ...content,
      cells: [content.cells[0], content.cells[1], paragraphs.slice(0, 4)],
      keepTogether: true,
      cellEndKeepNext: [true, true, true].map(() => value.policy === "split-attached"),
    };
    const tail = {
      ...content,
      cells: [[], [], [paragraphs[4]]],
      keepTogether: false,
      cellEndKeepNext: [false, false, false],
    };
    table.rows = [lead, opening, tail];
  }
  return {
    model,
    fixture: {
      ...fixture,
      diagnostic: value,
      tableId: table.id,
      openingFieldIds,
      expectedCvPages:
        value.policy === "grid" || (value.policy === "split-detached" && value.leadMm === 220)
          ? fixture.expectedCvPages
          : [2, 2, 2, 2, 2],
      rowKeepTogether: table.rows.map((row) => row.keepTogether),
      cellEndKeepNext: table.rows.map((row) => row.cellEndKeepNext ?? [null, null, null]),
      completeFields: fixture.cvSemanticText.map((text, index) => ({
        fieldId: fixture.openingFields[index].fieldId,
        text,
      })),
    },
  };
}

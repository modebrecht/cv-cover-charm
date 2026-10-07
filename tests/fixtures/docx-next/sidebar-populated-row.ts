/** Bounded populated-track counterexamples, never application pagination support. */
import assert from "node:assert/strict";
import { buildDossierDocModel } from "../../../src/lib/docx-next/build-model";
import { walkBlocks } from "../../../src/lib/docx-next/model";
import { sidebarFixture } from "./sidebar";
import { sidebarSelectiveRowFixture } from "./sidebar-selective-row";

export const SIDEBAR_POPULATED_ROW_CASES = (["left", "right"] as const).flatMap((orientation) =>
  (["grid", "split-attached"] as const).map((policy) => ({
    name: `${orientation}-${policy}-220`,
    orientation,
    policy,
    leadMm: 220 as const,
  })),
);
export type SidebarPopulatedRowCase = (typeof SIDEBAR_POPULATED_ROW_CASES)[number];

export function sidebarPopulatedRowFixture(value: SidebarPopulatedRowCase) {
  const { model, fixture } = sidebarSelectiveRowFixture(value);
  const table = model.cv.blocks[0];
  assert(table.kind === "table");
  const input = sidebarFixture("side-paragraph-long");
  const section = input.cv.data.customSections![0];
  section.id = "populated-side";
  section.title = "Sidebar-Langtext";
  Object.assign(section.entries[0], {
    id: "populated-entry",
    zeit: "2018–2020",
    titel: "Unabhängige Seitenspur",
    ort: "Bern",
    beschreibung:
      "Die eigenständige Seitenspur enthält vollständige editierbare Daten und setzt ihren Absatz auf weiteren Seiten fort. ".repeat(
        180,
      ) + " Vollständiger Seitenspur-Abschluss.",
  });
  input.settings.placements = { "custom:populated-side": "side" };
  const source = buildDossierDocModel(input);
  const flow = source.cv.blocks.find((block) => block.kind === "parallel-flow");
  assert(flow?.kind === "parallel-flow");
  const sideSection = flow.tracks[0].blocks.find(
    (block) => block.id === "cv.section.custom:populated-side",
  );
  assert(sideSection);
  const sideParagraphs = walkBlocks([sideSection]).filter((block) => block.kind === "paragraph");
  assert(sideParagraphs.length === 5 && !sideParagraphs[4].keepNext);
  table.rows[0].cells[0] = structuredClone(sideParagraphs);
  if (value.orientation === "right") {
    table.widths.reverse();
    for (const row of table.rows) {
      row.cells = [...row.cells].reverse();
      row.cellDecorations = row.cellDecorations
        ?.map((paint) => (paint ? structuredClone(paint) : undefined))
        .reverse();
      row.cellRowSpans = row.cellRowSpans && [...row.cellRowSpans].reverse();
      row.cellEndKeepNext = row.cellEndKeepNext && [...row.cellEndKeepNext].reverse();
      for (const paint of row.cellDecorations ?? []) if (paint?.border) paint.border.side = "left";
    }
  }
  const mainCell = value.orientation === "left" ? 2 : 0;
  const sideCell = 2 - mainCell;
  const lane = (cell: number, row: number) => {
    const left =
      model.cv.page.margins.left + table.widths.slice(0, cell).reduce((a, b) => a + b, 0);
    const padding = table.rows[row].cellDecorations?.[cell]?.paddingXMm ?? 0;
    return { leftMm: left + padding, rightMm: left + table.widths[cell] - padding };
  };
  const mainParagraphs = walkBlocks(table.rows.flatMap((row) => row.cells[mainCell])).filter(
    (block) => block.kind === "paragraph",
  );
  const paragraphsToFields = (paragraphs: typeof mainParagraphs) =>
    paragraphs.map((paragraph, index) => {
      const text = paragraph.runs.map((run) => run.text).join("");
      return { fieldId: paragraph.id, text, openingText: index === 4 ? text.slice(0, 35) : text };
    });
  const tracks = [
    {
      role: "main",
      cell: mainCell,
      lane: lane(mainCell, 1),
      fields: paragraphsToFields(mainParagraphs),
      expectedOpeningCvPages: value.orientation === "left" ? [1, 1, 1, 1, 2] : [2, 2, 2, 2, 2],
      expectedMissingFields:
        value.orientation === "right" && value.policy === "grid" ? [mainParagraphs[4].id] : [],
    },
    {
      role: "side",
      cell: sideCell,
      lane: lane(sideCell, 0),
      fields: paragraphsToFields(sideParagraphs),
      expectedOpeningCvPages: [1, 1, 1, 1, 1],
      expectedMissingFields:
        value.orientation === "right" && value.policy === "grid" ? [sideParagraphs[4].id] : [],
    },
  ];
  return {
    model,
    fixture: {
      fixture: value.name,
      diagnostic: value,
      tableId: table.id,
      openingFieldIds: fixture.openingFieldIds,
      rowKeepTogether: table.rows.map((row) => row.keepTogether),
      cellEndKeepNext: table.rows.map((row) => row.cellEndKeepNext ?? [null, null, null]),
      completeFields: [...tracks[1].fields, ...tracks[0].fields],
      tracks,
      contentBoxMm: model.cv.page.margins,
      expectedPages: value.orientation === "right" && value.policy === "grid" ? 5 : 21,
      expectedBoundsFailures: {
        outsideBody: value.orientation === "right" && value.policy === "grid" ? 1 : 0,
        outsideLanes: 0,
      },
    },
  };
}

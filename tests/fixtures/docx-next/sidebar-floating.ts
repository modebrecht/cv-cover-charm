/** Unaccepted native placement diagnostics, never application Sidebar composition. */
import assert from "node:assert/strict";
import { buildDossierDocModel } from "../../../src/lib/docx-next/build-model";
import { historicalSidebarControlModel } from "./historical-sidebar-model";
import { parallelFlowTable } from "../../../src/lib/docx-next/parallel-flow";
import { semanticFlowUnits } from "../../../src/lib/docx-next/semantic-flow-units";
import {
  walkBlocks,
  type DocBlock,
  type Paragraph,
  type ParallelFlowBlock,
  type TableBlock,
} from "../../../src/lib/docx-next/model";
import { sidebarFixture } from "./sidebar";
import { sidebarBodyAttachmentFixture } from "./sidebar-body-attachment";

const leads = [220, 224, 226, 228, 230, 234] as const;
export const SIDEBAR_FLOATING_CASES = [
  ...leads.flatMap((leadMm) =>
    [false, true].map((floating) => ({
      name: `${floating ? "floating" : "body"}-boundary-${leadMm}`,
      kind: "boundary" as const,
      leadMm,
      floating,
    })),
  ),
  ...(["left", "side-long", "both-long"] as const).flatMap((kind) =>
    (["left", "right"] as const).map((orientation) => ({
      name: `floating-${kind}-${orientation}`,
      kind,
      orientation,
      floating: true,
      semanticRows: false,
    })),
  ),
  ...(["left", "right"] as const).map((orientation) => ({
    name: `floating-both-long-rows-${orientation}`,
    kind: "both-long" as const,
    orientation,
    floating: true,
    semanticRows: true,
  })),
];
export type SidebarFloatingCase = (typeof SIDEBAR_FLOATING_CASES)[number];
export const paragraphSignature = (blocks: DocBlock[]) =>
  walkBlocks(blocks).filter((block): block is Paragraph => block.kind === "paragraph");
const texts = (blocks: DocBlock[]) =>
  paragraphSignature(blocks).map((paragraph) => paragraph.runs.map((run) => run.text).join(""));
const decoration = { borderColor: "000000", borderWidthMm: 0, paddingXMm: 0, paddingYMm: 0 };

export function sidebarFloatingFixture(value: SidebarFloatingCase) {
  if (value.kind === "boundary") {
    const { model, fixture } = sidebarBodyAttachmentFixture({
      name: value.name,
      mode: "body",
      leadMm: value.leadMm,
    });
    const main = structuredClone(model.cv.blocks);
    const heading = paragraphSignature(main)[0];
    const side: TableBlock = {
      kind: "table",
      id: "probe.floating-side",
      widths: [1],
      widthMm: 40,
      position: { xMm: 20, yMm: model.cv.page.margins.top },
      decoration,
      rows: [
        {
          keepTogether: false,
          cells: [
            Array.from({ length: 10 }, (_, index) => ({
              ...structuredClone(heading),
              id: `probe.side.${index}`,
              runs: [
                {
                  ...structuredClone(heading.runs[0]),
                  id: `probe.side.run.${index}`,
                  fieldId: undefined,
                  text: `Seiteninhalt ${index + 1}`,
                },
              ],
              keepNext: false,
            })),
          ],
        },
      ],
    };
    if (value.floating) model.cv.blocks.unshift(side);
    return {
      model,
      main,
      fixture: {
        fixture: value.name,
        diagnostic: value,
        mainLane: fixture.lane,
        sideLane: { leftMm: 20, rightMm: 60 },
        mainText: texts(main),
        sideText: value.floating ? texts([side]) : [],
        openingFields: fixture.openingFields,
        margins: model.cv.page.margins,
        expectedPages: 10,
        expectedMainFirstPage: 2,
        expectedSideFirstPage: value.floating ? 1 : null,
      },
    };
  }
  const source = buildDossierDocModel(sidebarFixture(value.kind));
  // This historical ownership experiment predates the occupied-reference-row
  // app fix. Keep its original two-column control (including the empty cell),
  // so the existing whole-package pins remain meaningful native evidence.
  const references = walkBlocks(source.cv.blocks).filter(
    (block) => block.kind === "table" && block.id.startsWith("cv.section.referenzen.pair:"),
  );
  assert.equal(references.length, 1);
  const reference = references[0];
  assert(reference.kind === "table" && reference.decoration);
  assert.deepEqual(reference.widths, [1]);
  assert.equal(reference.rows.length, 1);
  assert.equal(reference.rows[0].cells.length, 1);
  reference.widths = [1, 1];
  delete reference.columnWidthsMm;
  reference.rows[0].cells.push([]);
  reference.decoration.paddingXMm = 3;
  const flow = source.cv.blocks.find(
    (block): block is ParallelFlowBlock => block.kind === "parallel-flow",
  );
  assert(flow && flow.tracks.length === 2);
  const model = historicalSidebarControlModel();
  const page = structuredClone(source.cv.page);
  const margins = structuredClone(page.margins);
  const grid = parallelFlowTable(flow, page.widthMm - margins.left - margins.right);
  const [sideWidth, gap, mainWidth] = grid.widths;
  const mainLeft = value.orientation === "left" ? margins.left + sideWidth + gap : margins.left;
  const sideLeft = value.orientation === "left" ? margins.left : margins.left + mainWidth + gap;
  const main = structuredClone(flow.tracks[1].blocks);
  const sideBlocks = structuredClone(flow.tracks[0].blocks);
  const units = value.semanticRows ? semanticFlowUnits(sideBlocks) : [sideBlocks];
  const side: TableBlock = {
    kind: "table",
    id: "probe.floating-side",
    widths: [1],
    widthMm: sideWidth,
    position: { xMm: sideLeft, yMm: margins.top },
    decoration,
    rows: units.map((blocks) => ({
      keepTogether: false,
      cells: [blocks],
      cellDecorations: [flow.tracks[0].decoration],
    })),
  };
  // Same declarative physical widths and semantic tracks; only native ownership differs.
  page.margins.left = mainLeft;
  page.margins.right = page.widthMm - mainLeft - mainWidth;
  model.cv.page = page;
  model.cv.blocks = [side, ...main];
  assert.deepEqual(paragraphSignature([side]), paragraphSignature(sideBlocks));
  const long = value.kind !== "left";
  return {
    model,
    main,
    fixture: {
      fixture: value.name,
      diagnostic: value,
      mainLane: { leftMm: mainLeft, rightMm: mainLeft + mainWidth },
      sideLane: { leftMm: sideLeft, rightMm: sideLeft + sideWidth },
      mainText: texts(main),
      sideText: texts(sideBlocks),
      openingFields: [],
      margins,
      expectedPages:
        value.kind === "left" ? 3 : value.kind === "side-long" ? 9 : value.semanticRows ? 19 : 17,
      expectedMainFirstPage: long ? (value.semanticRows ? 9 : 7) : 1,
      expectedSideFirstPage: 1,
    },
  };
}

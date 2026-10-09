/** One automatically splitting floating carrier; two complete native cell stories. */
import assert from "node:assert/strict";
import type { TableBlock } from "../../../src/lib/docx-next/model";
import { sidebarFloatingContinuationFixture } from "./sidebar-floating-continuation";

export const SIDEBAR_CARRIER_STORY_CASES = (["left", "right"] as const).flatMap((orientation) =>
  (["left", "side-long", "both-long"] as const).map((kind) => ({
    name: `carrier-story-${orientation}-${kind}`,
    orientation,
    kind,
    policy: "all-pages" as const,
  })),
);
export type CarrierStoryCase = (typeof SIDEBAR_CARRIER_STORY_CASES)[number];

export function sidebarCarrierStoryFixture(value: CarrierStoryCase) {
  const original = sidebarFloatingContinuationFixture({
    ...value,
    name: `floating-continuation-${value.orientation}-${value.kind}-all-pages`,
  });
  const model = structuredClone(original.model),
    [side, ...main] = model.cv.blocks;
  assert(side.kind === "table" && side.position && side.rows.length === 1);
  const mm = (twips: number) => (twips * 25.4) / 1440;
  const twips = (millimetres: number) => Math.round((millimetres * 1440) / 25.4);
  const lanes = [original.fixture.sideLane, original.fixture.mainLane];
  const first = value.orientation === "left" ? 0 : 1,
    second = 1 - first;
  const sideWidth = twips(original.fixture.sideLane.rightMm - original.fixture.sideLane.leftMm);
  const mainWidth = twips(original.fixture.mainLane.rightMm - original.fixture.mainLane.leftMm);
  const widths = [
    first === 0 ? sideWidth : mainWidth,
    twips(lanes[second].leftMm) -
      twips(lanes[first].leftMm) -
      (first === 0 ? sideWidth : mainWidth),
    second === 0 ? sideWidth : mainWidth,
  ];
  assert(widths.every((width) => width > 0));
  const sideCell = first === 0 ? 0 : 2,
    mainCell = first === 1 ? 0 : 2;
  const cells = [[], [], []] as TableBlock["rows"][number]["cells"];
  cells[sideCell] = side.rows[0].cells[0];
  cells[mainCell] = main;
  const paint = { paddingXMm: 0, paddingYMm: 0 };
  const decorations = [paint, paint, paint];
  decorations[sideCell] = side.rows[0].cellDecorations?.[0] ?? paint;
  const carrier: TableBlock = {
    kind: "table",
    id: "probe.floating-carrier",
    widths,
    widthMm: mm(widths.reduce((a, b) => a + b, 0)),
    position: { xMm: mm(twips(lanes[first].leftMm)), yMm: side.position.yMm },
    decoration: { borderColor: "000000", borderWidthMm: 0, paddingXMm: 0, paddingYMm: 0 },
    rows: [{ keepTogether: false, cells, cellDecorations: decorations }],
  };
  assert.deepEqual(
    carrier.rows[0].cells[sideCell],
    (original.model.cv.blocks[0] as TableBlock).rows[0].cells[0],
  );
  assert.deepEqual(carrier.rows[0].cells[mainCell], original.model.cv.blocks.slice(1));
  model.cv.blocks = [carrier];
  return {
    model,
    control: original.model,
    fixture: {
      ...original.fixture,
      fixture: value.name,
      diagnostic: value,
      carrierOwnerId: carrier.id,
      declaredStoryCells: { side: sideCell, main: mainCell },
      nativeColumnWidths: widths,
      expectedMainFirstPage: 1,
      expectedSideFirstPage: 1,
    },
  };
}

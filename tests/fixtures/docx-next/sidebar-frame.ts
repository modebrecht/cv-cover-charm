/** Four structural controls only: auto-height frames remain unaccepted. */
import assert from "node:assert/strict";
import { walkBlocks } from "../../../src/lib/docx-next/model";
import { sidebarFloatingFixture, paragraphSignature } from "./sidebar-floating";

export const SIDEBAR_FRAME_CASES = (["left", "side-long"] as const).flatMap((kind) =>
  (["left", "right"] as const).map((orientation) => ({
    name: `frame-${kind}-${orientation}`,
    kind,
    orientation,
  })),
);
export type SidebarFrameCase = (typeof SIDEBAR_FRAME_CASES)[number];

export function sidebarFrameFixture(value: SidebarFrameCase) {
  const { model, main, fixture } = sidebarFloatingFixture({
    ...value,
    floating: true,
    semanticRows: false,
  });
  const side = model.cv.blocks[0];
  assert(side.kind === "table" && side.position && side.widthMm);
  const blocks = side.rows.flatMap((row) => row.cells.flat());
  // These neutral controls explicitly contain no section body indentation or pictures.
  assert(
    walkBlocks(blocks).every((block) => ["section", "entry", "paragraph"].includes(block.kind)),
  );
  assert(walkBlocks(blocks).every((block) => block.kind !== "section" || !block.contentIndentMm));
  const paragraphs = paragraphSignature(blocks);
  const paint = side.rows[0].cellDecorations![0]!;
  const xMm = side.position.xMm + paint.paddingXMm;
  const widthMm = side.widthMm - paint.paddingXMm * 2;
  model.cv.blocks[0] = {
    kind: "paragraph-frame",
    id: "probe.side-frame",
    xMm,
    yMm: side.position.yMm + (paint.paddingTopMm ?? paint.paddingYMm),
    widthMm,
    paragraphs,
  };
  assert.deepEqual(paragraphSignature(model.cv.blocks[0].paragraphs), paragraphs);
  const fields = (blocks: Parameters<typeof paragraphSignature>[0]) =>
    paragraphSignature(blocks).map((paragraph) => ({
      fieldId: paragraph.id,
      text: paragraph.runs.map((run) => run.text).join(""),
    }));
  return {
    model,
    main,
    fixture: {
      fixture: value.name,
      diagnostic: value,
      mainLane: fixture.mainLane,
      sideLane: { leftMm: xMm, rightMm: xMm + widthMm },
      mainFields: fields(main),
      sideFields: fields(paragraphs),
      margins: fixture.margins,
      expectedPages: 3,
      expectedSideMissingCount: value.kind === "side-long" ? 53 : 0,
      expectedSideMissingFieldIds:
        value.kind === "side-long"
          ? [
              ...Array.from({ length: 49 }, (_, index) => `cv.entry.hobbys:${index + 6}`),
              "cv.section.staerken.heading",
              ...Array.from({ length: 3 }, (_, index) => `cv.entry.staerken:${index}`),
            ]
          : [],
      expectedSideOutsideBodySpans: value.kind === "side-long" ? 9 : 0,
      accepted: false,
    },
  };
}

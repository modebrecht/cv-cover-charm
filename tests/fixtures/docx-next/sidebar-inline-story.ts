/** Primary-backed inline owner diagnostic; never production Sidebar composition. */
import assert from "node:assert/strict";
import { walkBlocks, type TableBlock } from "../../../src/lib/docx-next/model";
import { sidebarFloatingContinuationFixture } from "./sidebar-floating-continuation";
import { paragraphSignature } from "./sidebar-floating";

export const SIDEBAR_INLINE_STORY_CASES = (["left", "right"] as const).flatMap((orientation) =>
  (["left", "side-long", "both-long"] as const).map((kind) => ({
    name: `inline-story-${orientation}-${kind}`,
    orientation,
    kind,
    policy: "all-pages" as const,
  })),
);
export type InlineStoryCase = (typeof SIDEBAR_INLINE_STORY_CASES)[number];

export function sidebarInlineStoryFixture(value: InlineStoryCase) {
  const original = sidebarFloatingContinuationFixture({
    ...value,
    name: `floating-continuation-${value.orientation}-${value.kind}-all-pages`,
  });
  const model = structuredClone(original.model);
  const [side, ...main] = model.cv.blocks;
  const mainOwner: TableBlock = {
    kind: "table",
    id: "probe.inline-main",
    widths: [1],
    widthMm: original.fixture.mainLane.rightMm - original.fixture.mainLane.leftMm,
    decoration: { borderColor: "000000", borderWidthMm: 0, paddingXMm: 0, paddingYMm: 0 },
    rows: [{ keepTogether: false, cells: [main] }],
  };
  model.cv.blocks = [side, mainOwner];
  assert.deepEqual(mainOwner.rows[0].cells[0], original.model.cv.blocks.slice(1));
  assert.deepEqual(
    paragraphSignature(mainOwner.rows[0].cells[0]),
    paragraphSignature(original.model.cv.blocks.slice(1)),
  );
  const originalMainModelTableIds = walkBlocks(main)
    .filter((block) => block.kind === "table")
    .map((block) => block.id);
  return {
    model,
    control: original.model,
    fixture: {
      ...original.fixture,
      fixture: value.name,
      diagnostic: value,
      mainOwnerId: mainOwner.id,
      originalMainModelTableIds,
      expectedMainFirstPage: 1,
      expectedSideFirstPage: 1,
    },
  };
}

/** Two complete adjacent floating owners; diagnostic only, no native text rewriting. */
import assert from "node:assert/strict";
import type { TableBlock } from "../../../src/lib/docx-next/model";
import { sidebarInlineStoryFixture } from "./sidebar-inline-story";

export const SIDEBAR_DUAL_STORY_CASES = (["left", "right"] as const).flatMap((orientation) =>
  (["left", "side-long", "both-long"] as const).map((kind) => ({
    name: `dual-story-${orientation}-${kind}`,
    orientation,
    kind,
    policy: "all-pages" as const,
  })),
);
export type DualStoryCase = (typeof SIDEBAR_DUAL_STORY_CASES)[number];

export function sidebarDualStoryFixture(value: DualStoryCase) {
  const original = sidebarInlineStoryFixture({
    ...value,
    name: `inline-story-${value.orientation}-${value.kind}`,
  });
  const model = structuredClone(original.model);
  const [side, main] = model.cv.blocks as TableBlock[];
  assert(side.position);
  main.position = {
    xMm: original.fixture.mainLane.leftMm,
    yMm: side.position.yMm,
  };
  side.position.nextFloatingTableId = main.id;
  assert.deepEqual(main.rows, (original.model.cv.blocks[1] as TableBlock).rows);
  assert.deepEqual(side.rows, (original.model.cv.blocks[0] as TableBlock).rows);
  const normalized = structuredClone(model);
  delete (normalized.cv.blocks[0] as TableBlock).position!.nextFloatingTableId;
  delete (normalized.cv.blocks[1] as TableBlock).position;
  assert.deepEqual(normalized, original.model);
  return {
    model,
    control: original.model,
    fixture: {
      ...original.fixture,
      fixture: value.name,
      diagnostic: value,
      sideOwnerId: side.id,
    },
  };
}

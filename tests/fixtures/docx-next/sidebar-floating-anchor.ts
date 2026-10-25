/** Explicit logical anchor owner, with the documented continuation policy fixed true. */
import assert from "node:assert/strict";
import {
  SIDEBAR_FLOATING_CONTINUATION_CASES,
  sidebarFloatingContinuationFixture,
} from "./sidebar-floating-continuation";

export const SIDEBAR_FLOATING_ANCHOR_CASES = (["right", "left"] as const).flatMap((orientation) =>
  (["left", "side-long", "both-long"] as const).flatMap((kind) =>
    (["empty-separator", "following-paragraph"] as const).map((anchor) => ({
      name: `floating-anchor-${orientation}-${kind}-${anchor}`,
      orientation,
      kind,
      policy: "all-pages" as const,
      anchor,
    })),
  ),
);
export type FloatingAnchorCase = (typeof SIDEBAR_FLOATING_ANCHOR_CASES)[number];

export function sidebarFloatingAnchorFixture(value: FloatingAnchorCase) {
  const control = SIDEBAR_FLOATING_CONTINUATION_CASES.find(
    (row) =>
      row.orientation === value.orientation &&
      row.kind === value.kind &&
      row.policy === "all-pages",
  );
  assert(control);
  const { model, fixture } = sidebarFloatingContinuationFixture(control);
  const table = model.cv.blocks[0],
    following = model.cv.blocks[1];
  assert(table.kind === "table" && table.position && following.kind === "paragraph");
  if (value.anchor === "following-paragraph") table.position.anchorParagraphId = following.id;
  return {
    model,
    fixture: {
      ...fixture,
      fixture: value.name,
      diagnostic: value,
      anchorParagraphId: value.anchor === "following-paragraph" ? following.id : null,
      expectedMainFirstPage:
        value.anchor === "following-paragraph" || value.kind === "left" ? 1 : 7,
    },
  };
}

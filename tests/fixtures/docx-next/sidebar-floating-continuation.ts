/** One documented document-wide continuation policy; whole native stories stay unchanged. */
import assert from "node:assert/strict";
import {
  SIDEBAR_FLOATING_CASES,
  sidebarFloatingFixture,
  paragraphSignature,
} from "./sidebar-floating";

export const SIDEBAR_FLOATING_CONTINUATION_CASES = (["right", "left"] as const).flatMap(
  (orientation) =>
    (["left", "side-long", "both-long"] as const).flatMap((kind) =>
      (["default", "all-pages"] as const).map((policy) => ({
        name: `floating-continuation-${orientation}-${kind}-${policy}`,
        orientation,
        kind,
        policy,
      })),
    ),
);
export type FloatingContinuationCase = (typeof SIDEBAR_FLOATING_CONTINUATION_CASES)[number];

export function sidebarFloatingContinuationFixture(value: FloatingContinuationCase) {
  const original = SIDEBAR_FLOATING_CASES.find(
    (row) =>
      row.kind === value.kind &&
      "orientation" in row &&
      row.orientation === value.orientation &&
      !row.semanticRows,
  );
  assert(original);
  const { model, fixture } = sidebarFloatingFixture(original);
  if (value.policy === "all-pages") model.floatingTableTextFlow = "all-pages";
  return {
    model,
    fixture: {
      ...fixture,
      fixture: value.name,
      diagnostic: value,
      originalName: original.name,
      nativeParagraphs: paragraphSignature(model.cv.blocks).map((paragraph) => ({
        fieldId: paragraph.id,
        flags: {
          keepNext: !!paragraph.keepNext,
          keepLines: !!paragraph.keepLines,
          widowControl: true,
        },
      })),
      expectedMainFirstPage: value.policy === "all-pages" ? 1 : fixture.expectedMainFirstPage,
    },
  };
}

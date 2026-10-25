/** The existing populated sources, with only their declared first-cell ID annotation. */
import assert from "node:assert/strict";
import { walkBlocks } from "../../../src/lib/docx-next/model";
import { sidebarLeadWindowFixture } from "./sidebar-lead-window";

export const CONTAINER_SPAN_CASES = (["right", "left"] as const).flatMap((orientation) =>
  ([210, 220] as const).flatMap((leadMm) =>
    (["caption-only", "cell-ending"] as const).map((carrier) => ({
      name: `container-span-${orientation}-${leadMm}-${carrier}`,
      orientation,
      leadMm,
      carrier,
    })),
  ),
);
export type ContainerSpanCase = (typeof CONTAINER_SPAN_CASES)[number];
export const CONTAINER_DECLARED_GRID_CASES = CONTAINER_SPAN_CASES.map((value) => ({
  ...value,
  name: value.name.replace("container-span-", "container-declared-grid-"),
  gridMode: "declared-grid" as const,
}));

export const CONTAINER_DECLARED_WIDTH_CASES = CONTAINER_SPAN_CASES.map((value) => ({
  ...value,
  name: value.name.replace("container-span-", "container-declared-width-"),
  gridMode: "declared-width" as const,
}));

export function containerSpanFixture(
  value: ContainerSpanCase & { gridMode?: "declared-grid" | "declared-width" },
) {
  const originalName = `${value.orientation}-window-${value.leadMm}`;
  const result = sidebarLeadWindowFixture({
    name: originalName,
    orientation: value.orientation,
    leadMm: value.leadMm,
    variant: "detached",
    scope: "main-only",
    policy: "split-attached",
    sideSemanticKeepNext: false,
    sideEndingKeepNext: false,
  });
  const table = result.model.cv.blocks[0];
  assert(table.kind === "table" && table.rows.length === 3);
  if (value.gridMode === "declared-grid") {
    // A separately declared source, not a repair of the original saved package.
    const grid = value.orientation === "right" ? [6508, 340, 2790] : [2790, 340, 6508];
    const widthMm = table.widths.reduce((sum, width) => sum + width, 0);
    table.widths = grid.map((twips) => (twips * widthMm) / 9638);
  } else if (value.gridMode === "declared-width") {
    table.widthMm = (9637 * 25.4) / 1440;
  }
  if (value.gridMode) {
    const total = table.widths.reduce((sum, width) => sum + width, 0);
    const renderedWidths = table.widths.map((width) => (width * (table.widthMm ?? total)) / total);
    for (const track of result.fixture.tracks) {
      const row = track.role === "main" ? 1 : 0;
      const padding = table.rows[row].cellDecorations?.[track.cell]?.paddingXMm ?? 0;
      const left =
        result.model.cv.page.margins.left +
        renderedWidths.slice(0, track.cell).reduce((sum, width) => sum + width, 0);
      track.lane = { leftMm: left + padding, rightMm: left + renderedWidths[track.cell] - padding };
    }
  }
  if (value.carrier === "cell-ending") table.identityCarrier = "cell-ending";
  return {
    model: result.model,
    fixture: {
      ...result.fixture,
      ...value,
      fixture: value.name,
      originalName,
      rowFields: table.rows.map((row) =>
        row.cells.map((cell) => walkBlocks(cell).map((block) => block.id)),
      ),
    },
  };
}

import { walkBlocks, type ParallelFlowBlock, type TableBlock } from "./model";
import { parallelFlowTable } from "./parallel-flow";
import { imageZoneAnchor } from "./image-zone";

/** Guarded shared lowering: complete independent native cell stories, never page fragments. */
export function sidebarBodyTable(
  flow: ParallelFlowBlock,
  widthMm: number,
  mainTrackIndex?: number,
): TableBlock {
  const independent = structuredClone(flow);
  const leadingInsetMm = independent.leadingInsetMm ?? 0;
  delete independent.rowAlignment;
  delete independent.leadingInsetMm;
  delete independent.spanningTracks;
  for (const block of walkBlocks(independent.tracks.flatMap((track) => track.blocks))) {
    if (block.kind === "entry") block.keepTogether = false;
  }
  const table = parallelFlowTable(independent, widthMm);
  if (mainTrackIndex !== undefined) {
    if (
      !Number.isInteger(mainTrackIndex) ||
      mainTrackIndex < 0 ||
      mainTrackIndex >= flow.tracks.length
    )
      throw new Error("DOCX Next invalid Sidebar main track");
    const cellIndex = mainTrackIndex * (flow.gapMm ? 2 : 1);
    const cell = table.rows[0].cells[cellIndex];
    const totalWeight = flow.tracks.reduce((sum, track) => sum + track.weight, 0);
    const available = widthMm - flow.gapMm * (flow.tracks.length - 1);
    const trackWidth = (available * flow.tracks[mainTrackIndex].weight) / totalWeight;
    cell.splice(
      0,
      cell.length,
      ...cell.map((block) =>
        block.kind === "image-zone" ? imageZoneAnchor(block, trackWidth) : block,
      ),
    );
  }
  table.columnRounding = "cumulative";
  // Start the section with its table. A separate preceding paragraph can strand
  // itself on a blank page when the following independent row spans many pages.
  table.bodyBoundary = "section-start";
  // These empty cell-start anchors must not couple independent long stories.
  // All semantic paragraph attachment policies remain unchanged.
  table.bodyBoundaryKeepNext = false;
  if (leadingInsetMm) table.bodyBoundaryLeadMm = leadingInsetMm;
  return table;
}

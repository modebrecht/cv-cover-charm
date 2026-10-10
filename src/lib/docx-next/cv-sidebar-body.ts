import { walkBlocks, type ParallelFlowBlock, type TableBlock } from "./model";
import { parallelFlowTable } from "./parallel-flow";

/** Guarded shared lowering: complete independent native cell stories, never page fragments. */
export function sidebarBodyTable(flow: ParallelFlowBlock, widthMm: number): TableBlock {
  const independent = structuredClone(flow);
  const leadingInsetMm = independent.leadingInsetMm ?? 0;
  delete independent.rowAlignment;
  delete independent.leadingInsetMm;
  delete independent.spanningTracks;
  for (const block of walkBlocks(independent.tracks.flatMap((track) => track.blocks)))
    if (block.kind === "entry") block.keepTogether = false;
  const table = parallelFlowTable(independent, widthMm);
  table.columnRounding = "cumulative";
  table.bodyBoundary = "paragraph";
  table.bodyBoundaryKeepNext = true;
  if (leadingInsetMm) table.bodyBoundaryLeadMm = leadingInsetMm;
  return table;
}

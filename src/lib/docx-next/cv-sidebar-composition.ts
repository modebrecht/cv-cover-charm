import { compositeTextColor } from "./colors";
import { parallelFlowTable } from "./parallel-flow";
import { walkBlocks, type DocBlock, type DocumentPart, type ParallelFlowBlock } from "./model";

/** Semantic partition only. Widths use the native content grid, never PDF page plans. */
export function composeCvSidebar(
  part: DocumentPart,
  accent: string,
  paper: string,
  opacity: number,
): void {
  if (part.layout.mode !== "sidebar") return;
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1)
    throw new Error("DOCX Next invalid sidebar paint opacity");
  const fraction = part.layout.sidebarFraction;
  if (!Number.isFinite(fraction) || fraction < 0.22 || fraction > 0.42)
    throw new Error("DOCX Next sidebar fraction must be between 0.22 and 0.42");
  const main: DocBlock[] = [],
    side: DocBlock[] = [],
    outside: DocBlock[] = [];
  const width = part.page.widthMm - part.page.margins.left - part.page.margins.right;
  const gapMm = 6,
    paddingXMm = 3;
  const sideWidth = (width - gapMm) * fraction - 2 * paddingXMm;
  const mainWidth = (width - gapMm) * (1 - fraction);
  if (part.layout.pagination?.firstPageLeadMm)
    throw new Error("DOCX Next sidebar differing first/continuation top margins are unsupported");
  for (const block of part.blocks) {
    if (block.id === "cv.firstPageLead") continue;
    if (block.kind === "decorative-shape") {
      outside.push(block);
    } else if (block.kind === "section") {
      (block.placement === "side" ? side : main).push(block);
    } else if (block.kind === "image") {
      if (block.placement === "free")
        throw new Error(`DOCX Next sidebar free photo positioning is unsupported: ${block.id}`);
      const target = block.placement === part.layout.side ? side : main;
      if (block.widthMm > (target === side ? sideWidth : mainWidth) + 0.001)
        throw new Error(`DOCX Next sidebar photo exceeds its native track: ${block.id}`);
      target.unshift({
        ...block,
        placement: "inline",
        align: "center",
        xMm: 0,
        yMm: 0,
        coordinateOrigin: "content",
      });
    } else main.push(block);
  }
  // A continuous cell cannot guarantee atomic entry grouping across pages.
  // Declare row coupling when the rail contains such groups; never flatten them.
  const atomicSide = walkBlocks(side).some((block) => block.kind === "entry" && block.keepTogether);
  const sideTrack: ParallelFlowBlock["tracks"][number] = {
    weight: fraction,
    blocks: side,
    decoration: {
      paddingXMm,
      paddingYMm: 3,
      ...(opacity > 0
        ? {
            fillColor: compositeTextColor(accent, paper, 0.08 * opacity),
            border: {
              color: compositeTextColor(accent, paper, opacity),
              widthMm: 0.25,
              side: part.layout.side === "left" ? ("right" as const) : ("left" as const),
            },
          }
        : {}),
    },
  };
  const mainTrack = { weight: 1 - fraction, blocks: main };
  const flow: ParallelFlowBlock = {
    kind: "parallel-flow",
    id: "cv.sidebar",
    gapMm,
    rowAlignment: "semantic",
    spanningTracks: atomicSide ? [] : [part.layout.side === "left" ? 0 : 1],
    tracks: part.layout.side === "left" ? [sideTrack, mainTrack] : [mainTrack, sideTrack],
  };
  // Explicit page starts/nested columns/floating semantic content fail at this boundary.
  parallelFlowTable(flow, width);
  part.blocks = [...outside, flow];
}

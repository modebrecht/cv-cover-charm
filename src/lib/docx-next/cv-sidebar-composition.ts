import { compositeTextColor } from "./colors";
import { parallelFlowTable } from "./parallel-flow";
import { walkBlocks, type DocBlock, type DocumentPart, type ParallelFlowBlock } from "./model";
import { imageZoneExtent, imageZoneFromPage } from "./image-zone";
import { sidebarBodyTable } from "./cv-sidebar-body";

/** Semantic partition only. Widths use the native content grid, never PDF page plans. */
export function composeCvSidebar(
  part: DocumentPart,
  accent: string,
  paper: string,
  opacity: number,
  composition: "semantic-rows" | "body-stories" = "semantic-rows",
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
  for (const block of part.blocks) {
    if (block.id === "cv.firstPageLead") continue;
    if (block.kind === "decorative-shape") {
      outside.push(block);
    } else if (block.kind === "section") {
      (block.placement === "side" ? side : main).push(block);
    } else if (block.kind === "image") {
      if (block.placement === "free") {
        const bodyTopMm = part.page.margins.top + (part.layout.pagination?.firstPageLeadMm ?? 0);
        const sideTrackWidth = (width - gapMm) * fraction;
        const mainTrackWidth = (width - gapMm) * (1 - fraction);
        const sideLeft =
          part.page.margins.left + (part.layout.side === "right" ? mainTrackWidth + gapMm : 0);
        const mainLeft =
          part.page.margins.left + (part.layout.side === "left" ? sideTrackWidth + gapMm : 0);
        // The saved free coordinates mirror with the app's physical Sidebar composition.
        const physicalXmm =
          part.layout.side === "right" ? part.page.widthMm - block.xMm - block.widthMm : block.xMm;
        const { borderOutsetMm } = imageZoneExtent(block);
        const tracks = [
          { blocks: side, leftMm: sideLeft + paddingXMm, widthMm: sideWidth, topMm: bodyTopMm + 3 },
          { blocks: main, leftMm: mainLeft, widthMm: mainWidth, topMm: bodyTopMm },
        ];
        const owner = tracks.find(
          (track) =>
            physicalXmm - borderOutsetMm >= track.leftMm - 0.001 &&
            physicalXmm + block.widthMm + borderOutsetMm <= track.leftMm + track.widthMm + 0.001,
        );
        if (!owner) throw new Error(`DOCX Next free photo must fit one native track ${block.id}`);
        owner.blocks.unshift(
          imageZoneFromPage(
            block,
            {
              leftMm: owner.leftMm,
              topMm: owner.topMm,
              widthMm: owner.widthMm,
              heightMm: part.page.heightMm - part.page.margins.bottom - owner.topMm,
            },
            physicalXmm,
          ),
        );
        continue;
      }
      const target = block.placement === part.layout.side ? side : main;
      const paintedWidthMm = block.widthMm + 2 * (block.frame?.borderWidthMm ?? 0);
      if (paintedWidthMm > (target === side ? sideWidth : mainWidth) + 0.001)
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
    leadingInsetMm: part.layout.pagination?.firstPageLeadMm ?? 0,
    spanningTracks: atomicSide ? [] : [part.layout.side === "left" ? 0 : 1],
    tracks: part.layout.side === "left" ? [sideTrack, mainTrack] : [mainTrack, sideTrack],
  };
  // Explicit page starts/nested columns/floating semantic content fail at this boundary.
  if (composition === "semantic-rows") parallelFlowTable(flow, width);
  if (opacity > 0) {
    // Cell shading ends with the story. The structural rail belongs to the
    // page, including its outer margin and the space after the final entry.
    // Reuse the same native content edge; do not resize or stretch the table.
    const edgeMm =
      part.layout.side === "left"
        ? part.page.margins.left + sideWidth + 2 * paddingXMm
        : part.page.widthMm - part.page.margins.right - sideWidth - 2 * paddingXMm;
    const leftMm = part.layout.side === "left" ? 0 : edgeMm;
    const widthMm = part.layout.side === "left" ? edgeMm : part.page.widthMm - edgeMm;
    part.artwork.push(
      {
        kind: "decorative-artwork",
        id: "cv.artwork.sidebar-surface",
        semanticText: false,
        fill: { color: compositeTextColor(accent, paper, 0.08 * opacity) },
        xMm: leftMm,
        yMm: 0,
        widthMm,
        heightMm: part.page.heightMm,
      },
      {
        kind: "decorative-artwork",
        id: "cv.artwork.sidebar-edge",
        semanticText: false,
        fill: { color: compositeTextColor(accent, paper, opacity) },
        xMm: edgeMm - 0.125,
        yMm: 0,
        widthMm: 0.25,
        heightMm: part.page.heightMm,
      },
    );
  }
  part.blocks = [
    ...outside,
    composition === "body-stories"
      ? sidebarBodyTable(flow, width, part.layout.side === "left" ? 1 : 0)
      : flow,
  ];
}

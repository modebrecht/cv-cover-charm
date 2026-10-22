import type { CvSidebarGeometry } from "@/components/cv/sidebar-geometry";
import type {
  CellDecoration,
  DocBlock,
  DocumentPart,
  TableBlock,
} from "./model";
import { walkBlocks } from "./model";
import { imageZoneExtent } from "./image-zone";
import { compositeTextColor } from "./colors";

/** Two complete native stories on the authored page grid. No browser pagination. */
export function composeSharedCvSidebar(
  part: DocumentPart,
  first: CvSidebarGeometry,
  continuation: CvSidebarGeometry,
  accent: string,
  paper: string,
  opacity: number,
  automaticSidePhotoWidthMm?: number,
): void {
  if (part.layout.mode !== "sidebar")
    throw Error("DOCX Next shared grid requires Sidebar");
  const { rail, mainText, sideText } = first;
  const sideRight = first.side === "right";
  if (
    !Number.isFinite(opacity) ||
    opacity < 0 ||
    opacity > 1 ||
    first.side !== part.layout.side ||
    continuation.side !== first.side ||
    rail.leftMm !== continuation.rail.leftMm ||
    rail.widthMm !== continuation.rail.widthMm ||
    mainText.leftMm !== continuation.mainText.leftMm ||
    mainText.widthMm !== continuation.mainText.widthMm
  )
    throw Error("DOCX Next inconsistent shared Sidebar geometry");
  const gapMm = sideRight
    ? rail.leftMm - mainText.leftMm - mainText.widthMm
    : mainText.leftMm - rail.leftMm - rail.widthMm;
  if (
    ![
      rail.leftMm,
      rail.widthMm,
      sideText.widthMm,
      mainText.leftMm,
      mainText.widthMm,
      gapMm,
    ].every(Number.isFinite) ||
    rail.leftMm < 0 ||
    mainText.leftMm < 0 ||
    gapMm <= 0 ||
    sideText.widthMm < 20 ||
    mainText.widthMm < 20 ||
    rail.leftMm + rail.widthMm > part.page.widthMm ||
    mainText.leftMm + mainText.widthMm > part.page.widthMm
  )
    throw Error("DOCX Next shared Sidebar leaves insufficient text space");

  const main: DocBlock[] = [],
    side: DocBlock[] = [],
    outside: DocBlock[] = [];
  for (const block of part.blocks) {
    if (block.id === "cv.firstPageLead") continue;
    if (block.kind === "decorative-shape") outside.push(block);
    else if (block.kind === "section")
      (block.placement === "side" ? side : main).push(block);
    else if (block.kind === "image") {
      if (block.placement === "free") {
        const { borderOutsetMm, heightMm } = imageZoneExtent(block);
        const xMm = sideRight
          ? part.page.widthMm - block.xMm - block.widthMm
          : block.xMm;
        // A free photo belongs to the complete rail or main area, not its text padding.
        const owner = [
          { blocks: side, leftMm: rail.leftMm, widthMm: rail.widthMm },
          { blocks: main, leftMm: mainText.leftMm, widthMm: mainText.widthMm },
        ].find(
          (area) =>
            xMm - borderOutsetMm >= area.leftMm - 0.001 &&
            xMm + block.widthMm + borderOutsetMm <=
              area.leftMm + area.widthMm + 0.001,
        );
        if (
          !owner ||
          block.coordinateOrigin !== "page" ||
          block.yMm - borderOutsetMm < 0 ||
          block.yMm + heightMm + borderOutsetMm > part.page.heightMm
        )
          throw Error(
            `DOCX Next free photo must fit one shared Sidebar area ${block.id}`,
          );
        owner.blocks.unshift({
          ...block,
          xMm,
          nativeOwner: "page-frame",
          sourceLayout: {
            xMm: block.xMm,
            yMm: block.yMm,
            widthMm: block.widthMm,
            minimumHeightMm: heightMm,
          },
        });
      } else {
        const target = block.placement === part.layout.side ? side : main;
        const widthMm =
          target === side && automaticSidePhotoWidthMm !== undefined
            ? automaticSidePhotoWidthMm
            : block.widthMm;
        if (
          widthMm + 2 * (block.frame?.borderWidthMm ?? 0) >
          (target === side ? sideText.widthMm : mainText.widthMm)
        )
          throw Error(
            `DOCX Next sidebar photo exceeds shared text area ${block.id}`,
          );
        target.unshift({
          ...block,
          widthMm,
          placement: "inline",
          align: "left",
          xMm: 0,
          yMm: 0,
          coordinateOrigin: "content",
        });
      }
    } else main.push(block);
  }
  // Retain the existing independent-story behavior: paragraphs can split naturally.
  for (const block of walkBlocks([...side, ...main])) {
    if (
      block.kind === "column-flow" ||
      block.kind === "parallel-flow" ||
      block.kind === "page-break" ||
      block.kind === "decorative-shape" ||
      ((block.kind === "section" || block.kind === "group") &&
        block.startPage === 2) ||
      (block.kind === "image" &&
        block.placement !== "inline" &&
        block.nativeOwner !== "page-frame")
    )
      throw Error(
        `DOCX Next unsupported shared Sidebar content ${block.id} (${block.kind})`,
      );
    if (block.kind === "entry") block.keepTogether = false;
  }

  // Use recurring cell padding for continuation starts and the existing first
  // cell-boundary paragraph for first-page-only lead. Never repeat that lead
  // as padding on every page of the continuous story.
  const bodyTopMm = Math.min(
    continuation.mainText.topMm,
    continuation.sideText.topMm,
    first.mainText.topMm,
    first.sideText.topMm,
  );
  const sidePaint: CellDecoration = {
    paddingXMm: 0,
    paddingYMm: 0,
    paddingLeftMm: rail.padding.left,
    paddingRightMm: rail.padding.right,
    paddingTopMm: continuation.sideText.topMm - bodyTopMm,
    paddingBottomMm: rail.padding.bottom,
  };
  const mainPaint: CellDecoration = {
    paddingXMm: 0,
    paddingYMm: 0,
    paddingTopMm: continuation.mainText.topMm - bodyTopMm,
  };
  const sideLeadMm = first.sideText.topMm - continuation.sideText.topMm;
  const mainLeadMm = first.mainText.topMm - continuation.mainText.topMm;
  if (Math.min(sideLeadMm, mainLeadMm) < 0)
    throw Error(
      "DOCX Next shared Sidebar needs a smaller first-page inset than continuation",
    );
  const leftMm = sideRight ? mainText.leftMm : rail.leftMm;
  const widths = sideRight
    ? [mainText.widthMm, gapMm, rail.widthMm]
    : [rail.widthMm, gapMm, mainText.widthMm];
  const widthMm = widths.reduce((sum, width) => sum + width, 0);
  part.page.margins.left = leftMm;
  part.page.margins.right = part.page.widthMm - leftMm - widthMm;
  part.page.margins.top = bodyTopMm;
  part.page.margins.bottom = first.mainText.bottomMm;
  part.layout.pagination = {
    firstTopMarginMm: first.mainText.topMm,
    continuationTopMarginMm: continuation.mainText.topMm,
    firstPageLeadMm: first.mainText.topMm - bodyTopMm,
  };
  const table: TableBlock = {
    kind: "table",
    id: "cv.sidebar",
    widths,
    columnWidthsMm: widths,
    columnRounding: "cumulative",
    bodyBoundary: "section-start",
    bodyBoundaryLeadByCellMm: sideRight
      ? [mainLeadMm, 0, sideLeadMm]
      : [sideLeadMm, 0, mainLeadMm],
    rows: [
      {
        keepTogether: false,
        cells: sideRight ? [main, [], side] : [side, [], main],
        cellDecorations: sideRight
          ? [mainPaint, { paddingXMm: 0, paddingYMm: 0 }, sidePaint]
          : [sidePaint, { paddingXMm: 0, paddingYMm: 0 }, mainPaint],
      },
    ],
  };
  if (opacity > 0) {
    const edgeMm = sideRight ? rail.leftMm : rail.leftMm + rail.widthMm;
    part.artwork.push(
      {
        kind: "decorative-artwork",
        id: "cv.artwork.sidebar-surface",
        semanticText: false,
        fill: { color: compositeTextColor(accent, paper, 0.08 * opacity) },
        xMm: rail.leftMm,
        yMm: 0,
        widthMm: rail.widthMm,
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
  part.blocks = [...outside, table];
}

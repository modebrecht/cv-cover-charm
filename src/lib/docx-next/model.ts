/** Word-independent document data. Units are millimetres and typographic points. */
import type { FontPolicyResult } from "./fonts";
import type { CvWordLayout } from "./layouts";
export type TextStyle = {
  font: string;
  sizePt: number;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  /** Formatting only: preserve the original editable text. */
  allCaps?: boolean;
  trackingPt?: number;
  /** Native editable run shading, used for Word-oriented heading badges. */
  backgroundColor?: string;
};
export type Alignment = "left" | "center" | "right" | "justify";
export const SEMANTIC_LIST_KINDS = ["bullet", "number", "dash", "plus", "dot"] as const;
export type TextRun = { id: string; fieldId?: string; text: string; style: TextStyle };
export type Paragraph = {
  kind: "paragraph";
  id: string;
  role: "body" | "title" | "heading" | "contact" | "caption";
  runs: TextRun[];
  align: Alignment;
  beforeMm: number;
  afterMm: number;
  lineHeight: number;
  keepNext: boolean;
  keepLines: boolean;
  list?: (typeof SEMANTIC_LIST_KINDS)[number];
  listGroupId?: string;
  ruleColor?: string;
  indentMm?: number;
  /** Unaccepted native run-level control placement; the whole paragraph remains intact. */
  controlPlacement?: "inline";
};
export type ImageBlock = {
  /** Authored alpha is retained; anything except full opacity currently blocks export. */
  opacity?: number;
  kind: "image";
  id: string;
  source: string;
  alt: string;
  widthMm: number;
  maxHeightMm: number;
  placement: "left" | "right" | "inline" | "free";
  align?: Alignment;
  xMm: number;
  yMm: number;
  gapMm: number;
  /** Framing is geometry; normalized pixels are reused independently. */
  frame?: {
    heightRatio: number;
    radiusMm: number;
    zoom: number;
    xPct: number;
    yPct: number;
    borderWidthMm: number;
    borderColor: string;
  };
  coordinateOrigin?: "content" | "page";
  sourceLayout?: ElementSourceLayout;
};
/** Unaccepted automatic-height native paragraph frame; diagnostic flow only. */
export type ParagraphFrameBlock = {
  kind: "paragraph-frame";
  id: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  paragraphs: Paragraph[];
};
/** An editable picture in a native flow zone; authored coordinates remain inspectable. */
export type ImageZoneBlock = {
  kind: "image-zone";
  id: string;
  image: ImageBlock;
  leftInsetMm: number;
  topInsetMm: number;
  sourceLayout: ElementSourceLayout;
};
export type SectionBlock = {
  kind: "section";
  id: string;
  heading?: Paragraph;
  blocks: DocBlock[];
  placement: "main" | "side";
  width: "full" | "half";
  startPage: 1 | 2;
  contentIndentMm?: number;
};
export type TableBlock = {
  kind: "table";
  id: string;
  /** Unaccepted native ID annotation on the existing first-cell ending; no added text/paragraph. */
  identityCarrier?: "cell-ending";
  widths: number[];
  /** Fixed millimetre tracks; null tracks share remaining width by weights. */
  columnWidthsMm?: (number | null)[];
  /** Guarded body-table serialization of shared column edges, conserving the whole width. */
  columnRounding?: "cumulative";
  rows: {
    cells: DocBlock[][];
    keepTogether: boolean;
    cellDecorations?: (CellDecoration | undefined)[];
    /** Semantic vertical cell spans; absent cells each occupy one row. */
    cellRowSpans?: number[];
    /** Unaccepted diagnostic cell-ending attachment; null preserves the native default. */
    cellEndKeepNext?: (boolean | null)[];
  }[];
  /** Flowing boxes keep width/padding, with no fixed height or text clipping. */
  widthMm?: number;
  indentMm?: number;
  /** Guarded body paragraph before a natural-flow table; no semantic text or fixed table height. */
  bodyBoundary?: "paragraph";
  /** Guarded native attachment of the real boundary paragraph to the following table. */
  bodyBoundaryKeepNext?: boolean;
  /** Guarded first-page inset on the one real body boundary; never repeated cell padding. */
  bodyBoundaryLeadMm?: number;
  /** Unaccepted diagnostic native floating table; physical page coordinates, no fixed height. */
  position?: {
    xMm: number;
    yMm: number;
    /** Guarded native body boundary before the floating owner; never semantic text. */
    leadingBoundary?: "paragraph";
    /** Diagnostic native logical anchor: the following whole semantic paragraph. */
    anchorParagraphId?: string;
    /** Diagnostic adjacent floating owner; import creates a separate native anchor. */
    nextFloatingTableId?: string;
  };
  sourceLayout?: ElementSourceLayout;
  decoration?: {
    fillColor?: string;
    borderColor: string;
    borderWidthMm: number;
    borderSides?: ("top" | "left" | "bottom" | "right")[];
    paddingXMm: number;
    paddingYMm: number;
  };
};
/** Native cell paint/padding. No user text or absolute page coordinates. */
export type CellDecoration = {
  fillColor?: string;
  paddingXMm: number;
  paddingYMm: number;
  /** Optional asymmetric native cell insets; absent retains symmetric padding. */
  paddingTopMm?: number;
  paddingBottomMm?: number;
  border?: { color: string; widthMm: number; side: "left" | "right" };
};
/** Editable tracks sharing natural Word pagination, with explicit row alignment. */
export type ParallelFlowBlock = {
  kind: "parallel-flow";
  id: string;
  gapMm: number;
  /** Absent: independent cells. Semantic: pair content groups in native rows. */
  rowAlignment?: "semantic";
  /** Native top inset owned by the first semantic row, never continuation rows. */
  leadingInsetMm?: number;
  /** Tracks occupying a continuous cell beside the semantic rows of other tracks. */
  spanningTracks?: number[];
  tracks: { weight: number; blocks: DocBlock[]; decoration?: CellDecoration }[];
};
/** Source geometry remains inspectable; semantic text/images use natural Word flow. */
export type ElementSourceLayout = {
  xMm: number;
  yMm: number;
  widthMm: number;
  minimumHeightMm?: number;
};
/** Nonsemantic shape assets. No text, SVG markup or package parts in the model. */
export type DecorativeShape = {
  /** Explicit background stacking independent of global DrawingML identity. */
  paintLayer?: number;
  /** Explicit page intersection; only visible nonsemantic paint is rasterized. */
  clipToPage?: boolean;
  repeat?: "first" | "continuation";
  kind: "decorative-shape";
  id: string;
  semanticText: false;
  shape: "rect" | "circle" | "line" | "path";
  path?: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  radiusMm: number;
  opacity: number;
  /** Clockwise top-left, top-right, bottom-right, bottom-left; nonsemantic rectangles only. */
  cornerRadiiMm?: readonly [number, number, number, number];
  fill?: {
    color: string;
    endColor?: string;
    angleDeg?: number;
    startPct?: number;
    endPct?: number;
    /** Ordered nonsemantic stops; authored percentages may extend beyond the painted box. */
    stops?: readonly { color: string; offsetPct: number }[];
    /** Circular, nonsemantic color-to-transparency bloom. */
    radialFade?: { innerPct: number; outerPct: number };
  };
  stroke: { color: string; widthMm: number };
};
export type DocBlock =
  | Paragraph
  | ImageBlock
  | ImageZoneBlock
  | SectionBlock
  | TableBlock
  | ParagraphFrameBlock
  | ParallelFlowBlock
  | DecorativeShape
  | { kind: "entry"; id: string; blocks: DocBlock[]; keepTogether?: boolean }
  | { kind: "group"; id: string; blocks: DocBlock[]; startPage?: 1 | 2 }
  | { kind: "columns"; id: string; columns: DocBlock[][]; widths: number[] }
  | { kind: "column-flow"; id: string; count: 2 | 3; gapMm: number; blocks: DocBlock[] }
  | { kind: "spacer"; id: string; heightMm: number }
  | {
      kind: "rule";
      /** Optional authored native border thickness; absent retains the existing half-point rule. */
      strokeWidthMm?: number;
      id: string;
      color: string;
      lengthMm: number;
      afterMm: number;
      keepNext: boolean;
      indentMm?: number;
    }
  | { kind: "page-break"; id: string };
export type PageMargins = { top: number; right: number; bottom: number; left: number };
/** Nonsemantic paint only. Geometry is page-relative; user text never enters an asset. */
export type DecorativeArtwork = {
  paintLayer?: number;
  repeat?: "first" | "continuation";
  kind: "decorative-artwork";
  id: string;
  semanticText: false;
  fill: { color: string; endColor?: string };
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
};
export type DocumentPart = {
  /** Optional native anchor order; absent retains original package serialization. */
  paintOrder?: "layer";
  /** Opt-in decorative composition; semantic text/pictures are never included. */
  pagePaintComposition?: "single-asset";
  id: "cover" | "letter" | "cv";
  blocks: DocBlock[];
  page: {
    widthMm: number;
    heightMm: number;
    margins: PageMargins;
    headerDistanceMm: number;
    footerDistanceMm: number;
  };
  artwork: DecorativeArtwork[];
  headerShapes?: DecorativeShape[];
  header: Paragraph[];
  firstHeader?: Paragraph[];
  footer: Paragraph[];
  /** Guarded first-page footer with independent native story identities. */
  firstFooter?: Paragraph[];
  chrome: {
    headerBackground?: string;
    footerBackground?: string;
    borderColor?: string;
    borderWidthMm: number;
  };
  layout: {
    mode: "classic" | "sidebar";
    variant?: CvWordLayout;
    side: "left" | "right";
    sidebarFraction: number;
    pagination?: {
      firstTopMarginMm: number;
      continuationTopMarginMm: number;
      firstPageLeadMm: number;
    };
  };
};
export type ModelIssue = { code: string; fieldId?: string; message: string };
export type DossierDocModel = {
  version: 1;
  /** Unaccepted document-wide native floating-table continuation policy; diagnostic only. */
  floatingTableTextFlow?: "all-pages";
  metadata: { title: string; author: string; subject: string; keywords: string };
  templateId: string;
  theme: { font: string; ink: string; accent: string; paper: string };
  fonts: FontPolicyResult;
  cover: DocumentPart;
  letter: DocumentPart;
  cv: DocumentPart;
  issues: ModelIssue[];
};
export function walkBlocks(blocks: DocBlock[]): DocBlock[] {
  return blocks.flatMap((block) => [
    block,
    ...(block.kind === "paragraph-frame"
      ? block.paragraphs
      : block.kind === "section"
        ? [...(block.heading ? [block.heading] : []), ...walkBlocks(block.blocks)]
        : block.kind === "entry" || block.kind === "group" || block.kind === "column-flow"
          ? walkBlocks(block.blocks)
          : block.kind === "columns"
            ? block.columns.flatMap(walkBlocks)
            : block.kind === "table"
              ? block.rows.flatMap((row) => row.cells.flatMap(walkBlocks))
              : block.kind === "parallel-flow"
                ? block.tracks.flatMap((track) => walkBlocks(track.blocks))
                : block.kind === "image-zone"
                  ? [block.image]
                  : []),
  ]);
}

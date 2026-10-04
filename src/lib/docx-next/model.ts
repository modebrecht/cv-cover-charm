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
};
export type ImageBlock = {
  kind: "image";
  id: string;
  source: string;
  alt: string;
  widthMm: number;
  maxHeightMm: number;
  placement: "left" | "right" | "inline" | "free";
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
  widths: number[];
  /** Fixed millimetre tracks; null tracks share remaining width by weights. */
  columnWidthsMm?: (number | null)[];
  rows: { cells: DocBlock[][]; keepTogether: boolean }[];
  /** Flowing boxes keep width/padding, with no fixed height or text clipping. */
  widthMm?: number;
  indentMm?: number;
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
/** Source geometry remains inspectable; semantic text/images use natural Word flow. */
export type ElementSourceLayout = {
  xMm: number;
  yMm: number;
  widthMm: number;
  minimumHeightMm?: number;
};
/** Nonsemantic shape assets. No text, SVG markup or package parts in the model. */
export type DecorativeShape = {
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
  fill?: {
    color: string;
    endColor?: string;
    angleDeg?: number;
    startPct?: number;
    endPct?: number;
  };
  stroke: { color: string; widthMm: number };
};
export type DocBlock =
  | Paragraph
  | ImageBlock
  | SectionBlock
  | TableBlock
  | DecorativeShape
  | { kind: "entry"; id: string; blocks: DocBlock[] }
  | { kind: "group"; id: string; blocks: DocBlock[]; startPage?: 1 | 2 }
  | { kind: "columns"; id: string; columns: DocBlock[][]; widths: number[] }
  | { kind: "column-flow"; id: string; count: 2 | 3; gapMm: number; blocks: DocBlock[] }
  | { kind: "spacer"; id: string; heightMm: number }
  | {
      kind: "rule";
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
  header: Paragraph[];
  firstHeader?: Paragraph[];
  footer: Paragraph[];
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
    ...(block.kind === "section"
      ? [...(block.heading ? [block.heading] : []), ...walkBlocks(block.blocks)]
      : block.kind === "entry" || block.kind === "group" || block.kind === "column-flow"
        ? walkBlocks(block.blocks)
        : block.kind === "columns"
          ? block.columns.flatMap(walkBlocks)
          : block.kind === "table"
            ? block.rows.flatMap((row) => row.cells.flatMap(walkBlocks))
            : []),
  ]);
}

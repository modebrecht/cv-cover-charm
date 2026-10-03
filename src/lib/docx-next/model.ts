/** Word-independent document data. Units are millimetres and typographic points. */
export type TextStyle = {
  font: string;
  sizePt: number;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
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
  ruleColor?: string;
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
};
export type SectionBlock = {
  kind: "section";
  id: string;
  heading?: Paragraph;
  blocks: DocBlock[];
  placement: "main" | "side";
  width: "full" | "half";
  startPage: 1 | 2;
};
export type TableBlock = {
  kind: "table";
  id: string;
  widths: number[];
  rows: { cells: DocBlock[][]; keepTogether: boolean }[];
};
export type DocBlock =
  | Paragraph
  | ImageBlock
  | SectionBlock
  | TableBlock
  | { kind: "entry"; id: string; blocks: DocBlock[] }
  | { kind: "group"; id: string; blocks: DocBlock[] }
  | { kind: "columns"; id: string; columns: DocBlock[][]; widths: number[] }
  | { kind: "column-flow"; id: string; count: 2 | 3; gapMm: number; blocks: DocBlock[] }
  | { kind: "spacer"; id: string; heightMm: number }
  | { kind: "page-break"; id: string };
export type PageMargins = { top: number; right: number; bottom: number; left: number };
export type DocumentPart = {
  id: "cover" | "letter" | "cv";
  blocks: DocBlock[];
  page: { widthMm: number; heightMm: number; margins: PageMargins };
  header: Paragraph[];
  firstHeader?: Paragraph[];
  footer: Paragraph[];
  chrome: {
    headerBackground?: string;
    footerBackground?: string;
    borderColor?: string;
    borderWidthMm: number;
  };
  layout: { mode: "classic" | "sidebar"; side: "left" | "right"; sidebarFraction: number };
};
export type ModelIssue = { code: string; fieldId?: string; message: string };
export type DossierDocModel = {
  version: 1;
  metadata: { title: string; author: string; subject: string; keywords: string };
  templateId: string;
  theme: { font: string; ink: string; accent: string; paper: string };
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

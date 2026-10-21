import type { DocBlock, Paragraph, TableBlock } from "./model";

/** Same conservative advance reservation as nativeTextHeightMm, not a font
 * measurement. Fixed native cells may wrap and grow with target-font metrics.
 */
export function nativeTextWidthMm(paragraph: Paragraph): number {
  let width = 0,
    line = 0;
  for (const run of paragraph.runs) {
    const tracking = run.style.trackingPt ?? 0;
    if (!Number.isFinite(tracking)) throw Error("DOCX Next invalid contact text tracking");
    const advance = Math.max(
      0,
      ((Math.max(10, run.style.sizePt) * 25.4) / 72) * 0.6 + (tracking * 25.4) / 72,
    );
    for (const character of run.text) {
      if (character === "\n") {
        width = Math.max(width, line);
        line = 0;
      } else line += advance;
    }
  }
  return Math.max(width, line);
}

/** Conservative authored-text reservation; no browser/PDF measurements. */
export function nativeTextHeightMm(
  paragraphs: Paragraph[],
  widthMm: number,
  lineMetricFactor = 1,
): number {
  return paragraphs.reduce((sum, p) => {
    const pt = Math.max(10, ...p.runs.map((run) => run.style.sizePt));
    const chars = Math.max(1, widthMm / (((pt * 25.4) / 72) * 0.6));
    const lines = p.runs
      .map((run) => run.text)
      .join("")
      .split("\n")
      .reduce((n, line) => n + Math.max(1, Math.ceil(line.length / chars)), 0);
    const height =
      p.minimumLineHeightPt === undefined
        ? ((lines * pt * 25.4) / 72) * p.lineHeight * lineMetricFactor
        : ((lines * p.minimumLineHeightPt * 25.4) / 72) * lineMetricFactor;
    return sum + p.beforeMm + p.afterMm + height;
  }, 0);
}

export type CvWordLayout = "classic" | "minimal" | "timeline" | "editorial" | "sidebar";
export type CvLayoutInput = CvWordLayout | "modern" | "executive";
export type CvFlowDefinition = {
  sectionGapMm?: number;
  headerGapMm: number;
  entryGapMm: number;
  indentMm: number;
  dateRail?: {
    textWidthMm: number;
    paddingXMm: number;
    axisWidthMm: number;
    contentGapMm?: number;
    allowSplit?: boolean;
  };
};

/** Shared Word compositions; no template IDs, XML or visible-text matching. */
export const CV_FLOW_LAYOUTS: Record<CvWordLayout, CvFlowDefinition> = {
  classic: { headerGapMm: 1.5, entryGapMm: 3, indentMm: 0 },
  sidebar: { headerGapMm: 4, entryGapMm: 3, indentMm: 0, sectionGapMm: 5 },
  minimal: { headerGapMm: 5.2, entryGapMm: 2.5, indentMm: 0, sectionGapMm: 5.2 },
  timeline: {
    headerGapMm: 1.5,
    entryGapMm: 2.9,
    indentMm: 11,
    dateRail: { textWidthMm: 23.5, paddingXMm: 1.5, axisWidthMm: 0.28 },
  },
  editorial: {
    headerGapMm: 7.5,
    entryGapMm: 3.1,
    indentMm: 0,
    sectionGapMm: 6.5,
    dateRail: { textWidthMm: 23.5, paddingXMm: 3.25, axisWidthMm: 0 },
  },
};

export function cvWordLayout(value: CvLayoutInput = "classic"): CvWordLayout {
  if (value === "modern" || value === "executive") return "sidebar";
  if (value === "sidebar" || Object.hasOwn(CV_FLOW_LAYOUTS, value)) return value;
  throw new Error(`DOCX Next unknown CV layout ${value}`);
}

/** Dates and content retain their field identities while becoming native cells. */
export function datedEntryBlocks(
  id: string,
  paragraphs: Paragraph[],
  layout: CvFlowDefinition,
  accent: string,
): DocBlock[] {
  const rail = layout.dateRail;
  const date = paragraphs.find((paragraph) => paragraph.id === `${id}.date`);
  const content = paragraphs.filter((paragraph) => paragraph !== date);
  if (!rail || !date || !content.length) return paragraphs;
  return [
    {
      kind: "table",
      id: `${id}.dateRail`,
      widths: [1, 1],
      columnWidthsMm: [rail.textWidthMm + rail.paddingXMm * 2, null],
      rows: [
        {
          cells: [
            [{ ...date, keepNext: false }],
            content.map((paragraph) => ({
              ...paragraph,
              ...(rail.contentGapMm
                ? { indentMm: (paragraph.indentMm ?? 0) + rail.contentGapMm }
                : {}),
            })),
          ],
          keepTogether: !rail.allowSplit,
        },
      ],
      decoration: {
        borderColor: accent,
        borderWidthMm: rail.axisWidthMm,
        borderSides: ["left"],
        paddingXMm: rail.paddingXMm,
        paddingYMm: 0,
      },
    },
  ];
}

/** Fixed tracks keep dates stable; remaining tracks share the usable width. */
export function tableColumnWidths(value: TableBlock, tableWidthMm: number): number[] {
  const fixed = value.columnWidthsMm ?? value.widths.map(() => null);
  const fixedTotal = fixed.reduce<number>((sum, width) => sum + (width ?? 0), 0);
  const flexibleWeight = value.widths.reduce(
    (sum, weight, index) => sum + (fixed[index] === null ? weight : 0),
    0,
  );
  const remaining = tableWidthMm - fixedTotal;
  if (
    remaining < -0.001 ||
    (flexibleWeight > 0 && remaining <= 0) ||
    (flexibleWeight === 0 && Math.abs(remaining) > 0.001)
  )
    throw new Error(`DOCX Next fixed columns exceed available width ${value.id}`);
  const widths = fixed.map(
    (width, index) => width ?? (remaining * value.widths[index]) / flexibleWeight,
  );
  const padding = (value.decoration?.paddingXMm ?? 2) * 2;
  if (
    value.columnWidthsMm &&
    widths.some(
      (width, index) =>
        !Number.isFinite(width) ||
        width <= 0 ||
        // Empty spacer tracks need no text width; populated tracks retain the existing gate.
        (width - padding < 10 && value.rows.some((row) => row.cells[index]?.length)),
    )
  )
    throw new Error(`DOCX Next fixed column leaves insufficient text width ${value.id}`);
  return widths;
}

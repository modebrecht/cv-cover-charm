import type { DocBlock, Paragraph, TableBlock } from "./model";

export type CvWordLayout = "classic" | "minimal" | "timeline" | "editorial" | "sidebar";
export type CvLayoutInput = CvWordLayout | "modern" | "executive";
export type CvFlowDefinition = {
  sectionGapMm?: number;
  headerGapMm: number;
  entryGapMm: number;
  indentMm: number;
  dateRail?: { textWidthMm: number; paddingXMm: number; axisWidthMm: number };
};

/** Shared Word compositions; no template IDs, XML or visible-text matching. */
export const CV_FLOW_LAYOUTS: Record<Exclude<CvWordLayout, "sidebar">, CvFlowDefinition> = {
  classic: { headerGapMm: 1.5, entryGapMm: 3, indentMm: 0 },
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
      rows: [{ cells: [[{ ...date, keepNext: false }], content], keepTogether: true }],
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
  if (value.columnWidthsMm && widths.some((width) => width - padding < 10))
    throw new Error(`DOCX Next fixed column leaves insufficient text width ${value.id}`);
  return widths;
}

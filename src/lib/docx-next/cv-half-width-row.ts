import type { DocBlock, TableBlock } from "./model";

export function halfWidthRubricRow(
  id: string,
  left: DocBlock[],
  right: DocBlock[],
  indentMm = 0,
): TableBlock {
  return {
    kind: "table",
    id,
    widths: [1, 1, 1],
    columnWidthsMm: [null, 6, null],
    indentMm,
    rows: [{ cells: [left, [], right], keepTogether: false }],
    decoration: { borderColor: "FFFFFF", borderWidthMm: 0, paddingXMm: 0, paddingYMm: 0 },
  };
}

import type { CellDecoration, TableBlock } from "./model";
import { twips } from "./xml";

/** Resolve declared spans before XML. Continuations must be empty, never hidden text. */
export function planCellRowSpans(value: TableBlock): ("restart" | "continue" | undefined)[][] {
  const ends: number[] = [];
  return value.rows.map((row, rowIndex) => {
    if (row.cellRowSpans && row.cellRowSpans.length !== row.cells.length)
      throw new Error(`DOCX Next invalid cell row span count ${value.id}`);
    return row.cells.map((cell, column) => {
      const span = row.cellRowSpans?.[column] ?? 1;
      if (!Number.isInteger(span) || span < 1 || rowIndex + span > value.rows.length)
        throw new Error(`DOCX Next invalid cell row span ${value.id}`);
      if ((ends[column] ?? -1) >= rowIndex) {
        if (cell.length || span > 1)
          throw new Error(`DOCX Next overlapping cell row span ${value.id}`);
        return "continue";
      }
      if (span > 1) {
        ends[column] = rowIndex + span - 1;
        return "restart";
      }
      return undefined;
    });
  });
}

/** Native tcPr children in schema order; independent of templates and visible text. */
export function cellProperties(value: CellDecoration): string {
  const border = value.border
    ? `<w:tcBorders><w:${value.border.side} w:val="single" w:sz="${Math.min(96, Math.max(2, Math.round(((value.border.widthMm * 72) / 25.4) * 8)))}" w:color="${value.border.color}"/></w:tcBorders>`
    : "";
  const shading = value.fillColor
    ? `<w:shd w:val="clear" w:color="auto" w:fill="${value.fillColor}"/>`
    : "";
  return `${border}${shading}<w:tcMar><w:top w:w="${twips(value.paddingTopMm ?? value.paddingYMm)}" w:type="dxa"/><w:left w:w="${twips(value.paddingXMm)}" w:type="dxa"/><w:bottom w:w="${twips(value.paddingBottomMm ?? value.paddingYMm)}" w:type="dxa"/><w:right w:w="${twips(value.paddingXMm)}" w:type="dxa"/></w:tcMar>`;
}

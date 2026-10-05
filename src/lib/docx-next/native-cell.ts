import type { CellDecoration } from "./model";
import { twips } from "./xml";

/** Native tcPr children in schema order; independent of templates and visible text. */
export function cellProperties(value: CellDecoration): string {
  const border = value.border
    ? `<w:tcBorders><w:${value.border.side} w:val="single" w:sz="${Math.min(96, Math.max(2, Math.round(((value.border.widthMm * 72) / 25.4) * 8)))}" w:color="${value.border.color}"/></w:tcBorders>`
    : "";
  const shading = value.fillColor
    ? `<w:shd w:val="clear" w:color="auto" w:fill="${value.fillColor}"/>`
    : "";
  return `${border}${shading}<w:tcMar><w:top w:w="${twips(value.paddingYMm)}" w:type="dxa"/><w:left w:w="${twips(value.paddingXMm)}" w:type="dxa"/><w:bottom w:w="${twips(value.paddingYMm)}" w:type="dxa"/><w:right w:w="${twips(value.paddingXMm)}" w:type="dxa"/></w:tcMar>`;
}

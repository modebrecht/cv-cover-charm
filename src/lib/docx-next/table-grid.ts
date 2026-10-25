import { twips } from "./xml";

/** Round each shared edge once; adjacent columns cannot lose or invent a twip. */
export function cumulativeColumnTwips(widthsMm: number[], totalMm: number): number[] {
  if (
    !widthsMm.length ||
    !Number.isFinite(totalMm) ||
    totalMm <= 0 ||
    widthsMm.some((width) => !Number.isFinite(width) || width <= 0) ||
    Math.abs(widthsMm.reduce((sum, width) => sum + width, 0) - totalMm) > 0.001
  )
    throw new Error("DOCX Next invalid cumulative table grid");
  let cumulativeMm = 0,
    previousEdge = 0;
  return widthsMm.map((width, index) => {
    cumulativeMm += width;
    const edge = twips(index === widthsMm.length - 1 ? totalMm : cumulativeMm);
    const roundedWidth = edge - previousEdge;
    if (roundedWidth <= 0) throw new Error("DOCX Next collapsed cumulative table column");
    previousEdge = edge;
    return roundedWidth;
  });
}

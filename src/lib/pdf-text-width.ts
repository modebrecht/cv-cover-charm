import type { jsPDF as JsPdf } from "jspdf";

/** Fit an invisible PDF run to its measured browser advance. */
export function fittedPdfHorizontalScale(pdf: JsPdf, text: string, targetWidthMm: number): number {
  const renderedWidthMm = pdf.getTextWidth(text);
  if (
    !Number.isFinite(renderedWidthMm) ||
    renderedWidthMm <= 0 ||
    !Number.isFinite(targetWidthMm) ||
    targetWidthMm <= 0
  )
    return 1;
  return Math.max(0.1, Math.min(10, targetWidthMm / renderedWidthMm));
}

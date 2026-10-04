import type { DecorativeArtwork, DecorativeShape, DocumentPart } from "./model";
export function artworkApplies(value: Pick<DecorativeArtwork, "repeat">, first: boolean): boolean {
  return value.repeat === undefined || value.repeat === (first ? "first" : "continuation");
}
/** Pure page intersection of paint; semantic pictures use independent native crop. */
export function decorationPageGeometry(shape: DecorativeShape, page: DocumentPart["page"]) {
  const xMm = Math.max(0, shape.xMm),
    yMm = Math.max(0, shape.yMm);
  const right = Math.min(page.widthMm, shape.xMm + shape.widthMm),
    bottom = Math.min(page.heightMm, shape.yMm + shape.heightMm);
  if (right <= xMm || bottom <= yMm)
    throw new Error(`DOCX Next decoration has no page intersection ${shape.id}`);
  if (
    !shape.clipToPage &&
    (xMm !== shape.xMm ||
      yMm !== shape.yMm ||
      right !== shape.xMm + shape.widthMm ||
      bottom !== shape.yMm + shape.heightMm)
  )
    throw new Error(`DOCX Next decoration outside page ${shape.id}`);
  const percent = (length: number, full: number) => Math.round((length / full) * 100000);
  return {
    xMm,
    yMm,
    widthMm: right - xMm,
    heightMm: bottom - yMm,
    crop: {
      left: percent(xMm - shape.xMm, shape.widthMm),
      top: percent(yMm - shape.yMm, shape.heightMm),
      right: percent(shape.xMm + shape.widthMm - right, shape.widthMm),
      bottom: percent(shape.yMm + shape.heightMm - bottom, shape.heightMm),
    },
  };
}
/** Distinct first-page paint may accompany identical editable chrome content. */
export function ensureFirstHeader(part: DocumentPart): void {
  if (part.firstHeader) return;
  part.firstHeader = part.header.map((p) => ({
    ...p,
    id: `${p.id}.first`,
    runs: p.runs.map((run) => ({ ...run, id: `${run.id}.first` })),
  }));
}

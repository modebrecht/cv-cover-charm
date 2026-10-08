import type { DecorativeArtwork, DecorativeShape, DocumentPart } from "./model";
import type { DecorationPaint } from "./decoration";
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

/** Native importers must see anchors in the same order as their declared paint layers. */
export function orderedPagePaint(
  part: DocumentPart,
  first: boolean,
): (DecorativeArtwork | DecorativeShape)[] {
  const paint = [...part.artwork, ...(part.headerShapes ?? [])].filter((value) =>
    artworkApplies(value, first),
  );
  if (part.paintOrder === undefined) return paint;
  if (part.paintOrder !== "layer") throw new Error("DOCX Next unsupported page paint ordering");
  // Authored chrome without a layer remains above descriptor background paint.
  const top = Math.max(0, ...paint.map((value) => value.paintLayer ?? 0));
  if (paint.some((value) => value.paintLayer === undefined) && top + paint.length > 0x7fffffff)
    throw new Error("DOCX Next page paint ordering exceeds native layer range");
  return paint
    .map((value, index) => ({ ...value, paintLayer: value.paintLayer ?? top + index + 1 }))
    .sort((a, b) => a.paintLayer - b.paintLayer);
}

/** Flatten only decorative geometry, avoiding importer ordering between independent page anchors. */
export function compositePagePaint(
  part: DocumentPart,
  first: boolean,
): DecorationPaint | undefined {
  const values = orderedPagePaint(part, first);
  if (!values.length) return;
  const layers = values.map(
    (value): DecorativeShape =>
      value.kind === "decorative-artwork"
        ? {
            kind: "decorative-shape",
            id: value.id,
            semanticText: false,
            shape: "rect",
            xMm: value.xMm,
            yMm: value.yMm,
            widthMm: value.widthMm,
            heightMm: value.heightMm,
            radiusMm: 0,
            opacity: 1,
            fill: { ...value.fill, ...(value.fill.endColor ? { angleDeg: 180 } : {}) },
            stroke: { color: "000000", widthMm: 0 },
          }
        : { ...value, paintLayer: undefined },
  );
  return {
    kind: "decorative-shape",
    id: `${part.id}.page-paint.${first ? "first" : "continuation"}`,
    semanticText: false,
    shape: "rect",
    xMm: 0,
    yMm: 0,
    widthMm: part.page.widthMm,
    heightMm: part.page.heightMm,
    radiusMm: 0,
    opacity: 1,
    stroke: { color: "000000", widthMm: 0 },
    layers,
  };
}

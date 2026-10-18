import type { DocBlock, DocumentPart, Paragraph, TableBlock } from "./model";

/** Keep the line-anchored paint and native heading at the same origin. Word's
 * line reference in the returned PDF omits the collapsed before-spacing while
 * heading ink includes it. Preserve max(before, previous after), owned once by
 * the preceding real paragraph (or already-required table-ending paragraph).
 * No page coordinates, extra spacers, textboxes or new pagination are needed. */
export function ownFlowSurfaceSpacing(
  part: DocumentPart,
  options: { readingColumns?: boolean } = {},
) {
  if (part.id !== "cv") throw Error("DOCX Next: Rubrik-Abstände gehören zum CV.");
  let previous: Paragraph | TableBlock | undefined;
  let origin: ((gap: number) => void) | undefined;
  let pageTwoStarted = false;
  let count = 0;
  const visit = (block: DocBlock) => {
    if (
      options.readingColumns &&
      (block.kind === "section" || block.kind === "group") &&
      block.startPage === 2 &&
      !pageTwoStarted
    ) {
      previous = undefined;
      origin = () => {}; // Native page starts have no preceding flow paragraph.
      pageTwoStarted = true;
    }
    if (block.kind === "section") {
      if (block.width !== "full" || (!options.readingColumns && block.startPage !== 1))
        throw Error(
          "DOCX Next: Rubrik-Abstandstest benötigt volle, fliessende Rubriken auf Seite 1.",
        );
      if (block.heading) visit(block.heading);
      block.blocks.forEach(visit);
    } else if (block.kind === "group" || (block.kind === "entry" && !block.keepTogether)) {
      block.blocks.forEach(visit);
    } else if (block.kind === "paragraph") {
      if (block.flowSurface) {
        if (!previous && origin) {
          // At the first real paragraph of a cell, its native top inset owns
          // the capsule clearance. There is no inserted spacer or text box.
          origin(block.beforeMm + block.flowSurface.paddingYMm);
          block.beforeMm = 0;
          block.flowSurface.spacingOwner = "origin";
          count++;
        } else {
          if (!previous || (previous.kind === "table" && previous.position))
            throw Error("DOCX Next: Rubrik-Vorabstand hat keinen unterstützten Vorgänger.");
          const currentAfter =
            (previous.afterMm ?? 0) +
            (previous.kind === "paragraph" ? (previous.flowSurface?.paddingYMm ?? 0) : 0);
          const gap = Math.max(currentAfter, block.beforeMm + block.flowSurface.paddingYMm);
          previous.afterMm =
            gap - (previous.kind === "paragraph" ? (previous.flowSurface?.paddingYMm ?? 0) : 0);
          block.beforeMm = 0;
          block.flowSurface.spacingOwner = "previous-block";
          count++;
        }
      }
      previous = block;
      origin = undefined;
    } else if (block.kind === "table") {
      if (options.readingColumns) {
        const outerPrevious = previous,
          outerOrigin = origin;
        for (const row of block.rows)
          for (const [index, cell] of row.cells.entries()) {
            previous = undefined;
            origin = (gap) => {
              const paint = row.cellDecorations?.[index] ?? {
                paddingXMm: block.decoration?.paddingXMm ?? 2,
                paddingYMm: block.decoration?.paddingYMm ?? 0,
                ...(block.decoration?.fillColor ? { fillColor: block.decoration.fillColor } : {}),
              };
              row.cellDecorations ??= row.cells.map(() => undefined);
              row.cellDecorations[index] = {
                ...paint,
                paddingTopMm: Math.max(paint.paddingTopMm ?? paint.paddingYMm, gap),
              };
            };
            cell.forEach(visit);
          }
        previous = outerPrevious;
        origin = outerOrigin;
      }
      previous = block;
    } else previous = undefined;
  };
  part.blocks.forEach(visit);
  if (!count) throw Error("DOCX Next: Rubrik-Abstandstest benötigt gemessene Rubrik-Pills.");
}

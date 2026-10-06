import {
  walkBlocks,
  type CellDecoration,
  type DocBlock,
  type ParallelFlowBlock,
  type TableBlock,
} from "./model";
import { semanticFlowUnits } from "./semantic-flow-units";
import { imageZoneTable } from "./image-zone";

export function validateCellDecoration(value: CellDecoration, id: string): void {
  if (
    ![
      value.paddingXMm,
      value.paddingYMm,
      value.paddingTopMm ?? 0,
      value.paddingBottomMm ?? 0,
    ].every(Number.isFinite) ||
    Math.min(
      value.paddingXMm,
      value.paddingYMm,
      value.paddingTopMm ?? 0,
      value.paddingBottomMm ?? 0,
    ) < 0 ||
    (value.fillColor !== undefined && !/^[0-9A-F]{6}$/.test(value.fillColor)) ||
    (value.border &&
      (!/^[0-9A-F]{6}$/.test(value.border.color) ||
        !Number.isFinite(value.border.widthMm) ||
        value.border.widthMm <= 0 ||
        value.border.widthMm > 6 ||
        !["left", "right"].includes(value.border.side)))
  )
    throw new Error(`DOCX Next invalid cell decoration ${id}`);
}

/** Lower explicit track composition without measuring or reconstructing pages. */
export function parallelFlowTable(value: ParallelFlowBlock, widthMm: number): TableBlock {
  if (
    value.tracks.length < 2 ||
    (value.rowAlignment !== undefined && value.rowAlignment !== "semantic") ||
    (value.leadingInsetMm !== undefined &&
      (value.rowAlignment !== "semantic" ||
        !Number.isFinite(value.leadingInsetMm) ||
        value.leadingInsetMm < 0)) ||
    (value.spanningTracks !== undefined &&
      (value.rowAlignment !== "semantic" ||
        value.spanningTracks.length >= value.tracks.length ||
        new Set(value.spanningTracks).size !== value.spanningTracks.length ||
        value.spanningTracks.some(
          (index) => !Number.isInteger(index) || index < 0 || index >= value.tracks.length,
        ))) ||
    !Number.isFinite(value.gapMm) ||
    value.gapMm < 0 ||
    value.tracks.some((track) => !Number.isFinite(track.weight) || track.weight <= 0)
  )
    throw new Error(`DOCX Next invalid parallel flow ${value.id}`);
  const available = widthMm - value.gapMm * (value.tracks.length - 1);
  const totalWeight = value.tracks.reduce((sum, track) => sum + track.weight, 0);
  const widths: number[] = [],
    cells: TableBlock["rows"][number]["cells"] = [];
  const cellDecorations: NonNullable<TableBlock["rows"][number]["cellDecorations"]> = [];
  const spanningCells = new Set<number>();
  value.tracks.forEach((track, index) => {
    if (track.decoration) validateCellDecoration(track.decoration, value.id);
    const width = (available * track.weight) / totalWeight;
    if (width - 2 * (track.decoration?.paddingXMm ?? 0) < 20)
      throw new Error(`DOCX Next parallel track leaves insufficient text width ${value.id}`);
    for (const block of walkBlocks(track.blocks)) {
      // A preceding picture row with a later vertical span leaves large empty
      // body regions in LibreOffice. Do not export that known counterexample.
      if (block.kind === "image" && value.spanningTracks?.some((span) => span > index))
        throw new Error(`DOCX Next picture before a spanning track is unsupported ${block.id}`);
      if (block.kind === "image-zone")
        imageZoneTable(block, width - 2 * (track.decoration?.paddingXMm ?? 0));
      if (
        value.spanningTracks?.includes(index) &&
        ((block.kind === "entry" && block.keepTogether) ||
          (block.kind === "table" && block.rows.some((row) => row.keepTogether)))
      )
        throw new Error(`DOCX Next spanning track cannot contain atomic groups ${block.id}`);
      if (
        block.kind === "column-flow" ||
        block.kind === "parallel-flow" ||
        block.kind === "page-break" ||
        block.kind === "decorative-shape" ||
        ((block.kind === "section" || block.kind === "group") && block.startPage === 2) ||
        (block.kind === "image" && block.placement !== "inline")
      )
        throw new Error(`DOCX Next unsupported parallel-flow content ${block.id} (${block.kind})`);
    }
    if (index && value.gapMm) {
      widths.push(value.gapMm);
      cells.push([]);
      cellDecorations.push({ paddingXMm: 0, paddingYMm: 0 });
    }
    widths.push(width);
    if (value.spanningTracks?.includes(index)) spanningCells.add(cells.length);
    cells.push(track.blocks);
    cellDecorations.push(track.decoration ?? { paddingXMm: 0, paddingYMm: 0 });
  });
  const rows: TableBlock["rows"] = [{ cells, keepTogether: false, cellDecorations }];
  if (value.rowAlignment === "semantic") {
    const units = cells.map((blocks, index) =>
      spanningCells.has(index) ? [] : semanticFlowUnits(blocks),
    );
    const count = Math.max(1, ...units.map((track) => track.length));
    rows.splice(
      0,
      1,
      ...Array.from({ length: count }, (_, index) => ({
        cells: units.map((track, cell): DocBlock[] =>
          spanningCells.has(cell) ? (index === 0 ? cells[cell] : []) : (track[index] ?? []),
        ),
        ...(spanningCells.size
          ? {
              cellRowSpans: cells.map((_, cell) =>
                index === 0 && spanningCells.has(cell) ? count : 1,
              ),
            }
          : {}),
        keepTogether: true,
        cellDecorations: cellDecorations.map((decoration) => {
          const paint = decoration ?? { paddingXMm: 0, paddingYMm: 0 };
          return {
            ...paint,
            paddingTopMm:
              index === 0
                ? (paint.paddingTopMm ?? paint.paddingYMm) + (value.leadingInsetMm ?? 0)
                : 0,
            paddingBottomMm: index === count - 1 ? (paint.paddingBottomMm ?? paint.paddingYMm) : 0,
          };
        }),
      })),
    );
  }
  return {
    kind: "table",
    id: value.id,
    widths,
    rows,
  };
}

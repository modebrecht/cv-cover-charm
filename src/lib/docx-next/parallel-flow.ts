import { walkBlocks, type CellDecoration, type ParallelFlowBlock, type TableBlock } from "./model";

export function validateCellDecoration(value: CellDecoration, id: string): void {
  if (
    ![value.paddingXMm, value.paddingYMm].every(Number.isFinite) ||
    Math.min(value.paddingXMm, value.paddingYMm) < 0 ||
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

/** Lower semantic parallel flow to a splittable native row, without measuring pages. */
export function parallelFlowTable(value: ParallelFlowBlock, widthMm: number): TableBlock {
  if (
    value.tracks.length < 2 ||
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
  value.tracks.forEach((track, index) => {
    if (track.decoration) validateCellDecoration(track.decoration, value.id);
    const width = (available * track.weight) / totalWeight;
    if (width - 2 * (track.decoration?.paddingXMm ?? 0) < 20)
      throw new Error(`DOCX Next parallel track leaves insufficient text width ${value.id}`);
    for (const block of walkBlocks(track.blocks)) {
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
    cells.push(track.blocks);
    cellDecorations.push(track.decoration ?? { paddingXMm: 0, paddingYMm: 0 });
  });
  return {
    kind: "table",
    id: value.id,
    widths,
    rows: [{ cells, keepTogether: false, cellDecorations }],
  };
}

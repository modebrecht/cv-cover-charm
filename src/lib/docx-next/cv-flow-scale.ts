import type { CellDecoration, DocBlock, DocumentPart, Paragraph, TableBlock } from "./model";
import { tableColumnWidths } from "./layouts";

/** Convert the captured CSS document scale to physical Word units exactly once.
 * Page-owned geometry and the available paper width are independent of this scale.
 */
export function scaleCvReadingFlow(part: DocumentPart, scale: number): DocBlock[] {
  if (part.id !== "cv" || part.layout.mode !== "classic")
    throw Error("DOCX Next: Document scale requires classic CV reading flow.");
  if (!Number.isFinite(scale) || scale < 0.5 || scale > 2)
    throw Error("DOCX Next: Unsupported CV document scale.");
  if (scale === 1) return part.blocks;
  const cellPaint = (value: CellDecoration): CellDecoration => ({
    ...value,
    paddingXMm: value.paddingXMm * scale,
    paddingYMm: value.paddingYMm * scale,
    ...(value.paddingTopMm === undefined ? {} : { paddingTopMm: value.paddingTopMm * scale }),
    ...(value.paddingBottomMm === undefined
      ? {}
      : { paddingBottomMm: value.paddingBottomMm * scale }),
    ...(value.border ? { border: { ...value.border, widthMm: value.border.widthMm * scale } } : {}),
  });
  function paragraph(p: Paragraph, oldWidth: number, newWidth: number): Paragraph {
    const surface = p.flowSurface;
    const rowWidth = surface
      ? surface.rowWidthMm + newWidth - oldWidth + (p.indentMm ?? 0) * (1 - scale)
      : 0;
    if (surface && rowWidth + 0.001 < surface.widthMm * scale)
      throw Error(`DOCX Next: Scaled CV heading exceeds its flow width (${p.id}).`);
    return {
      ...p,
      runs: p.runs.map((run) => ({
        ...run,
        style: {
          ...run.style,
          sizePt: run.style.sizePt * scale,
          ...(run.style.trackingPt === undefined
            ? {}
            : { trackingPt: run.style.trackingPt * scale }),
        },
      })),
      beforeMm: p.beforeMm * scale,
      afterMm: p.afterMm * scale,
      ...(p.minimumLineHeightPt === undefined
        ? {}
        : { minimumLineHeightPt: p.minimumLineHeightPt * scale }),
      ...(p.indentMm === undefined ? {} : { indentMm: p.indentMm * scale }),
      ...(p.tabStopsMm ? { tabStopsMm: p.tabStopsMm.map((value) => value * scale) } : {}),
      ...(surface
        ? {
            flowSurface: {
              ...surface,
              widthMm: surface.widthMm * scale,
              rowWidthMm: rowWidth,
              heightMm: surface.heightMm * scale,
              paddingXMm: surface.paddingXMm * scale,
              paddingYMm: surface.paddingYMm * scale,
              outlineMm: surface.outlineMm * scale,
              ...(surface.rule
                ? {
                    rule: {
                      ...surface.rule,
                      gapMm: surface.rule.gapMm * scale,
                      heightMm: surface.rule.heightMm * scale,
                    },
                  }
                : {}),
            },
          }
        : {}),
    };
  }
  function table(value: TableBlock, oldAvailable: number, newAvailable: number): TableBlock {
    if (value.position)
      throw Error(`DOCX Next: Positioned table is not CV reading flow (${value.id}).`);
    const oldWidth = value.widthMm ?? oldAvailable - (value.indentMm ?? 0);
    const newWidth =
      value.widthMm === undefined
        ? newAvailable - (value.indentMm ?? 0) * scale
        : value.widthMm * scale;
    const decoration = value.decoration ?? {
      borderColor: "000000",
      borderWidthMm: 0,
      paddingXMm: 2,
      paddingYMm: 0,
    };
    const next: TableBlock = {
      ...value,
      ...(value.widthMm === undefined ? {} : { widthMm: newWidth }),
      ...(value.indentMm === undefined ? {} : { indentMm: value.indentMm * scale }),
      ...(value.afterMm === undefined ? {} : { afterMm: value.afterMm * scale }),
      ...(value.bodyBoundaryLeadMm === undefined
        ? {}
        : { bodyBoundaryLeadMm: value.bodyBoundaryLeadMm * scale }),
      ...(value.columnWidthsMm
        ? { columnWidthsMm: value.columnWidthsMm.map((v) => (v === null ? null : v * scale)) }
        : {}),
      decoration: {
        ...decoration,
        borderWidthMm: decoration.borderWidthMm * scale,
        paddingXMm: decoration.paddingXMm * scale,
        paddingYMm: decoration.paddingYMm * scale,
      },
      rows: [],
    };
    const oldColumns = tableColumnWidths(value, oldWidth),
      newColumns = tableColumnWidths(next, newWidth);
    next.rows = value.rows.map((row) => ({
      ...row,
      ...(row.cellDecorations
        ? { cellDecorations: row.cellDecorations.map((p) => (p ? cellPaint(p) : undefined)) }
        : {}),
      cells: row.cells.map((blocks, index) => {
        const padding = row.cellDecorations?.[index]?.paddingXMm ?? decoration.paddingXMm;
        return blocks.map((block) =>
          visit(block, oldColumns[index] - 2 * padding, newColumns[index] - 2 * padding * scale),
        );
      }),
    }));
    return next;
  }
  function visit(block: DocBlock, oldWidth: number, newWidth: number): DocBlock {
    switch (block.kind) {
      case "paragraph":
        return paragraph(block, oldWidth, newWidth);
      case "section": {
        const indent = block.contentIndentMm ?? 0;
        return {
          ...block,
          ...(block.contentIndentMm === undefined ? {} : { contentIndentMm: indent * scale }),
          ...(block.heading ? { heading: paragraph(block.heading, oldWidth, newWidth) } : {}),
          blocks: block.blocks.map((b) => visit(b, oldWidth - indent, newWidth - indent * scale)),
        };
      }
      case "entry":
      case "group":
        return { ...block, blocks: block.blocks.map((b) => visit(b, oldWidth, newWidth)) };
      case "table":
        return table(block, oldWidth, newWidth);
      case "spacer":
        return { ...block, heightMm: block.heightMm * scale };
      case "rule":
        return {
          ...block,
          lengthMm: block.lengthMm * scale,
          afterMm: block.afterMm * scale,
          ...(block.indentMm === undefined ? {} : { indentMm: block.indentMm * scale }),
          ...(block.strokeWidthMm === undefined
            ? {}
            : { strokeWidthMm: block.strokeWidthMm * scale }),
        };
      case "page-break":
      case "image":
      case "decorative-shape":
      case "paragraph-frame":
        return block;
      case "columns":
      case "column-flow":
      case "parallel-flow":
      case "image-zone":
        throw Error(`DOCX Next: Unsupported scaled CV flow owner (${block.id}).`);
    }
  }
  const width = part.page.widthMm - part.page.margins.left - part.page.margins.right;
  return part.blocks.map((block) => visit(block, width, width));
}

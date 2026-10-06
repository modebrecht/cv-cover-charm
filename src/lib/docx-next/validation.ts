import { walkBlocks, type DossierDocModel } from "./model";
import type { WordPackage } from "./package";
import { validateDecoration } from "./decoration";
import { fontDefinition } from "./fonts";
import { decorationPageGeometry } from "./page-artwork";
import { parallelFlowTable, validateCellDecoration } from "./parallel-flow";
import { planCellRowSpans } from "./native-cell";
import { imageZoneTable } from "./image-zone";

/** Validate known semantic structures and package parts, never visible text occurrence. */
export function validateWordPackage(pkg: WordPackage, model: DossierDocModel): void {
  for (const path of [
    "word/document.xml",
    "word/styles.xml",
    "word/settings.xml",
    "word/fontTable.xml",
    "word/numbering.xml",
    "docProps/core.xml",
  ])
    if (!pkg.parts.has(path)) throw new Error(`DOCX Next missing required part ${path}`);
  for (const rel of pkg.relationships) {
    if (rel.source && !pkg.parts.has(rel.source))
      throw new Error(`DOCX Next relationship source missing ${rel.source}`);
    const base = rel.source.slice(0, rel.source.lastIndexOf("/") + 1);
    if (!pkg.parts.has(base + rel.target))
      throw new Error(`DOCX Next relationship target missing ${base + rel.target}`);
  }
  validateDossierDocModel(model);
}
export function validateDossierDocModel(model: DossierDocModel): void {
  fontDefinition(model.theme.font);
  if (model.fonts.embedding !== "disabled")
    throw new Error("DOCX Next unsupported font embedding policy");
  const ids = new Set<string>();
  for (const part of [model.cover, model.letter, model.cv]) {
    if (
      part.blocks.some((block) =>
        walkBlocks([block]).some(
          (child) => child.kind === "parallel-flow" && child.rowAlignment !== "semantic",
        ),
      ) &&
      (part.header.length > 0 || part.firstHeader !== undefined)
    )
      throw new Error(
        `DOCX Next parallel flow with running headers is unsupported: ${part.id}; native pagination acceptance is pending`,
      );
    if (
      part.layout.mode === "sidebar" &&
      !part.blocks.some((block) => block.kind === "parallel-flow")
    )
      throw new Error(`DOCX Next sidebar requires native parallel flow: ${part.id}`);
    const margins = part.page.margins;
    if (
      [...part.artwork, ...(part.headerShapes ?? [])].some((value) => value.repeat) &&
      !part.firstHeader
    )
      throw new Error(`DOCX Next scoped artwork needs an explicit first header ${part.id}`);
    if (
      ![
        ...Object.values(margins),
        part.page.widthMm,
        part.page.heightMm,
        part.page.headerDistanceMm,
        part.page.footerDistanceMm,
      ].every(Number.isFinite)
    )
      throw new Error("DOCX Next invalid page geometry");
    if (
      Math.min(...Object.values(margins)) < 0 ||
      part.page.widthMm - margins.left - margins.right < 30 ||
      part.page.heightMm - margins.top - margins.bottom < 30
    )
      throw new Error("DOCX Next page has no usable content area");
    if (
      Math.min(part.page.headerDistanceMm, part.page.footerDistanceMm) < 0 ||
      Math.max(part.page.headerDistanceMm, part.page.footerDistanceMm) >= part.page.heightMm
    )
      throw new Error("DOCX Next invalid chrome geometry");
    for (const artwork of part.artwork) {
      if (ids.has(artwork.id))
        throw new Error(`DOCX Next duplicate semantic identity ${artwork.id}`);
      ids.add(artwork.id);
      if (
        artwork.semanticText !== false ||
        (artwork.repeat !== undefined && !["first", "continuation"].includes(artwork.repeat)) ||
        ![artwork.xMm, artwork.yMm, artwork.widthMm, artwork.heightMm].every(Number.isFinite) ||
        Math.min(artwork.xMm, artwork.yMm) < 0 ||
        Math.min(artwork.widthMm, artwork.heightMm) <= 0 ||
        artwork.xMm + artwork.widthMm > part.page.widthMm ||
        artwork.yMm + artwork.heightMm > part.page.heightMm ||
        ![artwork.fill.color, artwork.fill.endColor ?? artwork.fill.color].every((value) =>
          /^[0-9A-F]{6}$/.test(value),
        )
      )
        throw new Error(`DOCX Next invalid artwork ${artwork.id}`);
    }
    for (const block of walkBlocks([
      ...part.blocks,
      ...part.header,
      ...(part.firstHeader ?? []),
      ...part.footer,
      ...(part.headerShapes ?? []),
    ])) {
      if (ids.has(block.id)) throw new Error(`DOCX Next duplicate semantic identity ${block.id}`);
      ids.add(block.id);
      if (block.kind === "paragraph-frame") {
        if (!part.blocks.includes(block))
          throw new Error(`DOCX Next nested paragraph frame is unsupported ${block.id}`);
        if (
          ![block.xMm, block.yMm, block.widthMm].every(Number.isFinite) ||
          block.widthMm < 10 ||
          block.xMm < 0 ||
          block.yMm < 0 ||
          block.xMm + block.widthMm > part.page.widthMm ||
          block.yMm >= part.page.heightMm ||
          !block.paragraphs.length ||
          block.paragraphs.some(
            (paragraph) =>
              paragraph.kind !== "paragraph" ||
              (paragraph.indentMm ?? 0) < 0 ||
              (paragraph.indentMm ?? 0) >= block.widthMm - 10,
          )
        )
          throw new Error(`DOCX Next invalid paragraph frame ${block.id}`);
      }
      if (block.kind === "parallel-flow")
        parallelFlowTable(block, part.page.widthMm - margins.left - margins.right);
      if (block.kind === "image-zone")
        imageZoneTable(block, part.page.widthMm - margins.left - margins.right);
      if (
        (block.kind === "table" || block.kind === "image" || block.kind === "image-zone") &&
        block.sourceLayout &&
        (!Object.values(block.sourceLayout).every(Number.isFinite) ||
          block.sourceLayout.widthMm <= 0 ||
          (block.sourceLayout.minimumHeightMm !== undefined &&
            block.sourceLayout.minimumHeightMm < 0))
      )
        throw new Error(`DOCX Next invalid element source geometry ${block.id}`);
      if (block.kind === "decorative-shape") {
        validateDecoration(block);
        decorationPageGeometry(block, part.page);
      }
      if (block.kind === "paragraph") {
        block.runs.forEach((run) => fontDefinition(run.style.font));
        if (
          ![block.beforeMm, block.afterMm, block.lineHeight].every(Number.isFinite) ||
          Math.min(block.beforeMm, block.afterMm) < 0 ||
          block.lineHeight <= 0 ||
          (block.indentMm !== undefined &&
            (!Number.isFinite(block.indentMm) ||
              block.indentMm < -margins.left ||
              block.indentMm >= part.page.widthMm - margins.left - margins.right - 10))
        )
          throw new Error(`DOCX Next invalid paragraph geometry ${block.id}`);
        for (const run of block.runs) {
          if (
            !Number.isFinite(run.style.sizePt) ||
            run.style.sizePt <= 0 ||
            !/^[0-9A-F]{6}$/.test(run.style.color) ||
            (run.style.backgroundColor !== undefined &&
              !/^[0-9A-F]{6}$/.test(run.style.backgroundColor)) ||
            (run.style.allCaps !== undefined && typeof run.style.allCaps !== "boolean") ||
            (run.style.trackingPt !== undefined &&
              (!Number.isFinite(run.style.trackingPt) ||
                Math.abs(run.style.trackingPt) > run.style.sizePt))
          )
            throw new Error(`DOCX Next invalid typography ${run.id}`);
        }
      }
      if (
        block.kind === "section" &&
        block.contentIndentMm !== undefined &&
        (!Number.isFinite(block.contentIndentMm) ||
          block.contentIndentMm < 0 ||
          block.contentIndentMm >= part.page.widthMm - margins.left - margins.right - 10)
      )
        throw new Error(`DOCX Next invalid section indentation ${block.id}`);
      if (
        block.kind === "rule" &&
        (!/^[0-9A-F]{6}$/.test(block.color) ||
          ![block.lengthMm, block.afterMm].every(Number.isFinite) ||
          block.lengthMm <= 0 ||
          block.afterMm < 0 ||
          (block.strokeWidthMm !== undefined &&
            (!Number.isFinite(block.strokeWidthMm) ||
              Math.round(((block.strokeWidthMm * 72) / 25.4) * 8) < 2 ||
              Math.round(((block.strokeWidthMm * 72) / 25.4) * 8) > 96)) ||
          (block.indentMm !== undefined &&
            (!Number.isFinite(block.indentMm) || Math.abs(block.indentMm) > part.page.widthMm)))
      )
        throw new Error(`DOCX Next invalid rule geometry ${block.id}`);
      if (
        block.kind === "image" &&
        block.align !== undefined &&
        !["left", "center", "right", "justify"].includes(block.align)
      )
        throw new Error(`DOCX Next invalid image alignment ${block.id}`);
      if (
        block.kind === "image" &&
        block.opacity !== undefined &&
        (!Number.isFinite(block.opacity) || block.opacity < 0 || block.opacity > 1)
      )
        throw new Error(`DOCX Next invalid image opacity ${block.id}`);
      if (block.kind === "image" && block.opacity !== undefined && block.opacity !== 1)
        throw new Error(`DOCX Next unsupported image opacity ${block.id}`);

      if (
        block.kind === "image" &&
        (![block.widthMm, block.maxHeightMm, block.xMm, block.yMm, block.gapMm].every(
          Number.isFinite,
        ) ||
          block.widthMm <= 0 ||
          block.maxHeightMm <= 0)
      )
        throw new Error(`DOCX Next invalid image geometry ${block.id}`);
      if (
        block.kind === "table" &&
        (!block.widths.length ||
          block.widths.some((width) => !Number.isFinite(width) || width <= 0) ||
          (block.columnWidthsMm &&
            (block.columnWidthsMm.length !== block.widths.length ||
              block.columnWidthsMm.some(
                (width) => width !== null && (!Number.isFinite(width) || width <= 0),
              ))) ||
          block.rows.some((row) => row.cells.length !== block.widths.length))
      )
        throw new Error(`DOCX Next invalid table geometry ${block.id}`);
      if (block.kind === "table") {
        if (block.position) {
          if (!part.blocks.includes(block))
            throw new Error(`DOCX Next nested positioned table is unsupported ${block.id}`);
          if (
            block.widthMm === undefined ||
            (block.indentMm ?? 0) !== 0 ||
            ![block.position.xMm, block.position.yMm].every(Number.isFinite) ||
            block.position.xMm < 0 ||
            block.position.yMm < 0 ||
            block.position.xMm + block.widthMm > part.page.widthMm ||
            block.position.yMm >= part.page.heightMm
          )
            throw new Error(`DOCX Next invalid positioned table ${block.id}`);
        }
        planCellRowSpans(block);
        for (const row of block.rows) {
          if (
            row.cellEndKeepNext !== undefined &&
            (!Array.isArray(row.cellEndKeepNext) ||
              row.cellEndKeepNext.length !== row.cells.length ||
              Array.from(row.cellEndKeepNext).some(
                (flag) => flag !== null && typeof flag !== "boolean",
              ))
          )
            throw new Error(`DOCX Next invalid cell-ending attachment ${block.id}`);
          if (row.cellDecorations && row.cellDecorations.length !== row.cells.length)
            throw new Error(`DOCX Next invalid cell decoration count ${block.id}`);
          row.cellDecorations?.forEach((paint) => {
            if (paint) validateCellDecoration(paint, block.id);
          });
        }
        const box = block.decoration;
        if (
          (block.widthMm !== undefined &&
            (!Number.isFinite(block.widthMm) || block.widthMm < 10)) ||
          (block.indentMm !== undefined &&
            (!Number.isFinite(block.indentMm) || block.indentMm < 0)) ||
          (box &&
            (!/^[0-9A-F]{6}$/.test(box.fillColor ?? "FFFFFF") ||
              !/^[0-9A-F]{6}$/.test(box.borderColor) ||
              ![box.borderWidthMm, box.paddingXMm, box.paddingYMm].every(Number.isFinite) ||
              Math.min(box.borderWidthMm, box.paddingXMm, box.paddingYMm) < 0 ||
              box.borderWidthMm > 6 ||
              (box.borderSides &&
                (new Set(box.borderSides).size !== box.borderSides.length ||
                  box.borderSides.some(
                    (side) => !["top", "left", "bottom", "right"].includes(side),
                  ))) ||
              box.paddingXMm * 2 >=
                (block.widthMm ?? part.page.widthMm - margins.left - margins.right)))
        )
          throw new Error(`DOCX Next invalid flow box ${block.id}`);
      }
      if (
        block.kind === "column-flow" &&
        (![2, 3].includes(block.count) ||
          !Number.isFinite(block.gapMm) ||
          block.gapMm < 0 ||
          (part.page.widthMm - margins.left - margins.right - (block.count - 1) * block.gapMm) /
            block.count <
            20)
      )
        throw new Error(`DOCX Next invalid column geometry ${block.id}`);
    }
  }
}

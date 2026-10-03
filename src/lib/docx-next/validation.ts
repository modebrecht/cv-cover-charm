import { walkBlocks, type DossierDocModel } from "./model";
import type { WordPackage } from "./package";

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
  const ids = new Set<string>();
  for (const part of [model.cover, model.letter, model.cv]) {
    const margins = part.page.margins;
    if (![...Object.values(margins), part.page.widthMm, part.page.heightMm].every(Number.isFinite))
      throw new Error("DOCX Next invalid page geometry");
    if (
      Math.min(...Object.values(margins)) < 0 ||
      part.page.widthMm - margins.left - margins.right < 30 ||
      part.page.heightMm - margins.top - margins.bottom < 30
    )
      throw new Error("DOCX Next page has no usable content area");
    for (const block of walkBlocks([
      ...part.blocks,
      ...part.header,
      ...(part.firstHeader ?? []),
      ...part.footer,
    ])) {
      if (ids.has(block.id)) throw new Error(`DOCX Next duplicate semantic identity ${block.id}`);
      ids.add(block.id);
      if (block.kind === "paragraph")
        for (const run of block.runs) {
          if (
            !Number.isFinite(run.style.sizePt) ||
            run.style.sizePt <= 0 ||
            !/^[0-9A-F]{6}$/.test(run.style.color)
          )
            throw new Error(`DOCX Next invalid typography ${run.id}`);
        }
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
          block.rows.some((row) => row.cells.length !== block.widths.length))
      )
        throw new Error(`DOCX Next invalid table geometry ${block.id}`);
    }
  }
}

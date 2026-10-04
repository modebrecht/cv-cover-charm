import { walkBlocks, type DossierDocModel } from "./model";
import type { WordPackage } from "./package";
import { validateDecoration } from "./decoration";
import { fontDefinition } from "./fonts";

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
    const margins = part.page.margins;
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
    ])) {
      if (ids.has(block.id)) throw new Error(`DOCX Next duplicate semantic identity ${block.id}`);
      ids.add(block.id);
      if (
        (block.kind === "table" || block.kind === "image") &&
        block.sourceLayout &&
        (!Object.values(block.sourceLayout).every(Number.isFinite) ||
          block.sourceLayout.widthMm <= 0 ||
          (block.sourceLayout.minimumHeightMm !== undefined &&
            block.sourceLayout.minimumHeightMm < 0))
      )
        throw new Error(`DOCX Next invalid element source geometry ${block.id}`);
      if (block.kind === "decorative-shape") {
        validateDecoration(block);
        if (
          block.xMm + block.widthMm > part.page.widthMm ||
          block.yMm + block.heightMm > part.page.heightMm
        )
          throw new Error(`DOCX Next decoration outside page ${block.id}`);
      }
      if (block.kind === "paragraph") {
        block.runs.forEach((run) => fontDefinition(run.style.font));
        if (
          ![block.beforeMm, block.afterMm, block.lineHeight].every(Number.isFinite) ||
          Math.min(block.beforeMm, block.afterMm) < 0 ||
          block.lineHeight <= 0
        )
          throw new Error(`DOCX Next invalid paragraph geometry ${block.id}`);
        for (const run of block.runs) {
          if (
            !Number.isFinite(run.style.sizePt) ||
            run.style.sizePt <= 0 ||
            !/^[0-9A-F]{6}$/.test(run.style.color) ||
            (run.style.allCaps !== undefined && typeof run.style.allCaps !== "boolean") ||
            (run.style.trackingPt !== undefined &&
              (!Number.isFinite(run.style.trackingPt) ||
                Math.abs(run.style.trackingPt) > run.style.sizePt))
          )
            throw new Error(`DOCX Next invalid typography ${run.id}`);
        }
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
      if (block.kind === "table") {
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

import type { DossierCoverSource } from "./source";
import type { DocBlock, DocumentPart, Paragraph } from "./model";
import { walkBlocks } from "./model";
import type { TemplateDefinition } from "./templates";
import { compositeTextColor } from "./colors";
import { hasUserStyle } from "@/components/cover/user-style-precedence";
import { textElement, shapeElement, flowingElementBox } from "./elements";

type CoverContext = Parameters<typeof textElement>[2];
/** Compose authored cover fields before the single renderer sees them. */
export function composeCover(
  cover: DossierCoverSource,
  template: TemplateDefinition,
  page: DocumentPart["page"],
  coverContext: CoverContext,
  accent: string,
  color: CoverContext["color"],
  fallbackName: Paragraph,
): DocBlock[] {
  if (
    Object.values(template.cover.fieldSpaceBeforeMm ?? {}).some(
      (space) => !Number.isFinite(space) || space < 0,
    )
  )
    throw new Error("DOCX Next invalid semantic cover field lead");
  const blocks: DocBlock[] = [];
  const surfaceIds = new Set(
    (template.cover.rows ?? [])
      .flatMap((row) => [row.surfaceElementId, ...(row.cellSurfaceElementIds ?? [])])
      .filter((id): id is string => !!id),
  );
  const surfaces = new Map<string, string>();
  for (const id of surfaceIds) {
    const source = cover.blocks.find((block) => block.id === id);
    if (!source) throw new Error(`DOCX Next missing authored cover surface ${id}`);
    if (source.style.hidden) continue;
    if (
      source.kind !== "shape" ||
      source.shape !== "rect" ||
      source.style.gradFrom ||
      source.style.gradTo ||
      !source.style.fill ||
      source.style.bgRadius ||
      (source.style.strokeWidth ?? 0) > 0
    )
      throw new Error("DOCX Next native cover surfaces require solid unbordered rectangles");
    const shape = shapeElement(source, `cover.${id}`, coverContext);
    surfaces.set(
      id,
      compositeTextColor(shape.fill!.color, coverContext.paper ?? "FFFFFF", shape.opacity),
    );
  }
  const surfaceBorders = new Map<string, { color: string; widthMm: number }>();
  const borderIds = new Set(
    (template.cover.rows ?? []).flatMap((row) =>
      row.surfaceBorderElementId ? [row.surfaceBorderElementId] : [],
    ),
  );
  for (const id of borderIds) {
    const source = cover.blocks.find((block) => block.id === id);
    if (!source) throw new Error(`DOCX Next missing authored cover surface border ${id}`);
    if (source.style.hidden) continue;
    const widthMm = source.style.strokeWidth ?? 0.8;
    const nativeWidth = Math.round(((widthMm * 72) / 25.4) * 8);
    if (
      source.kind !== "shape" ||
      source.shape !== "line" ||
      source.style.gradFrom ||
      source.style.gradTo ||
      !Number.isFinite(widthMm) ||
      nativeWidth < 2 ||
      nativeWidth > 96
    )
      throw new Error("DOCX Next native cover surface borders require solid representable lines");
    const shape = shapeElement(source, `cover.${id}`, coverContext);
    surfaceBorders.set(id, {
      color: compositeTextColor(shape.fill!.color, coverContext.paper ?? "FFFFFF", shape.opacity),
      widthMm,
    });
  }

  const coverDecoration: DocBlock[] = [];
  // Cover fields come with semantic block IDs before any rendering. Geometry becomes flowing composition.
  const aliases: Record<string, string> = { name: "fullName", foto: "photo", beruf: "profession" };
  const customCoverIds = new Set(cover.customFieldIds ?? []);
  const rank = (id: string) => {
    const index = template.cover.order.indexOf(id);
    return index < 0 ? (customCoverIds.has(id) ? 1001 : 1000) : index;
  };
  const coverBlocks = cover.blocks
    .filter((block) => !block.style.hidden)
    .map((block, index) => ({ block, index }))
    .sort(
      (a, b) =>
        rank(a.block.id) - rank(b.block.id) ||
        (customCoverIds.has(a.block.id) && customCoverIds.has(b.block.id)
          ? a.block.style.y - b.block.style.y
          : 0) ||
        a.index - b.index,
    );
  const seenCover = new Set<string>();
  for (const { block } of coverBlocks) {
    const id = `cover.${aliases[block.id] ?? block.id}`;
    if (seenCover.has(id)) throw new Error(`Duplicate cover field identity: ${id}`);
    seenCover.add(id);
    if (block.kind === "shape") {
      if (surfaceIds.has(block.id) || borderIds.has(block.id)) continue;
      const rule = template.cover.flowingRules?.[block.id];
      if (rule) {
        if (
          block.shape !== "line" ||
          block.style.gradFrom ||
          block.style.gradTo ||
          ![rule.beforeMm ?? 0, rule.afterMm].every((value) => Number.isFinite(value) && value >= 0)
        )
          throw new Error("DOCX Next flowing rules require solid authored lines and valid spacing");
        const shape = shapeElement(block, id, coverContext);
        if (rule.beforeMm)
          blocks.push({ kind: "spacer", id: `${id}.lead`, heightMm: rule.beforeMm });
        blocks.push({
          kind: "rule",
          id,
          color: compositeTextColor(
            shape.fill!.color,
            coverContext.paper ?? "FFFFFF",
            shape.opacity,
          ),
          lengthMm: block.style.w,
          indentMm: block.style.x - page.margins.left,
          strokeWidthMm: block.style.strokeWidth ?? 0.8,
          afterMm: rule.afterMm,
          keepNext: true,
        });
      } else coverDecoration.push(shapeElement(block, id, coverContext));
      continue;
    }
    if (block.kind === "photo" || block.kind === "image") {
      const source = block.kind === "photo" ? cover.data.foto : block.src;
      if (source)
        blocks.push({
          kind: "image",
          id,
          source,
          alt: block.label,
          widthMm: Math.min(80, block.style.w || template.cover.photoWidthMm),
          maxHeightMm: 80,
          placement: "inline",
          ...(block.kind === "photo" && template.cover.photoAlign
            ? { align: template.cover.photoAlign }
            : {}),
          opacity: block.style.opacity,
          xMm: 0,
          yMm: 0,
          gapMm: 3,
          frame: {
            heightRatio: block.style.ratio ?? 1.25,
            radiusMm: block.style.radius ?? 0,
            zoom: block.style.imgZoom ?? 1,
            xPct: block.style.imgX ?? 50,
            yPct: block.style.imgY ?? 50,
            borderWidthMm: block.style.borderWidth ?? 0,
            borderColor: color(
              cover.colors[block.style.borderColor ?? ""] ?? block.style.borderColor,
              accent,
            ),
          },
        });
      continue;
    }
    const lines = block.lines.map((line) =>
      typeof line === "string" ? line : line.map((segment) => segment.t).join(""),
    );
    const text = lines.join("\n");
    if (!text.trim() && !block.src) continue;
    if (block.id === "empfaenger" && cover.data.showBetriebOnCover === false) continue;
    if (
      ["beilagen", "beilagenTitel"].includes(block.id) &&
      cover.data.showBeilagenOnCover === false
    )
      continue;
    const ownerRow = template.cover.rows?.find((row) => row.fields.flat().includes(block.id));
    const cellIndex = ownerRow?.fields.findIndex((field) =>
      (typeof field === "string" ? [field] : field).includes(block.id),
    );
    const rowFill =
      (cellIndex !== undefined ? ownerRow?.cellFillSlots?.[cellIndex] : undefined) ??
      ownerRow?.fillSlot;
    const authoredSurface =
      (cellIndex !== undefined
        ? surfaces.get(ownerRow?.cellSurfaceElementIds?.[cellIndex] ?? "")
        : undefined) ?? surfaces.get(ownerRow?.surfaceElementId ?? "");
    const fieldPaper =
      authoredSurface ?? (rowFill ? color(cover.colors[rowFill], accent) : undefined);
    const fieldContext = fieldPaper ? { ...coverContext, paper: fieldPaper } : coverContext;
    const defaultColorSlot = template.cover.fieldColorSlots?.[block.id];
    const styledBlock =
      defaultColorSlot && !hasUserStyle(block, "color")
        ? { ...block, style: { ...block.style, color: defaultColorSlot } }
        : block;
    const paragraphs = textElement(
      styledBlock,
      id,
      {
        ...fieldContext,
        ...(defaultColorSlot && template.cover.fieldPaletteMode === "uniform"
          ? {
              paletteColorOverride: color(
                cover.colors[styledBlock.style.color] ?? styledBlock.style.color,
                fieldContext.ink,
              ),
            }
          : {}),
        ...(template.cover.fontSource === "dossier" &&
        !customCoverIds.has(block.id) &&
        !hasUserStyle(block, "font")
          ? { defaultFont: fieldContext.font }
          : {}),
      },
      {
        ...(!hasUserStyle(block, "align") && template.cover.fieldAlignments?.[block.id]
          ? { align: template.cover.fieldAlignments[block.id] }
          : {}),
        role: block.id === "beruf" ? "title" : block.id === "name" ? "heading" : "body",
        beforeMm:
          template.cover.fieldSpaceBeforeMm?.[block.id] ??
          (block.id === "kicker" ? template.cover.heroSpaceMm : 0),
        afterMm: block.id === "name" ? 5 : 2,
        keepNext: ["kicker", "kontaktTitel", "empfaengerTitel", "beilagenTitel"].includes(block.id),
      },
    );
    const boxed =
      cover.customFieldIds?.includes(block.id) ||
      block.style.bg ||
      (block.style.borderWidth ?? 0) > 0 ||
      block.src;
    const cellPage =
      ownerRow && cellIndex !== undefined
        ? {
            ...page,
            widthMm:
              page.margins.left +
              page.margins.right +
              ((page.widthMm - page.margins.left - page.margins.right) *
                ownerRow.widths[cellIndex]) /
                ownerRow.widths.reduce((sum, value) => sum + value, 0),
          }
        : page;
    blocks.push(
      ...(boxed ? flowingElementBox(block, id, paragraphs, coverContext, cellPage) : paragraphs),
    );
  }
  for (const [index, row] of (template.cover.rows ?? []).entries()) {
    if (row.cellFillSlots && row.cellFillSlots.length !== row.fields.length)
      throw new Error("DOCX Next cover cell surfaces must match declared columns");
    if (
      (row.cellSurfaceElementIds && row.cellSurfaceElementIds.length !== row.fields.length) ||
      (row.surfaceElementId && row.fillSlot) ||
      row.cellSurfaceElementIds?.some((id, index) => id && row.cellFillSlots?.[index])
    )
      throw new Error("DOCX Next authored cover surfaces require unambiguous matching columns");
    const ids = row.fields.map((field) =>
      (typeof field === "string" ? [field] : field).map((id) => `cover.${aliases[id] ?? id}`),
    );
    const matches = (block: DocBlock, id: string) =>
      block.id === id || block.id.startsWith(`${id}.`);
    const position = blocks.findIndex((block) => ids.flat().some((id) => matches(block, id)));
    if (position < 0) continue;
    const sourceCells = ids.map((group) =>
      blocks.filter((block) => group.some((id) => matches(block, id))),
    );
    const selected = new Set(sourceCells.flat());
    const cells = sourceCells.map((cell, cellIndex): DocBlock[] => {
      const slot = row.cellFillSlots?.[cellIndex];
      const fillColor =
        surfaces.get(row.cellSurfaceElementIds?.[cellIndex] ?? "") ??
        (slot ? color(cover.colors[slot], accent) : undefined);
      return fillColor && cell.length
        ? [
            {
              kind: "table",
              id: `cover.composition.row:${index}.cell:${cellIndex}.surface`,
              widths: [1],
              rows: [{ cells: [cell], keepTogether: false }],
              decoration: {
                fillColor,
                borderColor: accent,
                borderWidthMm: 0,
                paddingXMm: 3,
                paddingYMm: 3,
              },
            },
          ]
        : cell;
    });
    const table: DocBlock = {
      kind: "table",
      id: `cover.composition.row:${index}`,
      widths: [...row.widths],
      rows: [{ cells, keepTogether: false }],
      decoration: {
        fillColor:
          surfaces.get(row.surfaceElementId ?? "") ??
          (row.fillSlot ? color(cover.colors[row.fillSlot], accent) : undefined),
        borderColor: surfaceBorders.get(row.surfaceBorderElementId ?? "")?.color ?? accent,
        borderWidthMm: surfaceBorders.get(row.surfaceBorderElementId ?? "")?.widthMm ?? 0,
        ...(row.surfaceBorderElementId ? { borderSides: ["top" as const] } : {}),
        paddingXMm: row.surfaceElementId && surfaces.has(row.surfaceElementId) ? 3 : 0,
        paddingYMm: row.surfaceElementId && surfaces.has(row.surfaceElementId) ? 3 : 0,
      },
    };
    blocks.splice(
      position,
      0,
      ...(row.beforeMm
        ? [
            {
              kind: "spacer" as const,
              id: `cover.composition.lead:${index}`,
              heightMm: row.beforeMm,
            },
          ]
        : []),
      table,
    );
    for (let cursor = blocks.length - 1; cursor >= 0; cursor--)
      if (selected.has(blocks[cursor])) blocks.splice(cursor, 1);
  }
  if (template.cover.heroLeadMm) {
    const starts = template.cover.heroStartFields ?? ["name"];
    if (!starts.length || starts.some((id) => !template.cover.order.includes(id)))
      throw new Error("DOCX Next hero starts require declared semantic cover fields");
    const heroBlocks = template.cover.heroInRows ? walkBlocks(blocks) : blocks;
    const first = starts
      .map((id) => `cover.${aliases[id] ?? id}`)
      .find((id) => heroBlocks.some((block) => block.id === id));
    const photo = heroBlocks.some((block) => block.id === "cover.photo");
    const hero = blocks.findIndex((block) =>
      (template.cover.heroInRows ? walkBlocks([block]) : [block]).some(
        (child) => child.id === "cover.photo" || child.id === first,
      ),
    );
    if (hero >= 0)
      blocks.splice(hero, 0, {
        kind: "spacer",
        id: "cover.heroLead",
        heightMm: !photo
          ? (template.cover.photoAbsentLeadMm ?? template.cover.heroLeadMm)
          : template.cover.heroLeadMm,
      });
  }
  blocks.unshift(...coverDecoration);
  if (!blocks.length) blocks.push(fallbackName);

  return blocks;
}

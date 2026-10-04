import type { DossierCoverSource } from "./source";
import type { DocBlock, DocumentPart, Paragraph } from "./model";
import type { TemplateDefinition } from "./templates";
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
  const blocks: DocBlock[] = [];

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
      coverDecoration.push(shapeElement(block, id, coverContext));
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
    const paragraphs = textElement(block, id, coverContext, {
      role: block.id === "beruf" ? "title" : block.id === "name" ? "heading" : "body",
      beforeMm: block.id === "kicker" ? template.cover.heroSpaceMm : 0,
      afterMm: block.id === "name" ? 5 : 2,
      keepNext: ["kicker", "kontaktTitel", "empfaengerTitel", "beilagenTitel"].includes(block.id),
    });
    const boxed =
      cover.customFieldIds?.includes(block.id) ||
      block.style.bg ||
      (block.style.borderWidth ?? 0) > 0 ||
      block.src;
    blocks.push(
      ...(boxed ? flowingElementBox(block, id, paragraphs, coverContext, page) : paragraphs),
    );
  }
  blocks.unshift(...coverDecoration);
  if (!blocks.length) blocks.push(fallbackName);

  return blocks;
}

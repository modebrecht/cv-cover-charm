import { coverTextPresentation } from "@/components/cover/presentation";
import { FONT_STACKS, lineText, type Block, type TemplateId } from "@/components/cover/types";
import type { CoverTextMetrics } from "@/components/cover/text-metrics";

/** Add font advances, never DOM geometry. Fresh packet is owned by the export boundary. */
export function captureCoverBadgeAdvances(
  blocks: Block[],
  template: TemplateId,
  colors: Record<string, string>,
  metrics: CoverTextMetrics,
) {
  const canvas = document.createElement("canvas").getContext("2d");
  if (!canvas) throw Error("Design DOCX Next: Schriftmessung ist nicht verfügbar.");
  canvas.fontKerning = "normal";
  for (const block of blocks) {
    if (block.kind !== "text" || !block.style.bg || block.style.hidden) continue;
    const measured = metrics.blocks[block.id];
    const style = coverTextPresentation(block, template, colors).style;
    const text = block.lines.map(lineText).join("\n");
    if (!text.trim()) continue;
    if (block.lines.length !== 1 || measured.lines !== 1 || style.italic)
      throw Error(
        "Design DOCX Next: Badges unterstützen im ersten Test genau eine Textzeile: " + block.id,
      );
    canvas.font = `${style.weight} ${(measured.sizePt * 96) / 72}px ${FONT_STACKS[style.font]}`;
    const shown = style.uppercase ? text.toUpperCase() : text;
    const advance =
      (canvas.measureText(shown).width * 25.4) / 96 +
      (shown.length * style.tracking * measured.sizePt * 25.4) / 72;
    if (!Number.isFinite(advance) || advance <= 0 || advance + 2 * style.padX > style.w)
      throw Error(
        "Design DOCX Next: Badge-Text überschreitet die gespeicherte Breite: " + block.id,
      );
    measured.badgeAdvanceMm = advance;
  }
}

import type { Block, BlockStyle, TemplateId } from "./types";
import { dossierThemeFor } from "@/lib/dossier-theme";
import { hasUserStyle } from "./user-style-precedence";

export function coverTextRole(block: Block, template?: TemplateId) {
  if (block.kind !== "text") return undefined;
  if (template === "modern" && block.id === "lehrbeginn" && block.style.bg) return "badge";
  if (block.id === "name") return "name";
  if (block.id === "beruf") return "subtitle";
  if (["eyebrow", "kicker", "kontaktTitel", "anTitel", "beilagenTitel"].includes(block.id))
    return "heading";
  if (["ortDatum", "lehrbeginn"].includes(block.id)) return "muted";
  if (["kontakt", "empfaenger", "beilagen"].includes(block.id)) return "body";
  return undefined;
}

/** Shared visible copy; the saved authored blocks remain immutable. */
export function normalizedCoverLabels(blocks: Block[], contactLabel: string): Block[] {
  return blocks.map((block) => {
    if (block.kind !== "text") return block;
    if (block.id === "kontaktTitel" && !contactLabel.trim() && block.lines.length)
      return { ...block, lines: ["Kontakt"] };
    if (block.id === "beilagenTitel")
      return {
        ...block,
        lines: block.lines.map((line) =>
          typeof line === "string" && line.trim().toLocaleLowerCase("de-CH") === "beilagen:"
            ? line.replace(/:\s*$/, "")
            : line,
        ),
      };
    return block;
  });
}

/** Pure role defaults from the existing dossier theme. Explicit element edits win.
 * Template-specific CSS is outside this contract; native consumers require a declaration.
 */
export function coverTextPresentation(
  block: Block,
  template: TemplateId,
  colors: Record<string, string>,
) {
  const role = coverTextRole(block, template),
    style = { ...block.style };
  const theme = dossierThemeFor(template),
    t = theme.typography;
  const set = <K extends keyof BlockStyle>(key: K, value: BlockStyle[K]) => {
    if (!hasUserStyle(block, key)) style[key] = value;
  };
  if (role === "name") {
    set("weight", t.nameWeight);
    set("tracking", t.nameTrackingEm);
    set("lineHeight", t.nameLineHeight);
  }
  if (role === "subtitle") {
    set("weight", t.subtitleWeight);
    set("tracking", t.subtitleTrackingEm);
    set("lineHeight", t.subtitleLineHeight);
  }
  if (role === "heading") {
    set("weight", theme.headingStyle.weight);
    set("tracking", theme.headingStyle.trackingEm);
    set("lineHeight", theme.headingStyle.lineHeight);
    set("uppercase", theme.headingStyle.uppercase);
  }
  if (role === "body" || role === "muted" || role === "badge") {
    set("weight", t.bodyWeight);
    set("lineHeight", t.bodyLineHeight);
  }
  if (role === "muted") set("opacity", t.mutedOpacity);
  if (["kontaktTitel", "beilagenTitel"].includes(block.id)) {
    set("uppercase", true);
    set("tracking", 0);
  }
  if (role && colors.coverInk) set("color", colors.coverInk);
  return {
    style,
    paintOpacity:
      (role === "heading" || role === "badge") && !hasUserStyle(block, "opacity")
        ? theme.accentTreatment.opacity
        : 1,
  };
}

import type { DocumentPart, Paragraph } from "./model";
import type { TemplateDefinition } from "./templates";
import { color } from "./colors";
import { ensureFirstHeader } from "./page-artwork";
import { onColorRoles } from "@/components/cv/palette";
import { nativeTextHeightMm as chromeTextHeight } from "./layouts";
export { chromeTextHeight };
export function templateBandInk(fill: string, paper: string): string {
  return color(onColorRoles(`#${fill}`, `#${paper}`).ink, "FFFFFF");
}
/** Flowing sender text has a readable cell backdrop even when it grows beyond the band. */
export function composeCompactMasthead(
  part: DocumentPart,
  policy: NonNullable<TemplateDefinition["letter"]["compactMasthead"]>,
  fill: string,
  styleSender: (p: Paragraph) => Paragraph,
): void {
  const sender = part.blocks.filter(
    (block): block is Paragraph =>
      block.kind === "paragraph" && block.id.startsWith("letter.sender."),
  );
  if (!sender.length) return;
  const paragraphs = sender.map(styleSender),
    ids = new Set(sender.map((p) => p.id));
  part.blocks = part.blocks.filter((block) => !ids.has(block.id));
  const lead = Math.max(
    0,
    policy.heightMm - part.page.margins.top - chromeTextHeight(paragraphs, policy.widthMm),
  );
  part.blocks.unshift(
    {
      kind: "table",
      id: "letter.sender.masthead",
      widths: [1],
      widthMm: policy.widthMm,
      rows: [{ cells: [paragraphs], keepTogether: false }],
      decoration: {
        fillColor: fill,
        borderColor: fill,
        borderWidthMm: 0,
        paddingXMm: 0,
        paddingYMm: 0,
      },
    },
    ...(lead
      ? [{ kind: "spacer" as const, id: "letter.sender.mastheadLead", heightMm: lead }]
      : []),
  );
}
/** Scoped paint is configured independently of template IDs and browser pagination. */
export function composeHeaderBands(
  part: DocumentPart,
  policy: NonNullable<TemplateDefinition["chrome"]["band"]>,
  colors: Record<string, string>,
  accent: string,
  firstMode: "compact" | "contact" | "none",
  followMode: "compact" | "contact" | "none",
  headerHeightMm: number,
  explicitBackground: boolean,
): void {
  const fill = color(colors[policy.fillSlot], accent),
    secondary = color(colors[policy.accentSlot], accent);
  ensureFirstHeader(part);
  if (!explicitBackground)
    for (const [repeat, mode] of [
      ["first", firstMode],
      ["continuation", followMode],
    ] as const) {
      if (mode === "none") continue;
      const text = repeat === "first" ? part.firstHeader! : part.header;
      const hasText = text.some((p) => p.runs.some((run) => run.text.trim()));
      const heightMm = Math.max(
        repeat === "first" ? policy.compactFirstMm : policy.compactContinuationMm,
        mode === "contact" || hasText ? part.page.headerDistanceMm + headerHeightMm : 0,
      );
      part.artwork.push({
        kind: "decorative-artwork",
        id: `${part.id}.artwork.band.${repeat}`,
        semanticText: false,
        repeat,
        fill: { color: fill },
        xMm: 0,
        yMm: 0,
        widthMm: part.page.widthMm,
        heightMm,
      });
    }
  if (firstMode !== "none")
    part.headerShapes = policy.circles.map((circle, index) => ({
      kind: "decorative-shape",
      id: `${part.id}.artwork.circle:${index}`,
      semanticText: false,
      repeat: "first",
      clipToPage: true,
      shape: "circle",
      xMm: part.page.widthMm - circle.rightMm - circle.diameterMm,
      yMm: circle.topMm,
      widthMm: circle.diameterMm,
      heightMm: circle.diameterMm,
      radiusMm: 0,
      opacity: circle.opacity,
      ...(circle.strokeMm ? {} : { fill: { color: secondary } }),
      stroke: { color: secondary, widthMm: circle.strokeMm ?? 0 },
    }));
}

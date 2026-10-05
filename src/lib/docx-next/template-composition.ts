import type { DecorativeShape, DocumentPart, Paragraph } from "./model";
import type { TemplateDefinition } from "./templates";
import { color } from "./colors";
import { ensureFirstHeader } from "./page-artwork";
import { templateMotifs } from "./template-motifs";
import { onColorRoles } from "@/components/cv/palette";
import { nativeTextHeightMm as chromeTextHeight } from "./layouts";
export { chromeTextHeight };
/** Stable semantic tail IDs keep a short closing/signature/attachment group in native flow. */
export function composeLetterTail(part: DocumentPart): void {
  const tail = part.blocks.filter(
    (b): b is Paragraph =>
      b.kind === "paragraph" &&
      (b.id === "letter.closing" ||
        b.id === "letter.signature" ||
        b.id.startsWith("letter.attachment:")),
  );
  const width = part.page.widthMm - part.page.margins.left - part.page.margins.right;
  if (chromeTextHeight(tail, width, 1.4) > 80) return;
  tail.forEach((paragraph, index) => {
    paragraph.keepNext = index < tail.length - 1;
  });
}
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
  noneMotifOpacity = 1,
): void {
  if (!Number.isFinite(noneMotifOpacity) || noneMotifOpacity < 0 || noneMotifOpacity > 1)
    throw new Error("DOCX Next page motif opacity must be between zero and one.");
  const fill = color(colors[policy.fillSlot], accent),
    secondary = color(colors[policy.accentSlot], accent);
  ensureFirstHeader(part);
  for (const [repeat, mode] of [
    ["first", firstMode],
    ["continuation", followMode],
  ] as const) {
    if (mode === "none") {
      if (policy.noneMotifs && noneMotifOpacity)
        part.headerShapes = [
          ...(part.headerShapes ?? []),
          ...templateMotifs(part, policy.noneMotifs, colors, accent, undefined, repeat).map(
            (shape) => ({ ...shape, opacity: shape.opacity * noneMotifOpacity }),
          ),
        ];
      continue;
    }
    if (explicitBackground) continue;
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
    if (policy.motifs)
      part.headerShapes = [
        ...(part.headerShapes ?? []),
        ...templateMotifs(part, policy.motifs, colors, accent, heightMm, repeat),
      ];
  }
  if (firstMode !== "none" && policy.circles)
    part.headerShapes = [
      ...(part.headerShapes ?? []),
      ...policy.circles.map(
        (circle, index): DecorativeShape => ({
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
        }),
      ),
    ];
}

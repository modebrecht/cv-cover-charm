import type { Block } from "@/components/cover/types";
import type { DocBlock, Paragraph, TextStyle, DecorativeShape, ImageBlock } from "./model";
import { wordFont } from "./fonts";

type ElementContext = {
  fontScale: number;
  font: string;
  colors: Record<string, string>;
  ink: string;
  color: (value: string | null | undefined, fallback: string) => string;
  style: (id: string, patch?: Partial<TextStyle>) => TextStyle;
  fieldStyles?: Record<string, Partial<TextStyle>>;
};
export function textElement(
  block: Block,
  id: string,
  context: ElementContext,
  layout: Partial<Paragraph> = {},
): Paragraph[] {
  const baseStyle: Partial<TextStyle> = {
    font: wordFont(block.style.font, context.font),
    sizePt: block.style.size * context.fontScale,
    color: context.color(context.colors[block.style.color] ?? block.style.color, context.ink),
    bold: block.style.weight >= 600,
    italic: block.style.italic,
    underline: block.style.underline,
    allCaps: block.style.uppercase,
  };
  const lineRuns = (line: Block["lines"][number], lineIndex: number) => {
    const segments = typeof line === "string" ? [{ t: line }] : line;
    return segments.map((segment, segmentIndex) => {
      const resolved = context.style(id, {
        ...baseStyle,
        ...(segment.color
          ? { color: context.color(context.colors[segment.color] ?? segment.color, context.ink) }
          : {}),
        ...(segment.weight !== undefined ? { bold: segment.weight >= 600 } : {}),
      });
      resolved.trackingPt =
        context.fieldStyles?.[id]?.trackingPt ?? block.style.tracking * resolved.sizePt;
      return {
        id: `${id}.line:${lineIndex}.run:${segmentIndex}`,
        fieldId: id,
        text: segment.t,
        style: resolved,
      };
    });
  };
  const paragraph: Paragraph = {
    kind: "paragraph",
    id,
    role: "body",
    runs: [],
    align: block.style.align,
    beforeMm: 0,
    afterMm: 2,
    lineHeight: block.style.lineHeight,
    keepNext: false,
    keepLines: false,
    ...layout,
  };
  if (block.style.list !== "none") {
    const items = block.lines.flatMap((line, index) =>
      (typeof line === "string" ? line : line.map((segment) => segment.t).join("")).trim()
        ? [{ line, index }]
        : [],
    );
    return items.map(({ line, index }, itemIndex) => ({
      ...paragraph,
      id: `${id}.item:${index}`,
      runs: lineRuns(line, index),
      list: block.style.list as NonNullable<Paragraph["list"]>,
      listGroupId: id,
      beforeMm: itemIndex === 0 ? paragraph.beforeMm : 0,
      afterMm: itemIndex === items.length - 1 ? paragraph.afterMm : 0.5,
      keepNext: false,
    }));
  }
  paragraph.runs = block.lines.flatMap((line, index) =>
    lineRuns(line, index).map((run, runIndex) => ({
      ...run,
      text: (index > 0 && runIndex === 0 ? "\n" : "") + run.text,
    })),
  );
  return paragraph.runs.some((run) => run.text.trim()) ? [paragraph] : [];
}
export function imageElement(
  block: Block,
  id: string,
  colors: Record<string, string>,
  color: ElementContext["color"],
  ink: string,
): ImageBlock | undefined {
  if (!block.src) return;
  return {
    kind: "image",
    id,
    source: block.src,
    alt: block.label,
    widthMm: block.style.w,
    maxHeightMm: 150,
    placement: "inline",
    xMm: 0,
    yMm: 0,
    gapMm: 3,
    sourceLayout: { xMm: block.style.x, yMm: block.style.y, widthMm: block.style.w },
    frame: {
      heightRatio: block.style.ratio ?? 1,
      radiusMm: block.style.radius ?? 0,
      zoom: block.style.imgZoom ?? 1,
      xPct: block.style.imgX ?? 50,
      yPct: block.style.imgY ?? 50,
      borderWidthMm: block.style.borderWidth ?? 0,
      borderColor: color(colors[block.style.borderColor ?? ""] ?? block.style.borderColor, ink),
    },
  };
}
export function shapeElement(
  block: Block,
  id: string,
  context: Pick<ElementContext, "colors" | "color" | "ink">,
): DecorativeShape {
  const s = block.style;
  const resolve = (value: string) => context.color(context.colors[value] ?? value, context.ink);
  const line = block.shape === "line";
  const fill = s.gradFrom
    ? {
        color: resolve(s.gradFrom),
        endColor: resolve(s.gradTo ?? s.gradFrom),
        angleDeg: s.gradAngle ?? 135,
        startPct: s.gradStart ?? 0,
        endPct: Math.max(s.gradStart ?? 0, s.gradEnd ?? 100),
      }
    : s.fill
      ? { color: resolve(s.fill) }
      : line
        ? { color: resolve(s.color) }
        : undefined;
  return {
    kind: "decorative-shape",
    id,
    semanticText: false,
    shape: block.shape ?? "rect",
    ...(block.shape === "path" ? { path: block.path } : {}),
    xMm: s.x,
    yMm: s.y,
    widthMm: s.w,
    heightMm: line ? Math.max(s.strokeWidth ?? 0.8, 0.2) : s.w * (s.ratio ?? 1),
    radiusMm: s.bgRadius >= 999 ? 0 : s.bgRadius,
    opacity: s.opacity,
    fill,
    stroke: { color: resolve(s.color), widthMm: line ? 0 : (s.strokeWidth ?? 0.8) },
  };
}
export function flowingElementBox(
  block: Block,
  id: string,
  paragraphs: Paragraph[],
  context: Pick<ElementContext, "colors" | "color" | "ink">,
  page: { widthMm: number; margins: { left: number; right: number } },
): DocBlock[] {
  const figure = block.src
    ? imageElement(block, `${id}.background-image`, context.colors, context.color, context.ink)
    : undefined;
  if (!paragraphs.length && !figure) return [];
  const available = page.widthMm - page.margins.left - page.margins.right;
  const widthMm = Math.max(10, Math.min(available, block.style.w));
  const indentMm = Math.max(0, Math.min(available - widthMm, block.style.x - page.margins.left));
  return [
    {
      kind: "table",
      id: `${id}.flow-box`,
      widths: [1],
      widthMm,
      indentMm,
      sourceLayout: {
        xMm: block.style.x,
        yMm: block.style.y,
        widthMm: block.style.w,
        ...(block.style.h !== undefined ? { minimumHeightMm: block.style.h } : {}),
      },
      decoration: {
        ...(block.style.bg
          ? {
              fillColor: context.color(
                context.colors[block.style.bg] ?? block.style.bg,
                context.ink,
              ),
            }
          : {}),
        borderColor: context.color(
          context.colors[block.style.borderColor ?? ""] ?? block.style.borderColor,
          context.ink,
        ),
        borderWidthMm: block.style.borderWidth ?? 0,
        paddingXMm: block.style.bg ? block.style.padX : 0,
        paddingYMm: block.style.bg ? block.style.padY : 0,
      },
      rows: [{ cells: [[...(figure ? [figure] : []), ...paragraphs]], keepTogether: false }],
    },
  ];
}

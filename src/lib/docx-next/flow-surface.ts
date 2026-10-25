import type { Paragraph, DecorativeShape } from "./model";
import type { DecorationPaint } from "./decoration";

export function flowSurfacePaint(p: Paragraph): DecorationPaint {
  const s = p.flowSurface!;
  const base: DecorativeShape = {
    kind: "decorative-shape",
    id: p.id + ".flow-paint",
    semanticText: false,
    shape: "rect",
    xMm: 0,
    yMm: 0,
    widthMm: s.rowWidthMm,
    heightMm: s.heightMm,
    radiusMm: 0,
    opacity: 1,
    stroke: { color: "000000", widthMm: 0 },
  };
  const layers: DecorativeShape[] =
    s.variant === "rule"
      ? []
      : [
          {
            ...base,
            id: base.id + ".fill",
            widthMm: s.widthMm,
            radiusMm: s.heightMm / 2,
            fill: { color: s.ink },
            opacity: 0.14,
          },
          {
            ...base,
            id: base.id + ".outline",
            xMm: s.outlineMm / 2,
            yMm: s.outlineMm / 2,
            widthMm: s.widthMm - s.outlineMm,
            heightMm: s.heightMm - s.outlineMm,
            radiusMm: (s.heightMm - s.outlineMm) / 2,
            stroke: { color: s.ink, widthMm: s.outlineMm },
            opacity: 0.3,
          },
        ];
  if (s.rule && s.rowWidthMm > s.widthMm + s.rule.gapMm)
    layers.push({
      ...base,
      id: base.id + ".rule",
      xMm: s.widthMm + s.rule.gapMm,
      yMm: (s.heightMm - s.rule.heightMm) / 2,
      widthMm: s.rowWidthMm - s.widthMm - s.rule.gapMm,
      heightMm: s.rule.heightMm,
      fill: { color: s.rule.color },
      opacity: s.rule.opacity,
    });
  return { ...base, layers };
}

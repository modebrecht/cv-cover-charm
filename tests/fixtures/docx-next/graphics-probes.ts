import type { DecorativeShape, DocumentPart } from "../../../src/lib/docx-next/model";
import { compositePagePaint } from "../../../src/lib/docx-next/page-artwork";

/** Independent analytic color checks: no canvas or production rasterizer in expected values. */
export function graphicsPaintProbes(part: DocumentPart, template: string) {
  const points =
    part.id === "cover"
      ? template === "neon"
        ? [
            [2, 24],
            [204, 200],
            [21, 214],
          ]
        : template === "verlauf"
          ? [
              [200, 20],
              [5, 244],
              [105, 295],
            ]
          : [
              [5, 15],
              [170, 10],
              [205, 25],
              [205, 180],
            ]
      : [
          [1, 130],
          [209, 150],
          [105, 295],
          [15, 150],
        ];
  return [true, false].flatMap((first) => {
    const paint = compositePagePaint(part, first);
    if (!paint) return [];
    const clearPoints =
      part.id === "cover" && !first
        ? [
            [2, 24],
            [204, 200],
            [105, 295],
          ]
        : points;
    return clearPoints.map(([xMm, yMm]) => ({
      xMm,
      yMm,
      color: graphicsPaintAt(paint.layers!, xMm, yMm),
      repeat: first ? ("first" as const) : ("continuation" as const),
      coversPaper: part.artwork.find((p) => p.id.endsWith(".artwork.paper"))?.id,
    }));
  });
}

const rgb = (color: string) => [0, 2, 4].map((i) => parseInt(color.slice(i, i + 2), 16));
export const graphicsPaintAt = (layers: readonly DecorativeShape[], x: number, y: number) => {
  let result = [255, 255, 255];
  for (const shape of layers) {
    const lx = x - shape.xMm,
      ly = y - shape.yMm;
    if (!shape.fill || lx < 0 || ly < 0 || lx > shape.widthMm || ly > shape.heightMm) continue;
    if (
      shape.shape === "circle" &&
      ((lx / shape.widthMm - 0.5) * 2) ** 2 + ((ly / shape.heightMm - 0.5) * 2) ** 2 > 1
    )
      continue;
    if (shape.cornerRadiiMm) {
      const index =
        ly < shape.heightMm / 2 ? (lx < shape.widthMm / 2 ? 0 : 1) : lx < shape.widthMm / 2 ? 3 : 2;
      const r = Math.min(shape.cornerRadiiMm[index], shape.widthMm / 2, shape.heightMm / 2);
      const dx = Math.min(lx, shape.widthMm - lx),
        dy = Math.min(ly, shape.heightMm - ly);
      if (dx < r && dy < r && (dx - r) ** 2 + (dy - r) ** 2 > r ** 2) continue;
    }
    let alpha = shape.opacity,
      ratio = 0;
    if (shape.fill.radialFade) {
      const distance =
        Math.hypot(lx - shape.widthMm / 2, ly - shape.heightMm / 2) /
        (Math.min(shape.widthMm, shape.heightMm) / 2);
      const { innerPct, outerPct } = shape.fill.radialFade;
      alpha *=
        1 - Math.max(0, Math.min(1, (distance - innerPct / 100) / ((outerPct - innerPct) / 100)));
    } else if (shape.fill.endColor) {
      const radians = ((shape.fill.angleDeg ?? 135) * Math.PI) / 180,
        dx = Math.sin(radians),
        dy = -Math.cos(radians);
      const extent = Math.abs(dx) * shape.widthMm + Math.abs(dy) * shape.heightMm;
      ratio = Math.max(
        0,
        Math.min(
          1,
          0.5 + ((lx - shape.widthMm / 2) * dx + (ly - shape.heightMm / 2) * dy) / extent,
        ),
      );
    }
    const a = rgb(shape.fill.color),
      b = rgb(shape.fill.endColor ?? shape.fill.color);
    result = result.map(
      (value, i) => (a[i] * (1 - ratio) + b[i] * ratio) * alpha + value * (1 - alpha),
    );
  }
  return result
    .map((v) => Math.round(v).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
};

export function graphicsLinePaintProbes(part: DocumentPart) {
  return [true, false].flatMap((first) => {
    const layers = compositePagePaint(part, first)?.layers ?? [];
    return layers
      .filter((s) => s.shape === "line" && s.fill)
      .map((s) => ({
        id: s.id,
        xMm: s.xMm + s.widthMm / 2,
        yMm: s.yMm,
        heightMm: s.heightMm,
        color: graphicsPaintAt(layers, s.xMm + s.widthMm / 2, s.yMm + s.heightMm / 2),
        backdrop: "FFFFFF",
        opacity: 1,
        repeat: first ? ("first" as const) : ("continuation" as const),
      }));
  });
}

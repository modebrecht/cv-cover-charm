import type { DecorativeShape } from "./model";
import type { NormalizedImage } from "./images";

export type DecorationPaint = DecorativeShape & {
  viewport?: { leftMm: number; topMm: number; widthMm: number; heightMm: number };
};
export type DecorationRasterizer = (shape: DecorationPaint) => Promise<NormalizedImage>;
/** Position/identity and unused shape properties never duplicate identical paint assets. */
export function decorationAssetKey(shape: DecorationPaint): string {
  return JSON.stringify({
    ...shape,
    id: "",
    xMm: 0,
    yMm: 0,
    clipToPage: undefined,
    repeat: undefined,
    radiusMm: shape.shape === "rect" ? shape.radiusMm : 0,
    stroke: { ...shape.stroke, color: shape.stroke.widthMm ? shape.stroke.color : "000000" },
  });
}
const hex = (value: string) => /^[0-9A-F]{6}$/.test(value);
/** The app's freehand grammar contains only M/L coordinates, never arbitrary SVG. */
export function shapePathPoints(path: string): { x: number; y: number }[] {
  const pattern = /([ML])\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g;
  const matches = [...path.matchAll(pattern)];
  if (
    matches.length < 2 ||
    matches.length > 10000 ||
    matches[0][1] !== "M" ||
    matches.slice(1).some((match) => match[1] !== "L") ||
    path.replace(pattern, "").trim() ||
    matches.some((match) =>
      [Number(match[2]), Number(match[3])].some(
        (value) => !Number.isFinite(value) || value < 0 || value > 100,
      ),
    )
  )
    throw new Error("DOCX Next invalid decorative path");
  return matches.map((match) => ({ x: Number(match[2]), y: Number(match[3]) }));
}
export function validateDecoration(shape: DecorationPaint): void {
  const fill = shape.fill;
  if (
    shape.semanticText !== false ||
    !["rect", "circle", "line", "path"].includes(shape.shape) ||
    ![
      shape.xMm,
      shape.yMm,
      shape.widthMm,
      shape.heightMm,
      shape.radiusMm,
      shape.opacity,
      shape.stroke.widthMm,
    ].every(Number.isFinite) ||
    (!shape.clipToPage && Math.min(shape.xMm, shape.yMm) < 0) ||
    (shape.clipToPage !== undefined && shape.clipToPage !== true) ||
    (shape.repeat !== undefined && !["first", "continuation"].includes(shape.repeat)) ||
    Math.min(shape.radiusMm, shape.stroke.widthMm, shape.opacity) < 0 ||
    Math.min(shape.widthMm, shape.heightMm) <= 0 ||
    shape.opacity > 1 ||
    shape.stroke.widthMm >= Math.min(shape.widthMm, shape.heightMm) ||
    !hex(shape.stroke.color) ||
    (fill &&
      (!hex(fill.color) ||
        !hex(fill.endColor ?? fill.color) ||
        ![fill.angleDeg ?? 0, fill.startPct ?? 0, fill.endPct ?? 100].every(Number.isFinite) ||
        (fill.startPct ?? 0) < 0 ||
        (fill.endPct ?? 100) > 100 ||
        (fill.startPct ?? 0) > (fill.endPct ?? 100)))
  )
    throw new Error(`DOCX Next invalid decoration ${shape.id}`);
  const viewport = shape.viewport;
  if (
    viewport &&
    (!Object.values(viewport).every(Number.isFinite) ||
      Math.min(viewport.leftMm, viewport.topMm) < 0 ||
      Math.min(viewport.widthMm, viewport.heightMm) <= 0 ||
      viewport.leftMm + viewport.widthMm > shape.widthMm + 0.001 ||
      viewport.topMm + viewport.heightMm > shape.heightMm + 0.001)
  )
    throw new Error(`DOCX Next invalid decoration viewport ${shape.id}`);
  if (shape.shape === "path") shapePathPoints(shape.path ?? "");
  else if (shape.path !== undefined) throw new Error(`DOCX Next unexpected path ${shape.id}`);
}
/** Only nonsemantic geometry is rasterized; all dossier text stays in Word. */
export const rasterizeDecoration: DecorationRasterizer = async (shape) => {
  validateDecoration(shape);
  if (typeof document === "undefined")
    throw new Error("DOCX Next decoration requires a browser or explicit raster adapter.");
  const viewport = shape.viewport ?? {
    leftMm: 0,
    topMm: 0,
    widthMm: shape.widthMm,
    heightMm: shape.heightMm,
  };
  const scale = Math.min(8, 1600 / Math.max(viewport.widthMm, viewport.heightMm));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(viewport.widthMm * scale));
  canvas.height = Math.max(1, Math.round(viewport.heightMm * scale));
  const context = canvas.getContext("2d", { colorSpace: "srgb" });
  if (!context) throw new Error("DOCX Next could not allocate decoration canvas.");
  context.scale(canvas.width / viewport.widthMm, canvas.height / viewport.heightMm);
  context.translate(-viewport.leftMm, -viewport.topMm);
  context.globalAlpha = shape.opacity;
  let paint: string | CanvasGradient = "transparent";
  if (shape.fill) {
    paint = `#${shape.fill.color}`;
    if (shape.fill.endColor) {
      const angle = ((shape.fill.angleDeg ?? 135) * Math.PI) / 180;
      const dx = Math.sin(angle),
        dy = -Math.cos(angle);
      const half = (Math.abs(dx) * shape.widthMm + Math.abs(dy) * shape.heightMm) / 2;
      const cx = shape.widthMm / 2,
        cy = shape.heightMm / 2;
      const gradient = context.createLinearGradient(
        cx - dx * half,
        cy - dy * half,
        cx + dx * half,
        cy + dy * half,
      );
      gradient.addColorStop((shape.fill.startPct ?? 0) / 100, `#${shape.fill.color}`);
      gradient.addColorStop((shape.fill.endPct ?? 100) / 100, `#${shape.fill.endColor}`);
      paint = gradient;
    }
  }
  context.fillStyle = paint;
  context.strokeStyle = `#${shape.stroke.color}`;
  if (shape.stroke.widthMm > 0) context.lineWidth = shape.stroke.widthMm;
  const inset = shape.stroke.widthMm / 2;
  context.beginPath();
  if (shape.shape === "line") {
    context.fillStyle = shape.fill ? paint : context.strokeStyle;
    context.fillRect(0, 0, shape.widthMm, shape.heightMm);
  } else {
    if (shape.shape === "circle")
      context.ellipse(
        shape.widthMm / 2,
        shape.heightMm / 2,
        shape.widthMm / 2 - inset,
        shape.heightMm / 2 - inset,
        0,
        0,
        Math.PI * 2,
      );
    else if (shape.shape === "rect")
      context.roundRect(
        inset,
        inset,
        shape.widthMm - shape.stroke.widthMm,
        shape.heightMm - shape.stroke.widthMm,
        Math.min(
          shape.radiusMm,
          (Math.min(shape.widthMm, shape.heightMm) - shape.stroke.widthMm) / 2,
        ),
      );
    else {
      shapePathPoints(shape.path!).forEach((point, index) => {
        const x = Math.max(inset, Math.min(shape.widthMm - inset, (point.x * shape.widthMm) / 100));
        const y = Math.max(
          inset,
          Math.min(shape.heightMm - inset, (point.y * shape.heightMm) / 100),
        );
        if (index) context.lineTo(x, y);
        else context.moveTo(x, y);
      });
      context.lineCap = "round";
      context.lineJoin = "round";
    }
    if (shape.fill) context.fill();
    if (shape.stroke.widthMm > 0) context.stroke();
  }
  const encoded = atob(canvas.toDataURL("image/png").split(",")[1]);
  return {
    bytes: Uint8Array.from(encoded, (char) => char.charCodeAt(0)),
    widthPx: canvas.width,
    heightPx: canvas.height,
    extension: "png",
    contentType: "image/png",
  };
};

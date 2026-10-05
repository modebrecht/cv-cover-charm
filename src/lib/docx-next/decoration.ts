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
    paintLayer: undefined,
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
export type DecorationPathSegment = { command: "M" | "L" | "C"; coordinates: number[] };
/** Normalize authored absolute polygon shorthand, retaining semantic identity and saved geometry. */
export function authoredPolygonPath(path: string): string {
  if (!/[HVZ]/.test(path)) return path;
  const tokenPattern = /[MLHVZ]|-?\d+(?:\.\d+)?/g;
  const tokens = path.match(tokenPattern) ?? [];
  if (path.replace(tokenPattern, "").trim() || tokens[0] !== "M" || tokens.length > 30000)
    throw new Error("DOCX Next invalid authored polygon");
  const points: { x: number; y: number }[] = [];
  let index = 0,
    x = 0,
    y = 0;
  const coordinate = () => {
    const token = tokens[index++];
    if (!token || !/^-?\d+(?:\.\d+)?$/.test(token))
      throw new Error("DOCX Next invalid authored polygon");
    const value = Number(token);
    if (!Number.isFinite(value) || value < 0 || value > 100)
      throw new Error("DOCX Next invalid authored polygon");
    return value;
  };
  while (index < tokens.length) {
    const command = tokens[index++];
    if (command === "Z") {
      if (index !== tokens.length || points.length < 3)
        throw new Error("DOCX Next invalid authored polygon");
      points.push({ ...points[0] });
    } else {
      if ((!points.length && command !== "M") || (points.length && command === "M"))
        throw new Error("DOCX Next invalid authored polygon");
      if (command === "M" || command === "L") {
        x = coordinate();
        y = coordinate();
      } else if (command === "H") x = coordinate();
      else if (command === "V") y = coordinate();
      else throw new Error("DOCX Next invalid authored polygon");
      points.push({ x, y });
    }
  }
  const result = points.map((point, i) => `${i ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
  shapePathPoints(result);
  return result;
}
/** Bounded absolute geometry only: cubic contours are reusable decoration, never SVG markup. */
export function decorationPathSegments(path: string): DecorationPathSegment[] {
  if (!path.includes("C"))
    return shapePathPoints(path).map((point, index) => ({
      command: index ? "L" : "M",
      coordinates: [point.x, point.y],
    }));
  const pattern = /([MLC])\s*((?:-?\d+(?:\.\d+)?\s*)+)/g;
  const matches = [...path.matchAll(pattern)];
  const segments = matches.map((match) => ({
    command: match[1] as DecorationPathSegment["command"],
    coordinates: match[2].trim().split(/\s+/).map(Number),
  }));
  if (
    segments.length < 2 ||
    segments.length > 10000 ||
    segments[0].command !== "M" ||
    path.replace(pattern, "").trim() ||
    segments.some(
      (segment, index) =>
        (index > 0 && segment.command === "M") ||
        segment.coordinates.length !== (segment.command === "C" ? 6 : 2) ||
        segment.coordinates.some((value) => !Number.isFinite(value) || value < 0 || value > 100),
    )
  )
    throw new Error("DOCX Next invalid decorative path");
  return segments;
}
export function validateDecoration(shape: DecorationPaint): void {
  if (
    shape.paintLayer !== undefined &&
    (!Number.isSafeInteger(shape.paintLayer) ||
      shape.paintLayer < 1 ||
      shape.paintLayer > 2147483647)
  )
    throw new Error(`DOCX Next invalid decoration paint layer ${shape.id}`);
  const fill = shape.fill;
  if (
    fill?.stops &&
    (fill.endColor ||
      fill.radialFade ||
      fill.startPct !== undefined ||
      fill.endPct !== undefined ||
      fill.stops.length < 2 ||
      fill.stops.length > 32 ||
      fill.stops.some(
        (stop, index) =>
          !hex(stop.color) ||
          !Number.isFinite(stop.offsetPct) ||
          stop.offsetPct < -100 ||
          stop.offsetPct > 200 ||
          (index > 0 && stop.offsetPct <= fill.stops![index - 1].offsetPct),
      ))
  )
    throw new Error(`DOCX Next invalid gradient stops ${shape.id}`);
  if (
    fill?.radialFade &&
    (fill.endColor ||
      fill.angleDeg !== undefined ||
      fill.startPct !== undefined ||
      fill.endPct !== undefined ||
      ![fill.radialFade.innerPct, fill.radialFade.outerPct].every(Number.isFinite) ||
      fill.radialFade.innerPct < 0 ||
      fill.radialFade.outerPct > 100 ||
      fill.radialFade.innerPct >= fill.radialFade.outerPct)
  )
    throw new Error(`DOCX Next invalid radial fade ${shape.id}`);
  if (
    shape.cornerRadiiMm &&
    (shape.shape !== "rect" ||
      shape.cornerRadiiMm.length !== 4 ||
      shape.cornerRadiiMm.some((radius) => !Number.isFinite(radius) || radius < 0))
  )
    throw new Error(`DOCX Next invalid decoration corners ${shape.id}`);
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
  if (shape.shape === "path") decorationPathSegments(shape.path ?? "");
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
    if (shape.fill.radialFade) {
      const gradient = context.createRadialGradient(
        shape.widthMm / 2,
        shape.heightMm / 2,
        0,
        shape.widthMm / 2,
        shape.heightMm / 2,
        Math.min(shape.widthMm, shape.heightMm) / 2,
      );
      gradient.addColorStop(shape.fill.radialFade.innerPct / 100, `#${shape.fill.color}`);
      gradient.addColorStop(shape.fill.radialFade.outerPct / 100, `#${shape.fill.color}00`);
      paint = gradient;
    } else if (shape.fill.stops) {
      const angle = ((shape.fill.angleDeg ?? 135) * Math.PI) / 180;
      const dx = Math.sin(angle),
        dy = -Math.cos(angle);
      const half = (Math.abs(dx) * shape.widthMm + Math.abs(dy) * shape.heightMm) / 2;
      const first = shape.fill.stops[0].offsetPct / 100;
      const last = shape.fill.stops[shape.fill.stops.length - 1].offsetPct / 100;
      const gradient = context.createLinearGradient(
        shape.widthMm / 2 + dx * half * (2 * first - 1),
        shape.heightMm / 2 + dy * half * (2 * first - 1),
        shape.widthMm / 2 + dx * half * (2 * last - 1),
        shape.heightMm / 2 + dy * half * (2 * last - 1),
      );
      for (const stop of shape.fill.stops)
        gradient.addColorStop((stop.offsetPct / 100 - first) / (last - first), `#${stop.color}`);
      paint = gradient;
    } else if (shape.fill.endColor) {
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
        shape.cornerRadiiMm
          ? [...shape.cornerRadiiMm]
          : Math.min(
              shape.radiusMm,
              (Math.min(shape.widthMm, shape.heightMm) - shape.stroke.widthMm) / 2,
            ),
      );
    else {
      decorationPathSegments(shape.path!).forEach((segment) => {
        const coordinates = segment.coordinates.map((value, index) => {
          const extent = index % 2 ? shape.heightMm : shape.widthMm;
          return Math.max(inset, Math.min(extent - inset, (value * extent) / 100));
        });
        if (segment.command === "C")
          context.bezierCurveTo(
            coordinates[0],
            coordinates[1],
            coordinates[2],
            coordinates[3],
            coordinates[4],
            coordinates[5],
          );
        else if (segment.command === "L") context.lineTo(coordinates[0], coordinates[1]);
        else context.moveTo(coordinates[0], coordinates[1]);
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

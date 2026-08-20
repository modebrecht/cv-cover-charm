import type { CSSProperties } from "react";
import type { BlockStyle } from "@/components/cover/types";

export type DossierPhotoShape = "rect" | "square" | "portrait" | "circle";

export type DossierPhotoStyle = {
  shape: DossierPhotoShape;
  zoom: number;
  x: number;
  y: number;
  borderWidth: number;
};

export const DOSSIER_PHOTO_SHAPES: Array<{ id: DossierPhotoShape; label: string }> = [
  { id: "rect", label: "Rechteck" },
  { id: "square", label: "Quadrat" },
  { id: "portrait", label: "Hochportrait" },
  { id: "circle", label: "Kreis" },
];

export const DEFAULT_DOSSIER_PHOTO_STYLE: DossierPhotoStyle = {
  shape: "portrait",
  zoom: 1,
  x: 50,
  y: 50,
  borderWidth: 0.3,
};

const SHAPE_GEOMETRY: Record<DossierPhotoShape, { ratio: number; radius: number }> = {
  rect: { ratio: 0.75, radius: 1.5 },
  square: { ratio: 1, radius: 1.5 },
  portrait: { ratio: 1.25, radius: 1.5 },
  circle: { ratio: 1, radius: 999 },
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function normalizeDossierPhotoStyle(
  value?: Partial<DossierPhotoStyle> | null,
): DossierPhotoStyle {
  const shape = DOSSIER_PHOTO_SHAPES.some((item) => item.id === value?.shape)
    ? (value!.shape as DossierPhotoShape)
    : DEFAULT_DOSSIER_PHOTO_STYLE.shape;
  return {
    shape,
    zoom: clamp(Number(value?.zoom ?? 1) || 1, 1, 3),
    x: clamp(Number(value?.x ?? 50) || 50, 0, 100),
    y: clamp(Number(value?.y ?? 50) || 50, 0, 100),
    borderWidth: clamp(Number(value?.borderWidth ?? 0.3) || 0, 0, 6),
  };
}

export function shapeFromBlockStyle(style?: Partial<BlockStyle> | null): DossierPhotoShape {
  if (!style) return DEFAULT_DOSSIER_PHOTO_STYLE.shape;
  if ((style.radius ?? 0) >= 999) return "circle";
  const ratio = style.ratio ?? 1;
  if (ratio < 0.9) return "rect";
  if (ratio > 1.1) return "portrait";
  return "square";
}

export function dossierPhotoStyleFromBlockStyle(
  style?: Partial<BlockStyle> | null,
): DossierPhotoStyle {
  return normalizeDossierPhotoStyle({
    shape: shapeFromBlockStyle(style),
    zoom: style?.imgZoom,
    x: style?.imgX,
    y: style?.imgY,
    borderWidth: style?.borderWidth,
  });
}

export function dossierPhotoPatchToBlockStyle(
  patch: Partial<DossierPhotoStyle>,
  current?: Partial<DossierPhotoStyle> | null,
): Partial<BlockStyle> {
  const next = normalizeDossierPhotoStyle({ ...current, ...patch });
  const geometry = SHAPE_GEOMETRY[next.shape];
  return {
    ratio: geometry.ratio,
    radius: geometry.radius,
    imgZoom: next.zoom,
    imgX: next.x,
    imgY: next.y,
    borderWidth: next.borderWidth,
  };
}

/** Same crop math for title page, CV preview and CV renderer. */
export function dossierPhotoCropStyle(style: DossierPhotoStyle): CSSProperties {
  const normalized = normalizeDossierPhotoStyle(style);
  const zoom = normalized.zoom;
  return {
    position: "absolute",
    width: `${zoom * 100}%`,
    height: `${zoom * 100}%`,
    maxWidth: "none",
    maxHeight: "none",
    left: `${-(zoom - 1) * normalized.x}%`,
    top: `${-(zoom - 1) * normalized.y}%`,
    objectFit: "cover",
    display: "block",
  };
}

export function dossierPhotoRadius(shape: DossierPhotoShape): string {
  return shape === "circle" ? "9999px" : `${SHAPE_GEOMETRY[shape].radius}mm`;
}

export function dossierPhotoRatio(shape: DossierPhotoShape): number {
  return SHAPE_GEOMETRY[shape].ratio;
}

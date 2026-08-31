import type { Block, BlockStyle, ShapeKind, TemplateId } from "./types";
import type { StyleOverrides } from "./layouts-base";

type DecorSpec = {
  id: string;
  label: string;
  shape: ShapeKind;
  x: number;
  y: number;
  w: number;
  h?: number;
  color: string;
  fill?: string | null;
  opacity?: number;
  strokeWidth?: number;
  radius?: number;
  gradFrom?: string | null;
  gradTo?: string;
  gradAngle?: number;
};

const baseStyle: BlockStyle = {
  x: 0,
  y: 0,
  w: 10,
  size: 1,
  color: "primary",
  align: "left",
  weight: 400,
  italic: false,
  underline: false,
  uppercase: false,
  tracking: 0,
  lineHeight: 1,
  opacity: 1,
  font: "sans",
  hidden: false,
  list: "none",
  bg: null,
  padX: 0,
  padY: 0,
  bgRadius: 0,
};

const rect = (
  id: string,
  label: string,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  opacity = 1,
): DecorSpec => ({
  id,
  label,
  shape: "rect",
  x,
  y,
  w,
  h,
  color,
  fill: color,
  strokeWidth: 0,
  opacity,
});

const circle = (
  id: string,
  label: string,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  opacity = 1,
): DecorSpec => ({
  id,
  label,
  shape: "circle",
  x,
  y,
  w,
  h,
  color,
  fill: color,
  strokeWidth: 0,
  opacity,
});

const line = (
  id: string,
  label: string,
  x: number,
  y: number,
  w: number,
  thickness: number,
  color: string,
  opacity = 1,
): DecorSpec => ({
  id,
  label,
  shape: "line",
  x,
  y,
  w,
  h: 0,
  color,
  fill: null,
  strokeWidth: thickness,
  opacity,
});

/**
 * Simple visual primitives that belong to a template but should behave like
 * normal editor elements. Full-page backgrounds, frames, clipped hero masks
 * and other complex structural artwork deliberately stay in CoverBackground.
 */
const DECORATIONS: Partial<Record<string, DecorSpec[]>> = {
  modern: [
    // Modern bleibt bewusst ruhig: nur die weiche Kreisfläche, keine
    // dekorativen Striche oder Farbbänder im Bewerbungsdossier.
    circle("modernAccentCircle", "Kreisfläche", 112, 25, 86, 86, "accent", 0.1),
  ],

  edel: [line("decor-center-line", "Akzentstrich", 85, 196, 40, 0.159, "accent", 0.7)],

  colorful: [
    rect("decor-top-band", "Kopfband", 0, 0, 210, 28, "primary"),
    rect("decor-left-field", "Linke Farbfläche", 0, 28, 70, 80, "secondary"),
    rect("decor-middle-field", "Mittlere Farbfläche", 70, 28, 45, 80, "tertiary"),
    rect("decor-accent-bar", "Akzentbalken", 18, 112, 24, 3, "primary"),
    rect("decor-bottom-band", "Unteres Farbband", 0, 289, 210, 8, "secondary"),
  ],

  blockig: [
    rect("decor-top-block", "Kopfblock", 0, 0, 105, 30, "primary"),
    rect("decor-side-block", "Farbfläche", 0, 46, 105, 72, "accent", 0.9),
    rect("decor-accent-bar", "Akzentbalken", 18, 124, 18, 2.5, "primary"),
  ],

  edelBlockig: [
    rect("decor-top-band", "Kopfband", 0, 0, 210, 36, "primary"),
    line("decor-top-rule", "Obere Trennlinie", 0, 36, 210, 0.159, "accent", 0.7),
    rect("decor-vertical-rule", "Vertikale Trennlinie", 78, 48, 0.6, 82, "accent", 0.5),
    rect("decor-bottom-field", "Fussfläche", 0, 232, 210, 65, "primary"),
  ],

  serioes: [
    rect("decor-top-band", "Kopfband", 0, 0, 210, 6, "primary"),
    line("decor-header-rule", "Kopf-Trennlinie", 20, 36, 170, 0.132, "accent"),
    rect("decor-bottom-band", "Unteres Farbband", 0, 294, 210, 3, "primary"),
  ],

  human: [
    circle("decor-organic-top", "Obere Kreisfläche", -40, -70, 190, 150, "secondary", 0.85),
    circle("decor-organic-bottom", "Untere Kreisfläche", 135, 222, 120, 120, "secondary", 0.6),
    line("decor-accent-line", "Akzentstrich", 20, 140, 30, 1.2, "primary", 0.7),
  ],

  welle: [
    // Linie und Farbfeld teilen sich dieselbe Kante; das Farbfeld reicht bis A4 unten.
    rect("decor-bottom-field", "Unteres Farbfeld", 0, 176, 210, 121, "primary"),
    line("decor-horizon-rule", "Horizontlinie", 0, 176, 210, 0.6, "secondary"),
    line("decor-accent-line", "Akzentstrich", 22, 22, 24, 0.8, "secondary"),
  ],

  terracotta: [
    rect("decor-side-column", "Farbspalte", 0, 0, 70, 297, "primary"),
    rect("decor-column-edge", "Spaltenkante", 66, 0, 1.2, 297, "secondary", 0.9),
    line("decor-accent-line", "Akzentstrich", 82, 190, 30, 0.4, "primary", 0.5),
  ],

  sonne: [
    rect("decor-top-field", "Kopffläche", 0, 0, 210, 118, "primary"),
    circle("decor-photo-circle", "Helle Kreisfläche", 104, 6, 98, 98, "bg"),
    circle("decor-bottom-circle", "Untere Kreisfläche", 96, 196, 180, 180, "primary"),
  ],

  studio: [
    rect("decor-side-column", "Dunkle Spalte", 0, 0, 72, 297, "primary"),
    rect("decor-name-band", "Farbbanner", 72, 24, 138, 38, "accent"),
    rect("decor-accent-bar", "Akzentbalken", 84, 84, 26, 1.4, "accent"),
    circle("decor-soft-circle", "Kreisfläche", 112, 128, 92, 92, "accent", 0.22),
    rect("decor-bottom-band", "Unteres Farbband", 72, 291, 138, 6, "accent"),
  ],

  neon: [
    {
      ...circle("decor-blob-one", "Verlaufsfläche 1", -45, -40, 150, 130, "primary", 0.95),
      gradFrom: "secondary",
      gradTo: "primary",
      gradAngle: 135,
    },
    {
      ...circle("decor-blob-two", "Verlaufsfläche 2", 126, 138, 112, 108, "primary", 0.8),
      gradFrom: "secondary",
      gradTo: "primary",
      gradAngle: 135,
    },
    {
      ...circle("decor-blob-three", "Verlaufsfläche 3", 20, 196, 36, 36, "primary", 0.5),
      gradFrom: "secondary",
      gradTo: "primary",
      gradAngle: 135,
    },
  ],

  aurora: [
    {
      ...rect("decor-accent-line", "Akzentband", 20, 150, 26, 1.6, "primary"),
      gradFrom: "primary",
      gradTo: "secondary",
      gradAngle: 90,
    },
    {
      ...rect("decor-bottom-band", "Unteres Farbband", 0, 292, 210, 5, "primary"),
      gradFrom: "primary",
      gradTo: "secondary",
      gradAngle: 90,
    },
  ],

  verlauf: [
    circle("decor-soft-circle-left", "Kreisfläche links", -30, 168, 150, 150, "bg", 0.1),
    circle("decor-soft-circle-right", "Kreisfläche rechts", 128, -24, 110, 110, "bg", 0.12),
  ],

  pastell: [
    rect("decor-top-band", "Kopfband", 0, 0, 210, 8, "primary"),
    line("decor-middle-rule", "Mittlere Linie", 12, 150, 186, 0.3, "primary", 0.3),
    circle("decor-bottom-ellipse", "Untere Kreisfläche", -30, 237, 160, 120, "secondary", 0.5),
  ],

  freundlich: [
    rect("decor-top-field", "Kopffläche", 0, 0, 210, 115, "primary"),
    circle("decor-large-circle", "Grosse Kreisfläche", 90, -40, 160, 160, "secondary", 0.9),
    circle("decor-small-circle", "Kleine Kreisfläche", -25, 60, 80, 80, "secondary", 0.55),
  ],
};

function blockFromSpec(spec: DecorSpec, overrides: StyleOverrides): Block {
  const ratio = spec.h === undefined || spec.shape === "line" ? 0 : spec.h / Math.max(spec.w, 0.01);
  const fill = spec.fill !== undefined ? spec.fill : spec.shape === "line" ? null : spec.color;
  return {
    id: spec.id,
    label: spec.label,
    kind: "shape",
    shape: spec.shape,
    lines: [],
    style: {
      ...baseStyle,
      x: spec.x,
      y: spec.y,
      w: spec.w,
      ratio,
      color: spec.color,
      fill,
      opacity: spec.opacity ?? 1,
      strokeWidth: spec.strokeWidth ?? (spec.shape === "line" ? 0.4 : 0),
      bgRadius: spec.radius ?? 0,
      gradFrom: spec.gradFrom,
      gradTo: spec.gradTo,
      gradAngle: spec.gradAngle,
      ...(overrides[spec.id] ?? {}),
    },
  };
}

export function templateDecorations(template: TemplateId, overrides: StyleOverrides): Block[] {
  return (DECORATIONS[template as string] ?? []).map((spec) => blockFromSpec(spec, overrides));
}

import type { BlockStyle, ColorSlot, CustomField, ShapeKind, TemplateId } from "./types";

/**
 * Wo ein neu hinzugefügtes Element landet und in welcher Farbe.
 *
 * Ohne diese Tabelle bekam jedes neue Feld die Textfarbe der Vorlage und
 * landete auf einer festen Position – auf Vorlagen mit dunklen Flächen war es
 * dann dunkel auf dunkel und schlicht unsichtbar. Die Werte zeigen jeweils auf
 * einen freien Bereich der Vorlage; `color` ist ein Slot, der sich dort
 * abhebt.
 */
type Spot = { x: number; y: number; color: string };

const SPOTS: Partial<Record<TemplateId, Spot>> = {
  klassisch: { x: 55, y: 215, color: "ink" },
  modern: { x: 55, y: 200, color: "primary" },
  freundlich: { x: 55, y: 200, color: "ink" },
  edel: { x: 55, y: 205, color: "ink" },
  colorful: { x: 55, y: 200, color: "ink" },
  blockig: { x: 55, y: 205, color: "ink" },
  edelBlockig: { x: 55, y: 150, color: "ink" },
  serioes: { x: 55, y: 205, color: "ink" },
  human: { x: 55, y: 200, color: "ink" },
  sonnig: { x: 55, y: 200, color: "ink" },
  // dunkles Band ab 180mm – darüber bleiben
  welle: { x: 55, y: 145, color: "ink" },
  // linke Farbspalte meiden
  terracotta: { x: 85, y: 225, color: "ink" },
  pastell: { x: 55, y: 200, color: "ink" },
  // dunkle Fläche ab 118mm, dort ist "light" die lesbare Farbe
  sonne: { x: 55, y: 155, color: "light" },
  studio: { x: 85, y: 130, color: "ink" },
  neon: { x: 55, y: 195, color: "ink" },
  aurora: { x: 55, y: 195, color: "ink" },
  verlauf: { x: 55, y: 200, color: "ink" },
  citrus: { x: 55, y: 200, color: "ink" },
};

const FALLBACK: Spot = { x: 55, y: 200, color: "ink" };

/** Erster vorhandener Slot aus der Wunschliste. */
function pickSlot(slots: ColorSlot[], wanted: string[]): string {
  return wanted.find((w) => slots.some((s) => s.key === w)) ?? slots[0].key;
}

export function newElementSpot(
  template: TemplateId,
  slots: ColorSlot[],
  index: number,
): Spot & { shapeColor: string } {
  const spot = SPOTS[template] ?? FALLBACK;
  return {
    x: spot.x,
    // versetzt stapeln, aber nach sechs Elementen wieder von vorn – sonst
    // wandern weitere Elemente aus dem Blatt heraus
    y: spot.y + (index % 6) * 8,
    color: pickSlot(slots, [spot.color, "ink", "primary"]),
    shapeColor: pickSlot(slots, ["accent", "primary", "secondary", "ink"]),
  };
}

/* -------------------------------------------------------------------------- */
/* Neue Elemente anlegen – gleich für Titelblatt und Lebenslauf               */
/* -------------------------------------------------------------------------- */

export const SHAPE_LABEL: Record<ShapeKind, string> = {
  circle: "Kreis",
  rect: "Rechteck",
  line: "Linie",
  path: "Freihand",
};

/** "Eigenes Feld 1", "Eigenes Feld 2", … – fortlaufend je Art. */
export function nextLabel(existing: CustomField[], base: string): string {
  const used = existing
    .map((c) => new RegExp(`^${base} (\\d+)$`).exec(c.label)?.[1])
    .filter(Boolean)
    .map(Number);
  return `${base} ${(used.length ? Math.max(...used) : 0) + 1}`;
}

/**
 * Ein frisch angelegtes Element: der Inhalt und die Abweichungen von der
 * Vorgabe der Vorlage.
 *
 * Beide Blätter legen Elemente gleich an, verwahren die Stil-Abweichungen aber
 * verschieden – das Titelblatt je Vorlage, der Lebenslauf in einer Ablage. Was
 * ein neues Element ausmacht, steht darum hier und nicht zweimal in den Routen.
 */
export type NewElement = { field: CustomField; style?: Partial<BlockStyle> };

const freshId = () => `custom-${Date.now()}`;

export function newTextElement(existing: CustomField[], pillSlot?: string): NewElement {
  const field: CustomField = {
    id: freshId(),
    label: nextLabel(existing, pillSlot ? "Pille" : "Eigenes Feld"),
    text: pillSlot ? "Neue Pille" : "Neuer Text",
    kind: "text",
  };
  // Pille: Textfeld mit Hintergrund, schrumpft auf die Textbreite.
  return pillSlot
    ? {
        field,
        style: {
          bg: pillSlot,
          color: "bg",
          weight: 700,
          align: "center",
          padX: 5,
          padY: 1.8,
          bgRadius: 999,
        },
      }
    : { field };
}

export function newShapeElement(existing: CustomField[], shape: ShapeKind): NewElement {
  return {
    field: {
      id: freshId(),
      label: nextLabel(existing, SHAPE_LABEL[shape]),
      text: "",
      kind: "shape",
      shape,
    },
  };
}

export function newImageElement(existing: CustomField[]): NewElement {
  return {
    field: {
      id: freshId(),
      label: nextLabel(existing, "Bild"),
      text: "",
      kind: "image",
      src: null,
    },
  };
}

/**
 * Trennlinie über die ganze Textbreite. Technisch dieselbe Form wie "Linie",
 * nur breit voreingestellt – als Trenner über Fussangaben der Normalfall.
 */
export function newRuleElement(existing: CustomField[]): NewElement {
  return {
    field: {
      id: freshId(),
      label: nextLabel(existing, "Trennlinie"),
      text: "",
      kind: "shape",
      shape: "line",
    },
    style: { x: 20, w: 170, strokeWidth: 0.3, opacity: 0.35 },
  };
}

/** Freihand-Zug in eine Form umrechnen (Pfad normiert auf 0–100). */
export function newDrawnElement(
  existing: CustomField[],
  points: { x: number; y: number }[],
  minSize: number,
): NewElement {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const w = Math.max(Math.max(...xs) - minX, minSize);
  const h = Math.max(Math.max(...ys) - minY, minSize);
  const path = points
    .map((p, i) => {
      const nx = ((p.x - minX) / w) * 100;
      const ny = ((p.y - minY) / h) * 100;
      return `${i === 0 ? "M" : "L"}${nx.toFixed(2)} ${ny.toFixed(2)}`;
    })
    .join(" ");

  return {
    field: {
      id: freshId(),
      label: nextLabel(existing, "Freihand"),
      text: "",
      kind: "shape",
      shape: "path",
      path,
    },
    style: { x: Math.round(minX * 10) / 10, y: Math.round(minY * 10) / 10, w, ratio: h / w },
  };
}

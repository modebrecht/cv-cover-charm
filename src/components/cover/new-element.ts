import type { ColorSlot, TemplateId } from "./types";

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

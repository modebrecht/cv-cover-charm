import type { ColorSlot } from "./types";

/**
 * Farbvarianten je Vorlage.
 *
 * Statt für jede der Vorlagen vier Paletten von Hand zu pflegen, wird der
 * Farbton aller *bunten* Slots gemeinsam gedreht. Neutrale Slots (Papierweiss,
 * fast schwarzer Text, dunkle Flächen) bleiben unverändert – dadurch behält
 * jede Vorlage ihren Hell-Dunkel-Aufbau und damit die Lesbarkeit, egal welche
 * Variante gewählt ist.
 */

type Hsl = { h: number; s: number; l: number };

function hexToHsl(hex: string): Hsl {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.replace(/./g, (c) => c + c) : m;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}

function hslToHex({ h, s, l }: Hsl): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** Fast graue oder sehr helle/dunkle Farben sind Struktur, nicht Charakter. */
function isNeutral({ s, l }: Hsl): boolean {
  return s < 0.18 || l > 0.93 || l < 0.12;
}

export type Palette = { name: string; colors: Record<string, string> };

/** Zielfarbtöne der Varianten – der Name beschreibt, wo die Hauptfarbe landet. */
const VARIANTS: { name: string; hue: number }[] = [
  { name: "Blau", hue: 214 },
  { name: "Türkis", hue: 176 },
  { name: "Grün", hue: 148 },
  { name: "Limette", hue: 92 },
  { name: "Orange", hue: 30 },
  { name: "Rot", hue: 356 },
  { name: "Beere", hue: 322 },
];

/** Acht Paletten: das Original der Vorlage plus sieben Farbton-Varianten. */
export function palettesFor(slots: ColorSlot[]): Palette[] {
  const original = Object.fromEntries(slots.map((s) => [s.key, s.default]));
  const parsed = slots.map((s) => ({ key: s.key, hsl: hexToHsl(s.default) }));
  const lead = parsed.find((p) => !isNeutral(p.hsl));

  const variants = VARIANTS.map(({ name, hue }) => {
    // ohne bunten Slot gibt es nichts zu drehen – Original zurückgeben
    const delta = lead ? hue - lead.hsl.h : 0;
    const colors = Object.fromEntries(
      parsed.map(({ key, hsl }) => [
        key,
        isNeutral(hsl) ? hslToHex(hsl) : hslToHex({ ...hsl, h: (hsl.h + delta + 360) % 360 }),
      ]),
    );
    return { name, colors };
  });

  return [{ name: "Original", colors: original }, ...variants];
}

/** Passt die aktuelle Farbwahl zu einer Palette? */
export function isActive(colors: Record<string, string>, palette: Palette): boolean {
  return Object.entries(palette.colors).every(
    ([k, v]) => (colors[k] ?? "").toLowerCase() === v.toLowerCase(),
  );
}

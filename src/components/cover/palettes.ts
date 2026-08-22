import type { ColorSlot } from "./types";

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

/** Very pale, very dark and low-saturation slots are structural by default. */
function isNeutral({ s, l }: Hsl): boolean {
  return s < 0.18 || l > 0.93 || l < 0.12;
}

export type Palette = { name: string; colors: Record<string, string> };

type PaperMood = {
  hue: number;
  saturation: number;
  /** Noticeably tinted but still calm/printable on light templates. */
  lightness: number;
  /** Dark templates stay dark so their contrast logic is not inverted. */
  darkLightness: number;
};

type Variant = {
  name: string;
  hue: number;
  paper?: PaperMood;
};

/**
 * Twelve useful choices on every template:
 * - the first four keep the template background EXACTLY unchanged;
 * - the remaining eight use genuinely different, coordinated backgrounds.
 *
 * Dark templates receive dark versions of the paper moods instead of being
 * flipped onto a light page. This preserves the original contrast concept.
 */
const VARIANTS: Variant[] = [
  { name: "Kühl", hue: 214 },
  { name: "Türkis", hue: 176 },
  { name: "Grün", hue: 148 },
  {
    name: "Blaugrau",
    hue: 218,
    paper: { hue: 216, saturation: 0.34, lightness: 0.85, darkLightness: 0.17 },
  },
  {
    name: "Salbei",
    hue: 154,
    paper: { hue: 148, saturation: 0.27, lightness: 0.85, darkLightness: 0.18 },
  },
  {
    name: "Sand",
    hue: 27,
    paper: { hue: 38, saturation: 0.38, lightness: 0.85, darkLightness: 0.19 },
  },
  {
    name: "Rosé",
    hue: 336,
    paper: { hue: 348, saturation: 0.32, lightness: 0.85, darkLightness: 0.18 },
  },
  {
    name: "Lavendel",
    hue: 267,
    paper: { hue: 264, saturation: 0.3, lightness: 0.85, darkLightness: 0.18 },
  },
  {
    name: "Eis",
    hue: 193,
    paper: { hue: 194, saturation: 0.36, lightness: 0.85, darkLightness: 0.17 },
  },
  {
    name: "Pfirsich",
    hue: 15,
    paper: { hue: 19, saturation: 0.42, lightness: 0.85, darkLightness: 0.19 },
  },
  {
    name: "Olive",
    hue: 92,
    paper: { hue: 82, saturation: 0.27, lightness: 0.84, darkLightness: 0.18 },
  },
];

function paperColor(originalBackground: Hsl, mood: PaperMood): Hsl {
  const darkTemplate = originalBackground.l < 0.45;
  return {
    h: mood.hue,
    s: mood.saturation,
    l: darkTemplate ? mood.darkLightness : mood.lightness,
  };
}

function variantColors(
  parsed: { key: string; hsl: Hsl }[],
  lead: { key: string; hsl: Hsl } | undefined,
  variant: Variant,
): Record<string, string> {
  const delta = lead ? variant.hue - lead.hsl.h : 0;
  const originalBg = parsed.find((entry) => entry.key === "bg")?.hsl ?? { h: 0, s: 0, l: 1 };
  const paper = variant.paper ? paperColor(originalBg, variant.paper) : null;

  return Object.fromEntries(
    parsed.map(({ key, hsl }) => {
      if (key === "bg" && paper) return [key, hslToHex(paper)];

      if (key === "ink" && paper) {
        const darkInk = paper.l >= 0.55;
        return [
          key,
          hslToHex({
            h: paper.h,
            s: darkInk ? 0.2 : 0.08,
            l: darkInk ? 0.14 : 0.94,
          }),
        ];
      }

      if (isNeutral(hsl)) return [key, hslToHex(hsl)];
      return [key, hslToHex({ ...hsl, h: (hsl.h + delta + 360) % 360 })];
    }),
  );
}

export function palettesFor(slots: ColorSlot[]): Palette[] {
  const original = Object.fromEntries(slots.map((s) => [s.key, s.default]));
  const parsed = slots.map((s) => ({ key: s.key, hsl: hexToHsl(s.default) }));
  const lead =
    parsed.find((p) => p.key !== "bg" && p.key !== "ink" && !isNeutral(p.hsl)) ??
    parsed.find((p) => !isNeutral(p.hsl));
  const variants = VARIANTS.map((variant) => ({
    name: variant.name,
    colors: variantColors(parsed, lead, variant),
  }));

  return [{ name: "Original", colors: original }, ...variants];
}

export function isActive(colors: Record<string, string>, palette: Palette): boolean {
  return Object.entries(palette.colors).every(
    ([k, v]) => (colors[k] ?? "").toLowerCase() === v.toLowerCase(),
  );
}

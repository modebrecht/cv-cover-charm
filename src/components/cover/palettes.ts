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

type Variant = {
  name: string;
  hue: number;
  /** A tinted paper makes the second row visually different while staying printable. */
  paper?: { hue: number; saturation: number; lightness: number };
};

/**
 * Eight useful choices on every template:
 * - row one keeps the template's original paper/background and changes its character colours;
 * - row two also introduces a coordinated, still print-safe paper tint.
 *
 * Names are retained for accessibility/tooltips but the chooser presents the palettes visually.
 */
const VARIANTS: Variant[] = [
  { name: "Kühl", hue: 214 },
  { name: "Türkis", hue: 176 },
  { name: "Grün", hue: 148 },
  { name: "Nebel", hue: 218, paper: { hue: 218, saturation: 0.28, lightness: 0.91 } },
  { name: "Salbei", hue: 154, paper: { hue: 150, saturation: 0.22, lightness: 0.9 } },
  { name: "Sand", hue: 31, paper: { hue: 38, saturation: 0.32, lightness: 0.9 } },
  { name: "Rosé", hue: 344, paper: { hue: 350, saturation: 0.3, lightness: 0.91 } },
];

function variantColors(
  parsed: { key: string; hsl: Hsl }[],
  lead: { key: string; hsl: Hsl } | undefined,
  variant: Variant,
): Record<string, string> {
  const delta = lead ? variant.hue - lead.hsl.h : 0;

  return Object.fromEntries(
    parsed.map(({ key, hsl }) => {
      if (key === "bg" && variant.paper) return [key, hslToHex({ h: variant.paper.hue, s: variant.paper.saturation, l: variant.paper.lightness })];

      // On tinted paper, give the normal body ink a very subtle relation to the paper.
      // It stays dark enough for applications/printing and does not invert the design.
      if (key === "ink" && variant.paper && hsl.l < 0.5) {
        return [key, hslToHex({ h: variant.paper.hue, s: Math.max(0.12, Math.min(hsl.s, 0.28)), l: Math.min(hsl.l, 0.18) })];
      }

      if (isNeutral(hsl)) return [key, hslToHex(hsl)];
      return [key, hslToHex({ ...hsl, h: (hsl.h + delta + 360) % 360 })];
    }),
  );
}

export function palettesFor(slots: ColorSlot[]): Palette[] {
  const original = Object.fromEntries(slots.map((s) => [s.key, s.default]));
  const parsed = slots.map((s) => ({ key: s.key, hsl: hexToHsl(s.default) }));
  const lead = parsed.find((p) => p.key !== "bg" && p.key !== "ink" && !isNeutral(p.hsl)) ?? parsed.find((p) => !isNeutral(p.hsl));
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

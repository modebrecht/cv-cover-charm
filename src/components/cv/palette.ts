/**
 * Farben einer Vorlage für den Lebenslauf nutzbar machen.
 *
 * Das Titelblatt darf dunkel sein – ein Lebenslauf wird gelesen und gedruckt
 * und braucht helles Papier. Der Hintergrund der Vorlage liegt hier nur blass
 * darüber, die Schrift kommt also auf Weiss zu liegen. Eine helle Vorlagen-
 * Textfarbe (gedacht für dunklen Grund) wäre dort unlesbar; darum werden die
 * Farben hier auf Lesbarkeit geprüft und notfalls abgedunkelt.
 */

type Rgb = { r: number; g: number; b: number };

function parse(hex: string): Rgb | null {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.replace(/./g, (c) => c + c) : m;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

const toHex = ({ r, g, b }: Rgb) =>
  `#${[r, g, b]
    .map((v) =>
      Math.round(Math.max(0, Math.min(255, v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;

/** Relative Helligkeit nach WCAG. */
function luminance({ r, g, b }: Rgb): number {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Kontrast gegen Weiss – 4.5 gilt als gut lesbar, 3 reicht für Grosses. */
function contrastOnWhite(c: Rgb): number {
  return 1.05 / (luminance(c) + 0.05);
}

/** So weit abdunkeln, bis der Kontrast auf Weiss reicht. */
function darken(c: Rgb, target: number): Rgb {
  let out = c;
  for (let i = 0; i < 24 && contrastOnWhite(out) < target; i++) {
    out = { r: out.r * 0.88, g: out.g * 0.88, b: out.b * 0.88 };
  }
  return out;
}

/** Erste vorhandene Farbe aus der Wunschliste. */
function pick(colors: Record<string, string>, keys: string[]): string | null {
  for (const k of keys) if (colors[k]) return colors[k];
  return null;
}

/**
 * Vorlagenfarben für den Hintergrund des Lebenslaufs anpassen.
 *
 * Nur so viel wie nötig: helle und mittlere Farben bleiben unangetastet, sonst
 * sähe man vom Design nichts mehr. Aufgehellt werden allein die wirklich
 * dunklen Vorlagen, die das Blatt sonst grau einfärben würden.
 */
export function softColors(colors: Record<string, string>): Record<string, string> {
  // Feste Schwelle, bewusst unabhängig vom Regler: würde sie mitwandern, hellte
  // ein kräftigerer Hintergrund die Farben im selben Mass wieder auf und der
  // Regler hätte gar keine sichtbare Wirkung mehr.
  const MIN_LUM = 0.45;

  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(colors)) {
    const c = parse(value);
    if (!c) {
      out[key] = value;
      continue;
    }
    let mixed = c;
    for (let i = 0; i < 40 && luminance(mixed) < MIN_LUM; i++) {
      mixed = {
        r: mixed.r + (255 - mixed.r) * 0.12,
        g: mixed.g + (255 - mixed.g) * 0.12,
        b: mixed.b + (255 - mixed.b) * 0.12,
      };
    }
    out[key] = toHex(mixed);
  }
  return out;
}

export type CvPalette = {
  /** Fliesstext. */
  ink: string;
  /** Gedämpfter Text: Zeitangaben, Orte. */
  muted: string;
  /** Abschnittsüberschriften und Linien. */
  accent: string;
  /** Grundfarbe des Blattes – immer hell. */
  paper: string;
};

/**
 * Aus den Slots der Vorlage eine Palette bauen, die auf hellem Papier
 * funktioniert. `accent` behält den Charakter der Vorlage, wird aber
 * abgedunkelt, wenn er auf Weiss zu blass wäre.
 */
export function cvPalette(colors: Record<string, string>): CvPalette {
  const accentRaw = parse(pick(colors, ["accent", "primary", "secondary", "ink"]) ?? "#1f2937");
  const inkRaw = parse(pick(colors, ["ink", "primary", "accent"]) ?? "#111111");

  // Eine für dunklen Grund gedachte helle Textfarbe ist hier unbrauchbar.
  const ink = inkRaw && contrastOnWhite(inkRaw) >= 7 ? inkRaw : { r: 26, g: 26, b: 30 };
  const accent = accentRaw ? darken(accentRaw, 3.2) : { r: 31, g: 41, b: 55 };

  return {
    ink: toHex(ink),
    muted: toHex({ r: ink.r * 0.35 + 150, g: ink.g * 0.35 + 150, b: ink.b * 0.35 + 150 }),
    accent: toHex(accent),
    paper: "#ffffff",
  };
}

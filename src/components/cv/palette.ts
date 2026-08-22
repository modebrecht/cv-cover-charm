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

/** Kontrast zweier Farben nach WCAG. */
function contrast(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
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
  /** Abschnittsüberschriften und Linien – auch bei sehr hellen Vorlagen lesbar. */
  accent: string;
  /** Grundfarbe des Blattes – immer hell. */
  paper: string;
};

/**
 * Aus den Slots der Vorlage eine Palette bauen, die auf hellem Papier
 * funktioniert.
 *
 * Für automatisch erzeugte CV-Farben nehmen wir bewusst mehr Reserve als das
 * nackte WCAG-Minimum: kleine Zeitangaben und Orte werden sonst auf getöntem
 * Papier sowie im Ausdruck sichtbar zu blass. Wer im CV-Farbwähler eigene
 * Werte setzt, bekommt diese dagegen unverändert – eine bewusste Wahl soll
 * nicht heimlich umgefärbt werden.
 */
export function cvPalette(colors: Record<string, string>): CvPalette {
  const customInk = parse(colors.cvInk ?? "");
  const customMuted = parse(colors.cvMuted ?? "");
  const customAccent = parse(colors.cvHeading ?? "");

  const accentRaw = parse(pick(colors, ["accent", "primary", "secondary", "ink"]) ?? "#1f2937");
  const inkRaw = parse(pick(colors, ["ink", "primary", "accent"]) ?? "#111111");

  // Eine für dunklen Grund gedachte helle Textfarbe ist hier unbrauchbar.
  const automaticInk = inkRaw && contrastOnWhite(inkRaw) >= 8 ? inkRaw : { r: 26, g: 26, b: 30 };
  const ink = customInk ?? automaticInk;
  const accent =
    customAccent ?? (accentRaw ? darken(accentRaw, 5.5) : { r: 31, g: 41, b: 55 });

  // Sekundärtext soll zurücktreten, aber noch klar lesbar und druckfest sein.
  const mutedBase = {
    r: ink.r * 0.68 + 255 * 0.32,
    g: ink.g * 0.68 + 255 * 0.32,
    b: ink.b * 0.68 + 255 * 0.32,
  };
  const muted = customMuted ?? darken(mutedBase, 5.5);

  return {
    ink: toHex(ink),
    muted: toHex(muted),
    accent: toHex(accent),
    paper: paperFor(colors, ink),
  };
}

/**
 * Papierfarbe des Blattes – **aus der Vorlage**, nicht immer Weiss.
 *
 * Warm steht auf Creme (#fff9ef), Horizont auf gebrochenem Weiss. Zwang man
 * den Lebenslauf auf reines Weiss, unterschieden sich die beiden Blätter schon
 * vor dem ersten Strich. Übernommen wird die Farbe nur, solange sie hell genug
 * für dunkle Schrift bleibt; eine dunkle Vorlage bekommt weiterhin helles
 * Papier, weil ein Lebenslauf gelesen und gedruckt wird.
 */
function paperFor(colors: Record<string, string>, ink: Rgb): string {
  const bg = parse(colors.bg ?? "");
  if (!bg) return "#ffffff";
  if (luminance(bg) < 0.72) return "#ffffff";
  return contrast(ink, bg) >= 7 ? toHex(bg) : "#ffffff";
}

export type CvOnColor = {
  /** Grundfarbe der Fläche – unverändert, voll deckend. */
  bg: string;
  /** Schrift darauf: hell auf dunklem Grund, dunkel auf hellem. */
  ink: string;
  /** Zurückgenommene Schrift auf derselben Fläche. */
  muted: string;
  /** Linien und Überschriften auf derselben Fläche. */
  accent: string;
  /** Trennlinien und Rahmen auf derselben Fläche. */
  hairline: string;
};

const WHITE: Rgb = { r: 255, g: 255, b: 255 };
const NEAR_BLACK: Rgb = { r: 24, g: 24, b: 27 };

/** Richtung Weiss bzw. Schwarz mischen. */
function mix(c: Rgb, target: Rgb, amount: number): Rgb {
  return {
    r: c.r + (target.r - c.r) * amount,
    g: c.g + (target.g - c.g) * amount,
    b: c.b + (target.b - c.b) * amount,
  };
}

/**
 * Schriftfarben **auf** einer farbigen Fläche – Seitenspalte, Kopfband,
 * Kartengrund.
 *
 * Anders als `cvPalette` wird die Fläche hier nicht aufgehellt: sie behält den
 * Charakter des Titelblatts und bekommt stattdessen eine Schrift, die darauf
 * lesbar ist. Genau dieser Rollenwechsel ersetzt das frühere pauschale
 * Aufhellen, das aus jeder Vorlage dasselbe Pastell gemacht hat.
 */
export function onColorRoles(background: string, accentHint?: string): CvOnColor {
  const bg = parse(background) ?? NEAR_BLACK;
  const dark = contrast(bg, WHITE) >= contrast(bg, NEAR_BLACK);

  const ink = dark ? WHITE : NEAR_BLACK;
  // 4.5:1 ist für Fliesstext gefordert; darunter wird weiter Richtung Ink
  // gemischt, statt die Fläche zu verwässern.
  let muted = mix(ink, bg, 0.32);
  for (let i = 0; i < 12 && contrast(muted, bg) < 4.5; i++) muted = mix(muted, ink, 0.2);

  // Ein Akzent auf farbigem Grund funktioniert nur, wenn er sich vom Grund
  // absetzt. Tut die Wunschfarbe das nicht, gewinnt die Lesbarkeit.
  const hint = accentHint ? parse(accentHint) : null;
  const accent = hint && contrast(hint, bg) >= 4.5 ? hint : ink;

  return {
    bg: background,
    ink: toHex(ink),
    muted: toHex(muted),
    accent: toHex(accent),
    hairline: toHex(mix(ink, bg, 0.62)),
  };
}

/** Reicht der Kontrast zweier Farben für Fliesstext? Für die Prüfungen. */
export function readable(foreground: string, background: string, target = 4.5): boolean {
  const f = parse(foreground);
  const b = parse(background);
  if (!f || !b) return false;
  return contrast(f, b) >= target;
}

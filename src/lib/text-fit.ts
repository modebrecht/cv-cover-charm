/**
 * Misst Text mit einem Offscreen-Canvas und sucht die grösste Schriftgrösse,
 * bei der der Text noch in `maxLines` Zeilen passt.
 *
 * Wird für Titel gebraucht: lange Berufsbezeichnungen ("Fachmann/-frau
 * Betreuung EFZ Fachrichtung Kinderbetreuung") liefen sonst über den Namen
 * darunter. Die Messung ist deterministisch und damit in Vorschau und
 * PDF-Export identisch.
 */

let ctx: CanvasRenderingContext2D | null | undefined;

function getCtx(): CanvasRenderingContext2D | null {
  if (ctx !== undefined) return ctx;
  if (typeof document === "undefined") {
    ctx = null;
    return ctx;
  }
  ctx = document.createElement("canvas").getContext("2d");
  return ctx;
}

type FitInput = {
  text: string;
  /** verfügbare Breite in px */
  widthPx: number;
  maxLines: number;
  /** gewünschte Grösse in pt */
  sizePt: number;
  fontFamily: string;
  weight: number;
  italic: boolean;
  /** em */
  tracking: number;
  uppercase: boolean;
};

const PT_TO_PX = 96 / 72;

/**
 * Canvas-Messung und DOM-Umbruch weichen um Bruchteile eines Pixels ab; genau
 * an der Kante bricht der Browser dann doch um. Deshalb wird etwas knapper
 * gerechnet als die tatsächliche Breite.
 */
const SAFETY = 0.985;

export function countLines(text: string, widthPx: number, measure: (s: string) => number): number {
  let lines = 0;
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines += 1;
      continue;
    }
    let current = "";
    lines += 1;
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (measure(candidate) <= widthPx || !current) {
        current = candidate;
      } else {
        lines += 1;
        current = word;
      }
    }
  }
  return lines;
}

/** Zeilenzahl, die der Text bei dieser Grösse und Breite belegt. */
export function measureLines(input: Omit<FitInput, "maxLines">): number {
  const c = getCtx();
  const fallback = input.text.split("\n").length;
  if (!c || !input.text || input.widthPx <= 0) return fallback;
  const text = input.uppercase ? input.text.toUpperCase() : input.text;
  const px = input.sizePt * PT_TO_PX;
  c.font = `${input.italic ? "italic " : ""}${input.weight} ${px}px ${input.fontFamily}`;
  const extra = input.tracking * px;
  return countLines(text, input.widthPx * SAFETY, (s) => c.measureText(s).width + extra * s.length);
}

/** Gibt die passende Schriftgrösse in pt zurück (nie grösser als `sizePt`). */
export function fitFontSize(input: FitInput): number {
  const c = getCtx();
  if (!c || !input.text.trim() || input.widthPx <= 0) return input.sizePt;

  const text = input.uppercase ? input.text.toUpperCase() : input.text;
  const style = input.italic ? "italic " : "";

  const fits = (pt: number) => {
    const px = pt * PT_TO_PX;
    c.font = `${style}${input.weight} ${px}px ${input.fontFamily}`;
    const extra = input.tracking * px;
    const measure = (s: string) => c.measureText(s).width + extra * s.length;
    return countLines(text, input.widthPx * SAFETY, measure) <= input.maxLines;
  };

  if (fits(input.sizePt)) return input.sizePt;

  // Nie unter 55 % der Wunschgrösse – lieber leicht überlaufen als unleserlich.
  const min = input.sizePt * 0.55;
  let lo = min;
  let hi = input.sizePt;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  return Math.round(lo * 10) / 10;
}

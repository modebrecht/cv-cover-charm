import type { TemplateId } from "@/components/cover/types";
import {
  dossierFooterContentBottomMm,
  dossierFooterVisualHeightMm,
  dossierHeaderContentTopMm,
  dossierHeaderVisualHeightMm,
} from "@/lib/dossier-chrome";

/**
 * Bauformen des Lebenslaufs.
 *
 * Der Lebenslauf übernimmt vom Titelblatt nicht dessen Hintergrundbild, sondern
 * dessen *Bauform*: was die grossen Flächen tun. Ein blasser Abzug der ganzen
 * Titelseite wäre auf einem Textblatt weder sichtbar noch lesbar – die Fläche
 * an der richtigen Stelle dagegen macht die Verwandtschaft sofort erkennbar.
 */
export type CvArchetypeId = "column" | "band" | "card" | "quiet";

export type CvFrame = {
  id: CvArchetypeId;
  columnMm: number;
  headFirstMm: number;
  headRestMm: number;
  footMm: number;
  bandMotif: boolean;
  footRule: boolean;
  cardInsetMm: number;
  cardRadiusMm: number;
  borderInsetMm: number;
  borderDouble: boolean;
};

const base: CvFrame = {
  id: "quiet",
  columnMm: 0,
  headFirstMm: 0,
  headRestMm: 0,
  footMm: 0,
  bandMotif: false,
  footRule: false,
  cardInsetMm: 0,
  cardRadiusMm: 0,
  borderInsetMm: 0,
  borderDouble: false,
};

const column = (columnMm: number, extra: Partial<CvFrame> = {}): CvFrame => ({
  ...base,
  id: "column",
  columnMm,
  ...extra,
});

const band = (headFirstMm: number, extra: Partial<CvFrame> = {}): CvFrame => ({
  ...base,
  id: "band",
  headFirstMm,
  headRestMm: headFirstMm === 0 ? 0 : Math.min(headFirstMm, 14),
  ...extra,
});

const card = (cardInsetMm: number, cardRadiusMm: number): CvFrame => ({
  ...base,
  id: "card",
  cardInsetMm,
  cardRadiusMm,
});

const quiet = (borderInsetMm: number, extra: Partial<CvFrame> = {}): CvFrame => ({
  ...base,
  id: "quiet",
  borderInsetMm,
  ...extra,
});

/** Eine einzige Zuordnung Vorlage → CV-Bauform. */
const FRAMES: Record<TemplateId, CvFrame> = {
  studio: column(72, { footMm: 6, headFirstMm: 38, headRestMm: 13 }),
  terracotta: column(70),
  blockig: column(66),

  sonne: band(54, { bandMotif: true }),
  freundlich: band(52, { bandMotif: true }),
  aurora: band(56, { bandMotif: true, footMm: 5 }),
  edelBlockig: band(36, { footMm: 16, footRule: true }),
  colorful: band(40, { footMm: 8 }),
  welle: band(0, { footMm: 24, footRule: true }),
  serioes: band(6, { footMm: 3 }),
  modern: band(0),

  citrus: card(12, 8),
  verlauf: card(12, 6),
  neon: card(12, 6),

  klassisch: quiet(10),
  edel: quiet(12, { borderDouble: true }),
  pastell: quiet(12, { headFirstMm: 8, headRestMm: 8 }),
  human: quiet(0),
  sonnig: quiet(0),
};

export function cvFrameFor(template: TemplateId): CvFrame {
  if ((template as string) === "brief") return quiet(0);
  return FRAMES[template] ?? FRAMES.klassisch;
}

export function templatesForArchetype(id: CvArchetypeId): TemplateId[] {
  return (Object.entries(FRAMES) as Array<[TemplateId, CvFrame]>)
    .filter(([, frame]) => frame.id === id)
    .map(([template]) => template);
}

export type CvContentBox = { left: number; right: number; top: number; bottom: number };
export type CvRenderLayout = "classic" | "modern";

const MARGIN_X = 20;
const GAP = 8;
export const FOOTER_MM = 9;

const SHEET_MM = 210;
export const SIDEBAR_PCT_MIN = 0.22;
export const SIDEBAR_PCT_MAX = 0.42;

export function sidebarWidthMm(frame: CvFrame, layout: CvRenderLayout, sidebarPct = 0.3): number {
  if (frame.id === "column") return frame.columnMm;
  if (layout !== "modern") return 0;
  const pct = Math.min(SIDEBAR_PCT_MAX, Math.max(SIDEBAR_PCT_MIN, sidebarPct));
  return Math.round(SHEET_MM * pct);
}

const SURFACE_PAD = 5;

/**
 * Die gemeinsame Dossier-Chrome besitzt ab jetzt die Kopf-/Fusszone. Die
 * weisse CV-Schreibfläche deckt deshalb die früheren, teils riesigen
 * template-spezifischen Kopf-/Fussbänder ab, sobald deren gemeinsame Zone endet.
 * Seitenspalte, Karte und Rahmen bleiben als eigentliche Bauform erhalten.
 */
export function cvSurface(
  frame: CvFrame,
  pageIndex: number,
  layout: CvRenderLayout,
  sidebarPct?: number,
): CvContentBox {
  const header = dossierHeaderVisualHeightMm("cv", pageIndex);
  const footer = dossierFooterVisualHeightMm("cv");

  if (frame.id === "card") {
    const inset = frame.cardInsetMm;
    return {
      left: inset,
      right: inset,
      top: Math.max(inset, header),
      bottom: Math.max(inset, footer),
    };
  }

  const box = cvContentBox(frame, pageIndex, layout, sidebarPct);

  if (frame.id === "quiet") {
    const frameClearance = frame.borderInsetMm ? frame.borderInsetMm + 2 : 0;
    return {
      left: Math.max(0, box.left - SURFACE_PAD),
      right: Math.max(0, box.right - SURFACE_PAD),
      top: Math.max(header, frameClearance),
      bottom: Math.max(footer, frameClearance),
    };
  }

  return {
    left: sidebarWidthMm(frame, layout, sidebarPct),
    right: 0,
    top: header,
    bottom: footer,
  };
}

/** Alte Template-Geometrie bleibt für Hintergrundsignaturen verfügbar. */
export function headTopMm(frame: CvFrame, pageIndex: number): number {
  if (pageIndex > 0) return 0;
  return frame.id === "column" && frame.headFirstMm > 0 ? 24 : 0;
}

/**
 * Textbereich einer CV-Seite. Kopf- und Fussabstand kommen aus derselben
 * Dossier-Einstellung wie im Motivationsschreiben. Strukturelle Seitenränder
 * von Karten/Rahmen bleiben zusätzlich erhalten.
 */
export function cvContentBox(
  frame: CvFrame,
  pageIndex: number,
  layout: CvRenderLayout,
  sidebarPct?: number,
): CvContentBox {
  const top = dossierHeaderContentTopMm("cv", pageIndex);
  const bottom = dossierFooterContentBottomMm("cv");

  if (frame.id === "card") {
    const inset = frame.cardInsetMm + 11;
    const side = sidebarWidthMm(frame, layout, sidebarPct);
    return {
      left: side > 0 ? frame.cardInsetMm + side + GAP : inset,
      right: inset,
      top: Math.max(top, inset),
      bottom: Math.max(bottom, inset),
    };
  }

  const side = sidebarWidthMm(frame, layout, sidebarPct);
  if (side > 0) {
    return { left: side + GAP, right: MARGIN_X, top, bottom };
  }

  if (frame.id === "quiet" && frame.borderInsetMm > 0) {
    const inset = frame.borderInsetMm + 7;
    return {
      left: inset,
      right: inset,
      top: Math.max(top, inset),
      bottom: Math.max(bottom, inset),
    };
  }

  return { left: MARGIN_X, right: MARGIN_X, top, bottom };
}

/**
 * Der Name wird nicht mehr in ein template-spezifisches CV-Band verschoben:
 * die gemeinsame Dossier-Chrome besitzt den Header und verhindert so zwei
 * konkurrierende Kopfbereiche.
 */
export function headerSitsInBand(frame: CvFrame): boolean {
  void frame;
  return false;
}

/**
 * Die gemeinsame Dossier-Chrome zeichnet auch den CV-Footer. Der historische
 * template-spezifische Seitenmarker wird deshalb unterdrückt.
 */
export function pageMarker(frame: CvFrame): "band" | "sidebar" | "footer" | "none" {
  void frame;
  return "none";
}

export function bandLeftMm(frame: CvFrame, layout: CvRenderLayout): number {
  void layout;
  return frame.id === "column" ? frame.columnMm : 0;
}

/*
 * Kein Aufbau wird erzwungen. Jede der sechs CV-Aufbauten funktioniert mit
 * jeder Vorlage; die gemeinsame Header-/Footer-Chrome ist davon unabhängig.
 */

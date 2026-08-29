import type { TemplateId } from "@/components/cover/types";

/**
 * Bauformen des Lebenslaufs.
 *
 * Der Lebenslauf übernimmt vom Titelblatt nicht dessen Hintergrundbild, sondern
 * dessen *Bauform*: was die grossen Flächen tun. Ein blasser Abzug der ganzen
 * Titelseite wäre auf einem Textblatt weder sichtbar noch lesbar – die Fläche
 * an der richtigen Stelle dagegen macht die Verwandtschaft sofort erkennbar.
 *
 * Die Masse stammen aus `CoverBackground.tsx`, sind also nicht neu erfunden.
 * Wo das Titelblatt eine Fläche hat, die auf einem Textblatt keinen Platz
 * findet – Sonne 118 mm Kopffläche, Horizont 117 mm Fussfläche –, steht die
 * gekürzte Fassung daneben im Kommentar.
 */
export type CvArchetypeId = "column" | "band" | "card" | "quiet";

export type CvFrame = {
  id: CvArchetypeId;

  /** Breite der farbigen Spalte in mm. Nur bei "column". */
  columnMm: number;

  /** Kopfband auf Seite 1 bzw. auf den Folgeseiten, in mm. Nur bei "band". */
  headFirstMm: number;
  headRestMm: number;

  /** Fussstreifen, auf allen Seiten gleich hoch. */
  footMm: number;

  /**
   * Zeigt das Band einen Ausschnitt des echten Titelblatt-Hintergrunds statt
   * einer einfarbigen Fläche? Trägt Motive wie den Kreis von Sonne oder den
   * Verlauf von Aurora mit, ohne sie nachzubauen.
   */
  bandMotif: boolean;

  /** Feine Linie unmittelbar über dem Fussstreifen. */
  footRule: boolean;

  /** Abstand der weissen Textkarte zum Blattrand, in mm. Nur bei "card". */
  cardInsetMm: number;
  cardRadiusMm: number;

  /** Feiner Zierrahmen, Abstand zum Blattrand in mm. Nur bei "quiet". */
  borderInsetMm: number;
  /** Zweite, engere Linie wie bei "Edel". */
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
  // Auf Folgeseiten bleibt nur ein Streifen als Wiedererkennung stehen; der
  // Platz gehört dort dem Inhalt.
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

/**
 * Zuordnung Vorlage → Bauform. Bewusst eine einzige Tabelle: wer eine Vorlage
 * anders einordnen will, ändert genau eine Zeile.
 */
const FRAMES: Record<TemplateId, CvFrame> = {
  // Seitenspalte – farbige Spalte über die volle Höhe.
  // Studio trägt zusätzlich das Farbband, in dem auf dem Titelblatt der Name
  // steht. Es beginnt rechts der Spalte, genau wie dort.
  studio: column(72, { footMm: 6, headFirstMm: 38, headRestMm: 13 }),
  terracotta: column(70), //                Titelblatt: 70 mm Spalte
  blockig: column(66), //                   Titelblatt: 105 mm Blöcke, für Text zu breit

  // Kopf- und Fussband.
  sonne: band(54, { bandMotif: true }), //  Titelblatt: 118 mm Kopffläche
  freundlich: band(52, { bandMotif: true }), // Titelblatt: 115 mm Kopffläche
  aurora: band(56, { bandMotif: true, footMm: 5 }), // Titelblatt: 128 mm Verlaufsband
  edelBlockig: band(36, { footMm: 16, footRule: true }), // Titelblatt: 36 mm / 65 mm
  colorful: band(30, { footMm: 8 }), //     Titelblatt: 28 mm Kopfband, 8 mm Fussband
  welle: band(0, { footMm: 24, footRule: true }), // Titelblatt: Fussfläche ab 180 mm
  serioes: band(6, { footMm: 3 }), //       Titelblatt: 6 mm / 3 mm
  modern: band(0), //                       Titelblatt: keine eigenen Ränder

  // Karte auf Fläche – der Grund bleibt voll deckend, der Text sitzt darauf.
  citrus: card(12, 8), //                   Titelblatt: Karte 182 × 233 mm, Radius 10 mm
  verlauf: card(12, 6),
  neon: card(12, 6),

  // Ruhig – helles Papier, feine Linien, die Motive nur als Zierde.
  klassisch: quiet(10), //                  Titelblatt: Innenrahmen 10 mm
  edel: quiet(12, { borderDouble: true }), // Titelblatt: 12 mm und 15 mm
  pastell: quiet(12, { headFirstMm: 8, headRestMm: 8 }), // Titelblatt: Rahmen + 8 mm Kopfband
  human: quiet(0),
  sonnig: quiet(0),
};

export function cvFrameFor(template: TemplateId): CvFrame {
  return FRAMES[template] ?? FRAMES.klassisch;
}

/** Alle Vorlagen einer Bauform – für Prüfungen und die Bedienung. */
export function templatesForArchetype(id: CvArchetypeId): TemplateId[] {
  return (Object.entries(FRAMES) as Array<[TemplateId, CvFrame]>)
    .filter(([, frame]) => frame.id === id)
    .map(([template]) => template);
}

/** Ränder des Textbereichs in mm. */
export type CvContentBox = { left: number; right: number; top: number; bottom: number };

/** Die beiden Inhaltsraster: einspaltig oder mit Seitenspalte. */
export type CvRenderLayout = "classic" | "modern";

/**
 * Seitenrand in mm.
 *
 * Derselbe Wert wie auf dem Titelblatt: dessen Textblöcke stehen in
 * `layouts.ts` durchgehend auf `x: 20`. Legt man beide Blätter übereinander,
 * beginnt die Schrift an derselben Stelle – daran erkennt man ein Dossier eher
 * als an jeder Farbe.
 */
const MARGIN_X = 20;
const MARGIN_TOP = 14;
const MARGIN_BOTTOM = 14;
/** Luft zwischen einer farbigen Fläche und dem Text daneben/darunter. */
const GAP = 8;
/** Höhe der Fusszeile ab Seite 2, in mm. */
export const FOOTER_MM = 9;

/** Blattbreite in mm – Bezug für die Spaltenbreite in Prozent. */
const SHEET_MM = 210;
/** Grenzen der einstellbaren Spaltenbreite. Enger wird unlesbar, breiter erdrückt den Text. */
export const SIDEBAR_PCT_MIN = 0.22;
export const SIDEBAR_PCT_MAX = 0.42;

/**
 * Breite der Seitenspalte für Bauform und gewählten Aufbau – 0, wenn keine da
 * ist. Eine einzige Quelle für die Spaltenbreite: was hier herauskommt, hält
 * der Textbereich frei und genau so breit zeichnet der Renderer die Spalte.
 *
 * Bei einer Vorlage mit eigener Farbspalte gibt die Vorlage die Breite vor –
 * dort wäre eine abweichende Einstellung ein Widerspruch zum Titelblatt.
 */
export function sidebarWidthMm(frame: CvFrame, layout: CvRenderLayout, sidebarPct = 0.3): number {
  if (frame.id === "column") return frame.columnMm;
  if (layout !== "modern") return 0;
  const pct = Math.min(SIDEBAR_PCT_MAX, Math.max(SIDEBAR_PCT_MIN, sidebarPct));
  return Math.round(SHEET_MM * pct);
}

/** Luft zwischen dem Rand der Schreibfläche und dem Text darauf. */
const SURFACE_PAD = 5;

/**
 * Die Schreibfläche: das helle Feld, auf dem der Text steht.
 *
 * Der Hintergrund des Titelblatts liegt auf dem Lebenslauf in voller Stärke –
 * sonst sähe er nicht danach aus. Lesbar wird der Text durch dieses Feld
 * darüber, nicht dadurch, dass die Vorlage verblasst. Es beginnt rechts einer
 * farbigen Spalte und unter einem Kopfband, damit beide sichtbar bleiben.
 */
export function cvSurface(
  frame: CvFrame,
  pageIndex: number,
  layout: CvRenderLayout,
  sidebarPct?: number,
): CvContentBox {
  // Karte: genau die Karte, die auch das Titelblatt zeigt.
  if (frame.id === "card") {
    const i = frame.cardInsetMm;
    return { left: i, right: i, top: i, bottom: i };
  }

  const box = cvContentBox(frame, pageIndex, layout, sidebarPct);

  // Ruhige Vorlagen sind schon helles Papier mit feinen Linien. Die Fläche
  // bleibt darum eingerückt, damit Zierrahmen sichtbar bleiben, deckt aber
  // grosse Formen ab, über denen Text nicht stünde.
  if (frame.id === "quiet") {
    return {
      left: Math.max(0, box.left - SURFACE_PAD),
      right: Math.max(0, box.right - SURFACE_PAD),
      top: Math.max(0, box.top - SURFACE_PAD),
      bottom: Math.max(0, box.bottom - SURFACE_PAD),
    };
  }

  // Spalte und Band: die Fläche schliesst bündig an sie an und reicht bis zum
  // Blattrand. Sichtbar bleibt vom Titelblatt genau das, was es ausmacht – die
  // Spalte, das Kopfband, der Fussstreifen – ohne Spalt und ohne Schleier
  // quer über den Text.
  const head = pageIndex === 0 ? frame.headFirstMm : frame.headRestMm;

  return {
    left: sidebarWidthMm(frame, layout, sidebarPct),
    right: 0,
    top: headTopMm(frame, pageIndex) + head,
    bottom: frame.footMm,
  };
}

/**
 * Wo das Kopfband beginnt. Meist oben; Studio setzt seines auf dem Titelblatt
 * erst bei 24 mm an, und dort gehört auch im Lebenslauf der Name hin.
 */
export function headTopMm(frame: CvFrame, pageIndex: number): number {
  if (pageIndex > 0) return 0;
  return frame.id === "column" && frame.headFirstMm > 0 ? 24 : 0;
}

/**
 * Textbereich einer Seite.
 *
 * Die **Breite ist auf allen Seiten gleich** – nur so misst die
 * Seitenumbruch-Maschine dieselben Zeilenhöhen, die später gedruckt werden.
 * Unterschiedlich ist allein der obere Rand: Seite 1 trägt das volle Kopfband,
 * die Folgeseiten nur dessen Streifen.
 *
 * `layout` muss mit angegeben werden, weil im zweispaltigen Aufbau die
 * Seitenspalte Platz belegt. Fehlte diese Angabe, liefe der Text unter die
 * Spalte – genau das ist einmal passiert.
 */
export function cvContentBox(
  frame: CvFrame,
  pageIndex: number,
  layout: CvRenderLayout,
  sidebarPct?: number,
): CvContentBox {
  const head = pageIndex === 0 ? frame.headFirstMm : frame.headRestMm;
  const top = head > 0 ? headTopMm(frame, pageIndex) + head + GAP : MARGIN_TOP;
  // Ab Seite 2 hält die Fusszeile ihren Platz frei, sonst liefe Text hinein.
  const footer = pageIndex > 0 && pageMarker(frame) === "footer" ? FOOTER_MM : 0;
  const bottom = Math.max(MARGIN_BOTTOM, frame.footMm + GAP) + footer;

  if (frame.id === "card") {
    // Innenrand der Karte, damit der Text nicht an deren Kante klebt.
    const inset = frame.cardInsetMm + 11;
    const side = sidebarWidthMm(frame, layout, sidebarPct);
    return {
      left: side > 0 ? frame.cardInsetMm + side + GAP : inset,
      right: inset,
      top: inset,
      bottom: inset,
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
 * Trägt die Bauform den Namen in einer farbigen Fläche statt auf Papier?
 *
 * Nur wenn das Band hoch genug ist, um Name und Zeile darunter aufzunehmen –
 * die 6 mm von Seriös sind eine Zierleiste, kein Kopfbereich.
 */
export function headerSitsInBand(frame: CvFrame): boolean {
  return frame.headFirstMm >= 26;
}

/**
 * Wo steht ab Seite 2 „Name · Seite N"?
 *
 * Genau **eine** Stelle je Bauform – zwei Seitenangaben auf einem Blatt sind
 * ein Fehler, keine Redundanz. Wo schon ein Band oder eine Spalte da ist,
 * gehört die Angabe dorthin; sonst in eine eigene Fusszeile.
 */
export function pageMarker(frame: CvFrame): "band" | "sidebar" | "footer" {
  if (headerSitsInBand(frame)) return "band";
  if (frame.id === "column") return "sidebar";
  return "footer";
}

/**
 * Ein Kopfband beginnt rechts der Spalte, wo die Bauform eine hat – und rechts
 * des Zierstreifens, wenn die Spalte im Einspalter zu einem solchen wird.
 */
export function bandLeftMm(frame: CvFrame, layout: CvRenderLayout): number {
  void layout;
  return frame.id === "column" ? frame.columnMm : 0;
}

/*
 * Kein Aufbau wird mehr erzwungen.
 *
 * Vorher setzten Spalten-Vorlagen den Zweispalter und Karten-Vorlagen den
 * Einspalter durch. Die Auswahl im Aufbau-Picker blieb damit bei zwölf von
 * neunzehn Vorlagen wirkungslos – man klickte und nichts geschah. Jede der
 * sechs Aufbauten funktioniert jetzt mit jeder Vorlage. Die farbige Spalte
 * einer Vorlage bleibt dabei so breit wie auf dem Titelblatt – sie kommt aus
 * dem Seitengrund und ist keine Nachbildung, die man verschmälern könnte.
 */

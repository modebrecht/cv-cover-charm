/**
 * Zentrale Voreinstellungen des Titelblatt-Generators.
 *
 * Hier drehen statt in den Komponenten: Schriftgrössen, Vorbelegungen,
 * PDF-Qualität und Foto-Kompression stehen alle an einem Ort.
 */

export const FONT = {
  /**
   * Untergrenze in pt. Kein Element wird kleiner gerendert – die Vorlagen
   * waren auf Druck ausgelegt, gelesen wird das Blatt aber fast immer am
   * Bildschirm oder als PDF-Anhang.
   */
  MIN_SIZE: 10,
  /** Grenzen des Schriftgrössen-Reglers in der Werkzeugleiste (pt). */
  SLIDER_MIN: 6,
  SLIDER_MAX: 72,

  /**
   * Aufschlag auf die Grössen aus den Vorlagen.
   * Gesperrte Versal-Labels ("K O N T A K T") werden pro Punkt deutlich
   * breiter und deshalb vorsichtiger angehoben, sonst sprengen sie ihre Spalte.
   */
  BOOST_SMALL: 2.5, // Fliesstext und Labels bis 13pt
  BOOST_TRACKED: 1.5, // dasselbe, aber mit tracking >= 0.2em
  BOOST_MEDIUM: 1.5, // Namen und Zwischengrössen, 13–20pt
  /** Ab dieser Grösse bleiben Titel unverändert. */
  HEADLINE_FROM: 20,

  /**
   * Startwert des globalen Reglers (1 = Vorlagen-Standard).
   * Der schnellste Weg, das ganze Blatt grösser zu machen.
   */
  DEFAULT_SCALE: 1.05,
  SCALE_MIN: 0.8,
  SCALE_MAX: 1.8,
} as const;

/** Vorbelegung des Formulars. */
export const DEFAULTS = {
  /** Ort für die "Ort, Datum"-Zeile. Leer lassen für kein Vorbelegen. */
  LOCATION: "Hubersdorf",
  /** Vorlage, die beim ersten Öffnen gewählt ist. */
  TEMPLATE: "modern",
  /**
   * Zeile über dem Beruf. Im Formular überschreibbar – hier steht nur, was
   * beim leeren Formular drinsteht.
   */
  KICKER: "Bewerbung um eine Lehrstelle als",
} as const;

/** Bedienoberfläche. */
export const UI = {
  /**
   * Zeigt in der Vorlagenauswahl die Kurzbeschreibung unter dem Namen.
   * Auf `false` wird die Liste kompakt und zeigt nur die Namen.
   */
  TEMPLATE_DESCRIPTIONS: false,
} as const;

/**
 * Blattmasse in ganzen Pixeln bei 96 dpi.
 *
 * A4 sind 210x297mm, in CSS-Pixeln also 793.69 x 1122.52 – keine ganzen Zahlen.
 * Der Export rendert aber auf ein ganzzahliges Raster; stünde das Blatt in
 * Millimetern, blieben rechts 0.31px und unten 0.48px übrig, die html2canvas
 * mit seiner Hintergrundfarbe füllt – der weisse Rand im PDF. Vorschau,
 * Blatt und Export müssen deshalb alle dieselbe ganzzahlige Grösse benutzen.
 */
export const PAGE = {
  WIDTH: 794,
  HEIGHT: 1123,
} as const;

/** PDF-Export. */
export const PDF = {
  /** Renderfaktor gegenüber 96 dpi – 3 entspricht 288 dpi. */
  SCALE: 3,
  /** JPEG-Qualität 0–1. */
  QUALITY: 0.94,
} as const;

/** Foto-Upload: grösser als das wird beim Einlesen herunterskaliert. */
export const PHOTO = {
  MAX_EDGE: 1200,
  QUALITY: 0.9,
} as const;

/** Voreinstellungen für neu gezeichnete Formen. */
export const SHAPE = {
  /** Standardgrösse in mm. */
  SIZE: 40,
  STROKE_WIDTH: 0.8,
  /** Kleinste Kantenlänge, die eine freihändig gezeichnete Form haben darf. */
  MIN_DRAW: 8,
} as const;

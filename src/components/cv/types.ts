import type { TemplateId } from "@/components/cover/types";

/**
 * Ein Eintrag mit Zeitraum – Schule, Praktikum, Kurs. Alle Felder dürfen leer
 * bleiben; leere Einträge werden beim Rendern übersprungen.
 */
export type CvEntry = {
  id: string;
  /** "2021 – 2025" oder "Aug. 2024" – bewusst freier Text, kein Datumsfeld. */
  zeit: string;
  titel: string;
  /** Betrieb, Schule oder Ort. */
  ort: string;
  beschreibung: string;
};

/** Eine Sprache mit Niveau ("Muttersprache", "B1", "Schulkenntnisse"). */
export type CvSprache = { id: string; name: string; niveau: string };

/** Eine Referenzperson. */
export type CvReferenz = {
  id: string;
  name: string;
  funktion: string;
  /** Sichtbare Kontaktzeile; enthält für neue Einträge Telefon, E-Mail und Zusatz je auf eigener Zeile. */
  kontakt: string;
  /** Optionale E-Mail-Adresse der Referenzperson. */
  email?: string;
  /** Optionale freie Zusatzzeile; wird im CV ohne Feldbezeichnung ausgegeben. */
  zusatz?: string;
};

/**
 * Angaben zur Person. Dieselben Felder wie im Titelblatt, damit der Lebenslauf
 * sie übernehmen kann.
 */
export type CvPerson = {
  vorname: string;
  nachname: string;
  adresse: string;
  plzOrt: string;
  telefon: string;
  email: string;
  geburtsdatum: string;
  nationalitaet: string;
  /** Zeile unter dem Namen, z. B. "Schülerin, 3. Sek B". */
  untertitel: string;
  foto: string | null;
};

/** Welche Abschnitte gibt es und wie heissen sie in der Vorgabe? */
export type CvSectionKey =
  | "schule"
  | "erfahrung"
  | "sprachen"
  | "hobbys"
  | "staerken"
  | "referenzen";

export const CV_SECTION_LABELS: Record<CvSectionKey, string> = {
  schule: "Schulbildung",
  erfahrung: "Praktika & Schnuppertage",
  sprachen: "Sprachen",
  hobbys: "Hobbys & Interessen",
  staerken: "Stärken",
  referenzen: "Referenzen",
};

/** Reihenfolge der Abschnitte auf dem Blatt. */
export const CV_SECTION_ORDER: CvSectionKey[] = [
  "schule",
  "erfahrung",
  "sprachen",
  "hobbys",
  "staerken",
  "referenzen",
];

/** Im Modern-Layout kann jeder Inhaltsblock bewusst links oder im Hauptteil liegen. */
export type CvPlacement = "side" | "main";
export type CvPlacementKey = "kontakt" | CvSectionKey;

/**
 * Überschriften aller Blöcke, Kontakt eingeschlossen.
 *
 * Kontakt war der einzige Block ohne änderbaren Titel – dabei will vielleicht
 * jemand dort den eigenen Namen stehen haben statt des Worts "Kontakt".
 */
export const CV_BLOCK_LABELS: Record<CvPlacementKey, string> = {
  kontakt: "Kontakt",
  ...CV_SECTION_LABELS,
};
export type CvPlacements = Record<CvPlacementKey, CvPlacement>;

/** Sinnvolle Startwerte; danach entscheidet die Schülerin / der Schüler selbst. */
export const DEFAULT_CV_PLACEMENTS: CvPlacements = {
  kontakt: "side",
  schule: "main",
  erfahrung: "main",
  sprachen: "side",
  hobbys: "side",
  staerken: "side",
  referenzen: "main",
};

export type CvData = {
  person: CvPerson;
  schule: CvEntry[];
  erfahrung: CvEntry[];
  sprachen: CvSprache[];
  /** Je eine Zeile pro Eintrag. */
  hobbys: string[];
  staerken: string[];
  referenzen: CvReferenz[];
  /**
   * Titel des Dokuments, z. B. "Lebenslauf". Leer lassen blendet ihn aus.
   * Vorher stand hier nichts und ein Aufbau druckte fest "CURRICULUM VITAE".
   */
  titel?: string;
  /** Eigene Überschriften. Leer = Vorgabe aus CV_BLOCK_LABELS. */
  labels: Partial<Record<CvPlacementKey, string>>;
  /** Ausgeblendete Abschnitte. */
  hidden: Partial<Record<CvSectionKey, boolean>>;
};

/** Gestaltung des Lebenslaufs – kommt in der Regel vom Titelblatt. */
export type CvDesign = {
  template: TemplateId;
  colors: Record<string, string>;
  /**
   * Deckkraft des Hintergrunds, 0–1. Auf dem Lebenslauf zählt der Text mehr als
   * die Fläche, darum steht der Regler in der Bedienung auf "Transparenz" und
   * startet bei 94 % – der Hintergrund bleibt nur als leiser Farbakzent sichtbar.
   */
  bgOpacity: number;
  /** Formen und Bilder vom Titelblatt mitnehmen (ohne dessen Texte). */
  useElements: boolean;

  /** Linie neben der Abschnittsüberschrift. */
  headingRule?: CvHeadingRule;
  /** Grösse von Name und Dokumenttitel, 1 = Vorgabe. */
  titleScale?: number;
  /** Grösse von Untertitel und Rubriken, 1 = Vorgabe. */
  headingScale?: number;
  /** Grösse des Fliesstexts, 1 = Vorgabe. */
  bodyScale?: number;
  /** Breite der Seitenspalte als Anteil der Blattbreite. */
  sidebarPct?: number;
};

/** „keine" blendet die Linie aus, „kurz" ist der feste Strich, „ganz" füllt die Zeile. */
export type CvHeadingRule = "none" | "short" | "full";

export const CV_TYPE_DEFAULTS = {
  headingRule: "short" as CvHeadingRule,
  titleScale: 1,
  headingScale: 1,
  bodyScale: 1,
  /** 30/70 – die Aufteilung, die sich beim Ausprobieren als brauchbar zeigte. */
  sidebarPct: 0.3,
} as const;

/**
 * Typografie-Regler sind bewusst enger als früher begrenzt.
 * 50–200 % war für einen Bewerbungs-CV kein sinnvoller Gestaltungsraum:
 * bei sehr kleinen Werten wurde Text unlesbar, bei sehr grossen Werten brach
 * die Hierarchie zusammen (Datum, Ort, Beschreibung und Eintragstitel wurden
 * gleichzeitig riesig). 75–135 % lässt weiterhin klare Varianten zu, hält die
 * Dokumente aber in einem realistisch druck- und bewerbungstauglichen Bereich.
 */
export const CV_SCALE_MIN = 0.75;
export const CV_SCALE_MAX = 1.35;

export const emptyPerson: CvPerson = {
  vorname: "",
  nachname: "",
  adresse: "",
  plzOrt: "",
  telefon: "",
  email: "",
  geburtsdatum: "",
  nationalitaet: "",
  untertitel: "",
  foto: null,
};

/** Vorgabe für den Dokumenttitel. */
export const DEFAULT_CV_TITLE = "Lebenslauf";

export const emptyCv: CvData = {
  person: { ...emptyPerson },
  titel: DEFAULT_CV_TITLE,
  schule: [],
  erfahrung: [],
  sprachen: [],
  hobbys: [],
  staerken: [],
  referenzen: [],
  labels: {},
  hidden: {},
};

let counter = 0;
/** Kennung für einen neuen Eintrag. */
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export const emptyEntry = (): CvEntry => ({
  id: newId("e"),
  zeit: "",
  titel: "",
  ort: "",
  beschreibung: "",
});

export const emptySprache = (): CvSprache => ({ id: newId("s"), name: "", niveau: "" });

export const emptyReferenz = (): CvReferenz => ({
  id: newId("r"),
  name: "",
  funktion: "",
  kontakt: "",
  email: "",
  zusatz: "",
});

/** Trägt ein Eintrag überhaupt etwas? Leere werden nicht gedruckt. */
export const entryFilled = (e: CvEntry) =>
  !!(e.zeit.trim() || e.titel.trim() || e.ort.trim() || e.beschreibung.trim());

export const DEMO_CV: CvData = {
  titel: DEFAULT_CV_TITLE,
  person: {
    vorname: "Lea",
    nachname: "Müller",
    adresse: "Bahnhofstrasse 42",
    plzOrt: "8000 Zürich",
    telefon: "+41 79 123 45 67",
    email: "lea.mueller@example.ch",
    geburtsdatum: "14.03.2010",
    nationalitaet: "Schweiz",
    untertitel: "Schülerin, 3. Sekundarklasse",
    foto: null,
  },
  schule: [
    {
      id: "demo-s1",
      zeit: "2023 – heute",
      titel: "Sekundarschule, Niveau A",
      ort: "Schulhaus Feld, Zürich",
      beschreibung: "Schwerpunkt Mathematik und Informatik",
    },
    {
      id: "demo-s2",
      zeit: "2017 – 2023",
      titel: "Primarschule",
      ort: "Schulhaus Lindenhof, Zürich",
      beschreibung: "",
    },
  ],
  erfahrung: [
    {
      id: "demo-p1",
      zeit: "Sept. 2026",
      titel: "Schnupperlehre Informatik",
      ort: "Beispiel AG, Zürich",
      beschreibung: "Support, kleine Automatisierungen mit Python",
    },
    {
      id: "demo-p2",
      zeit: "März 2026",
      titel: "Schnupperlehre Mediamatik",
      ort: "Muster GmbH, Winterthur",
      beschreibung: "Website-Pflege, Bildbearbeitung",
    },
  ],
  sprachen: [
    { id: "demo-l1", name: "Deutsch", niveau: "Muttersprache" },
    { id: "demo-l2", name: "Englisch", niveau: "Gute Schulkenntnisse (B1)" },
    { id: "demo-l3", name: "Französisch", niveau: "Grundkenntnisse (A2)" },
  ],
  hobbys: ["Volleyball im Verein", "Programmieren kleiner Spiele", "Fotografieren"],
  staerken: ["Zuverlässig und pünktlich", "Arbeitet gern im Team", "Lernt schnell Neues"],
  referenzen: [
    {
      id: "demo-r1",
      name: "Herr Thomas Weber",
      funktion: "Klassenlehrer, Schulhaus Feld",
      kontakt: "+41 44 123 45 67",
      email: "",
      zusatz: "",
    },
  ],
  labels: {},
  hidden: {},
};

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
export type CvReferenz = { id: string; name: string; funktion: string; kontakt: string };

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
  /** Eigene Überschriften. Leer = Vorgabe aus CV_SECTION_LABELS. */
  labels: Partial<Record<CvSectionKey, string>>;
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
  /** Side/Main-Zuordnung der Inhaltsblöcke im Modern-Layout. */
  placements: CvPlacements;
};

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

export const emptyCv: CvData = {
  person: { ...emptyPerson },
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
});

/** Trägt ein Eintrag überhaupt etwas? Leere werden nicht gedruckt. */
export const entryFilled = (e: CvEntry) =>
  !!(e.zeit.trim() || e.titel.trim() || e.ort.trim() || e.beschreibung.trim());

export const DEMO_CV: CvData = {
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
    },
  ],
  labels: {},
  hidden: {},
};

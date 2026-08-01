export type CoverData = {
  beruf: string;
  lehrbeginn: string;
  vorname: string;
  nachname: string;
  adresse: string;
  plzOrt: string;
  telefon: string;
  email: string;
  geburtsdatum: string;
  lehrbetrieb: string;
  ansprechperson: string;
  betriebAdresse: string;
  ort: string;
  datum: string;
  foto: string | null;
};

export type ColorSlot = {
  key: string;
  label: string;
  default: string;
};

export type TemplateId =
  | "klassisch"
  | "modern"
  | "freundlich"
  | "edel"
  | "colorful"
  | "blockig"
  | "edelBlockig"
  | "serioes"
  | "human";

export type TemplateDefinition = {
  id: TemplateId;
  name: string;
  description: string;
  slots: ColorSlot[];
};

/** Alle Werte in mm (Position/Grösse) bzw. pt (Schriftgrösse). */
export type BlockStyle = {
  x: number;
  y: number;
  w: number;
  size: number;
  /** Farbe: entweder ein Slot-Key ("accent") oder ein Hex-Wert. */
  color: string;
  align: "left" | "center" | "right";
  weight: number;
  italic: boolean;
  uppercase: boolean;
  tracking: number; // em
  lineHeight: number;
  opacity: number;
  font: "sans" | "serif";
  hidden: boolean;
  /** nur für Foto */
  ratio?: number;
  radius?: number;
};

export type BlockKind = "text" | "photo";

export type Block = {
  id: string;
  label: string;
  kind: BlockKind;
  lines: string[];
  style: BlockStyle;
};

export type CustomField = {
  id: string;
  label: string;
  text: string;
};

export const FONT_STACKS: Record<BlockStyle["font"], string> = {
  sans: "'Helvetica Neue', Helvetica, Arial, ui-sans-serif, system-ui, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
};

export const TEMPLATES: TemplateDefinition[] = [
  {
    id: "klassisch",
    name: "Editorial",
    description: "Ruhige Serif, feine Rahmenlinien",
    slots: [
      { key: "ink", label: "Text", default: "#111111" },
      { key: "accent", label: "Akzent", default: "#8a6a3b" },
      { key: "bg", label: "Papier", default: "#f5efe4" },
    ],
  },
  {
    id: "modern",
    name: "Modern",
    description: "Grosse Typo, minimalistisch",
    slots: [
      { key: "primary", label: "Hauptfarbe", default: "#111827" },
      { key: "accent", label: "Akzent", default: "#f43f5e" },
      { key: "bg", label: "Hintergrund", default: "#fafafa" },
    ],
  },
  {
    id: "freundlich",
    name: "Warm",
    description: "Weiche Formen, warme Farben",
    slots: [
      { key: "primary", label: "Hauptform", default: "#0f766e" },
      { key: "secondary", label: "Zweite Form", default: "#f59e0b" },
      { key: "ink", label: "Text", default: "#0b1f24" },
      { key: "bg", label: "Hintergrund", default: "#fff9ef" },
    ],
  },
];

export const LEHRBERUFE = [
  "Kaufmann/-frau EFZ",
  "Informatiker/in EFZ",
  "Detailhandelsfachmann/-frau EFZ",
  "Detailhandelsassistent/in EBA",
  "Fachmann/-frau Gesundheit EFZ",
  "Fachmann/-frau Betreuung EFZ",
  "Polymechaniker/in EFZ",
  "Elektroinstallateur/in EFZ",
  "Automatiker/in EFZ",
  "Logistiker/in EFZ",
  "Koch/Köchin EFZ",
  "Zeichner/in EFZ",
  "Mediamatiker/in EFZ",
  "Maurer/in EFZ",
  "Schreiner/in EFZ",
  "Coiffeur/Coiffeuse EFZ",
  "Landwirt/in EFZ",
];

export const DEMO_DATA: CoverData = {
  beruf: "Informatiker/in EFZ",
  lehrbeginn: "August 2027",
  vorname: "Lea",
  nachname: "Müller",
  adresse: "Bahnhofstrasse 42",
  plzOrt: "8000 Zürich",
  telefon: "+41 79 123 45 67",
  email: "lea.mueller@example.ch",
  geburtsdatum: "14.03.2010",
  lehrbetrieb: "Beispiel AG",
  ansprechperson: "Herr Thomas Weber",
  betriebAdresse: "Industriestrasse 8, 8005 Zürich",
  ort: "Zürich",
  datum: "15.11.2026",
  foto: null,
};

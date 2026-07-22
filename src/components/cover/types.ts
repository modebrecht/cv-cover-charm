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

export type TemplateId = "klassisch" | "modern" | "freundlich";

export type TemplateDefinition = {
  id: TemplateId;
  name: string;
  description: string;
  slots: ColorSlot[];
};

export const TEMPLATES: TemplateDefinition[] = [
  {
    id: "klassisch",
    name: "Klassisch",
    description: "Serif, ruhig, zentrierte Komposition",
    slots: [
      { key: "primary", label: "Akzent", default: "#1a1a1a" },
      { key: "bg", label: "Hintergrund", default: "#faf7f2" },
    ],
  },
  {
    id: "modern",
    name: "Modern",
    description: "Sans-Serif mit Farbbalken",
    slots: [
      { key: "primary", label: "Hauptfarbe", default: "#0b5cff" },
      { key: "secondary", label: "Textakzent", default: "#0f172a" },
      { key: "bg", label: "Hintergrund", default: "#ffffff" },
    ],
  },
  {
    id: "freundlich",
    name: "Freundlich",
    description: "Farbiger Kreis hinter Foto",
    slots: [
      { key: "primary", label: "Hauptform", default: "#ff7a59" },
      { key: "secondary", label: "Zweite Form", default: "#ffd166" },
      { key: "accent", label: "Typo-Akzent", default: "#1d3557" },
      { key: "bg", label: "Hintergrund", default: "#fff8f1" },
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

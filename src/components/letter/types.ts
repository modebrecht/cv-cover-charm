import { FONT_LABELS, TEMPLATES, type FontKey, type TemplateId } from "@/components/cover/types";
import { LETTER_STORAGE_KEY } from "@/lib/dossier-project";

export type LetterAlignment = "left" | "right";
export type LetterTemplateId = "brief" | TemplateId;
export type LetterBodyColumns = 1 | 2 | 3;
export type LetterHeaderMode = "compact" | "contact" | "none";
export type LetterFooterMode = "compact" | "attachments" | "none";

/** Frei platzierbares Foto/Bild im Anschreiben. Der Textumbruch ist immer rechteckig (Word: Quadrat). */
export type LetterFlowImage = {
  id: string;
  src: string;
  side: "left" | "right";
  /** Vertikaler Versatz ab Beginn des Brieftext-Bereichs in mm. */
  topMm: number;
  widthMm: number;
  /** Abstand des Textes zum Bild in mm. */
  gapMm: number;
};

export type LetterData = {
  absenderName: string;
  absenderAdresse: string;
  absenderPlzOrt: string;
  absenderTelefon: string;
  absenderEmail: string;
  empfaengerFirma: string;
  empfaengerName: string;
  empfaengerAdresse: string;
  empfaengerPlzOrt: string;
  ort: string;
  datum: string;
  betreff: string;
  anrede: string;
  text: string;
  /** Optionaler Rich-Text-Stand. `text` bleibt für alte Dateien und Suche erhalten. */
  richTextHtml?: string;
  gruss: string;
  unterschrift: string;
  /** Optionale frei platzierbare Fotos/Bilder. Alte Entwürfe ohne Feld bleiben kompatibel. */
  images?: LetterFlowImage[];
  /** Beilagen am Ende des Motivationsschreibens. */
  showBeilagen?: boolean;
  beilagen?: string[];
};

export type LetterDesign = {
  template: LetterTemplateId;
  colors: Record<string, string>;
  /** Standalone-Briefschrift bzw. Kompatibilitätswert für ältere Saves. */
  font: FontKey;
  /**
   * Nur eine bewusst gewählte Dossier-Schrift darf die Vorlagenfamilie
   * überschreiben. Fehlt dieser Wert, entscheidet die zentrale Dossier-Familie.
   */
  fontOverride?: FontKey | null;
  /** Briefspezifische Optionen sind optional, damit alte gespeicherte Designs kompatibel bleiben. */
  senderAlign?: LetterAlignment;
  recipientAlign?: LetterAlignment;
  dateAlign?: LetterAlignment;
  ruleAfterSender?: boolean;
  ruleAfterRecipient?: boolean;
  ruleAfterSubject?: boolean;
  /** Eigener, kompakter Kopf für das Anschreiben. Alte Saves fallen auf `compact` zurück. */
  headerMode?: LetterHeaderMode;
  headerShowName?: boolean;
  headerShowAddress?: boolean;
  headerShowPhone?: boolean;
  headerShowEmail?: boolean;
  /** Briefspezifischer Fussbereich. Alte Saves behalten das kompakte Footerband. */
  footerMode?: LetterFooterMode;
};

export type SavedLetter = {
  version: 1;
  data: LetterData;
  design: LetterDesign;
};

export { LETTER_STORAGE_KEY };

export const DEFAULT_LETTER_BEILAGEN = ["Lebenslauf", "Zeugnis"] as const;

export const DEMO_LETTER: LetterData = {
  absenderName: "Lea Müller",
  absenderAdresse: "Dorfstrasse 12",
  absenderPlzOrt: "4535 Hubersdorf",
  absenderTelefon: "+41 79 123 45 67",
  absenderEmail: "lea.mueller@example.ch",
  empfaengerFirma: "Beispiel AG",
  empfaengerName: "Herr Thomas Weber",
  empfaengerAdresse: "Industriestrasse 8",
  empfaengerPlzOrt: "4500 Solothurn",
  ort: "Hubersdorf",
  datum: "15.11.2026",
  betreff: "Bewerbung um eine Lehrstelle als Informatiker/in EFZ",
  anrede: "Guten Tag Herr Weber",
  text: "Die Informatik begeistert mich, weil ich gerne logisch denke, Probleme löse und Neues ausprobiere. Deshalb bewerbe ich mich mit grossem Interesse um die Lehrstelle als Informatikerin EFZ bei der Beispiel AG.\n\nIn der Schule arbeite ich besonders gerne an Aufgaben, bei denen ich selbstständig Lösungen entwickeln kann. Ich bin zuverlässig, lerne schnell und arbeite gerne im Team.\n\nGerne möchte ich Ihr Unternehmen und den Beruf bei einem persönlichen Gespräch oder einer Schnupperlehre näher kennenlernen. Ich freue mich über Ihre Rückmeldung.",
  richTextHtml: "",
  gruss: "Freundliche Grüsse",
  unterschrift: "Lea Müller",
  images: [],
  showBeilagen: true,
  beilagen: [...DEFAULT_LETTER_BEILAGEN],
};

export const EMPTY_LETTER: LetterData = {
  absenderName: "",
  absenderAdresse: "",
  absenderPlzOrt: "",
  absenderTelefon: "",
  absenderEmail: "",
  empfaengerFirma: "",
  empfaengerName: "",
  empfaengerAdresse: "",
  empfaengerPlzOrt: "",
  ort: "",
  datum: "",
  betreff: "",
  anrede: "Guten Tag",
  text: "",
  richTextHtml: "",
  gruss: "Freundliche Grüsse",
  unterschrift: "",
  images: [],
  showBeilagen: true,
  beilagen: [...DEFAULT_LETTER_BEILAGEN],
};

export function defaultLetterColors(template: LetterTemplateId): Record<string, string> {
  if (template === "brief") {
    return {
      bg: "#ffffff",
      ink: "#111111",
      primary: "#111111",
      secondary: "#111111",
      accent: "#111111",
      cvInk: "#111111",
      cvMuted: "#4b5563",
      cvHeading: "#111111",
    };
  }
  const definition = TEMPLATES.find((candidate) => candidate.id === template) ?? TEMPLATES[0];
  return Object.fromEntries(definition.slots.map((slot) => [slot.key, slot.default]));
}

export function emptyLetterDesign(): LetterDesign {
  const template: LetterTemplateId = "brief";
  return {
    template,
    colors: defaultLetterColors(template),
    font: "freundlich",
    fontOverride: null,
    senderAlign: "left",
    recipientAlign: "left",
    dateAlign: "left",
    ruleAfterSender: false,
    ruleAfterRecipient: false,
    ruleAfterSubject: false,
    headerMode: "compact",
    headerShowName: true,
    headerShowAddress: true,
    headerShowPhone: true,
    headerShowEmail: true,
    footerMode: "compact",
  };
}

export function normalizeLetterDesign(value: unknown): LetterDesign {
  const fallback = emptyLetterDesign();
  if (!value || typeof value !== "object") return fallback;
  const incoming = value as Partial<LetterDesign>;
  const template: LetterTemplateId =
    incoming.template === "brief"
      ? "brief"
      : typeof incoming.template === "string" &&
          TEMPLATES.some((candidate) => candidate.id === incoming.template)
        ? (incoming.template as TemplateId)
        : fallback.template;
  const font =
    typeof incoming.font === "string" && incoming.font in FONT_LABELS
      ? (incoming.font as FontKey)
      : fallback.font;
  const fontOverride =
    typeof incoming.fontOverride === "string" && incoming.fontOverride in FONT_LABELS
      ? (incoming.fontOverride as FontKey)
      : null;
  const colors =
    incoming.colors && typeof incoming.colors === "object"
      ? { ...defaultLetterColors(template), ...incoming.colors }
      : defaultLetterColors(template);
  const headerMode: LetterHeaderMode =
    incoming.headerMode === "contact" || incoming.headerMode === "none"
      ? incoming.headerMode
      : "compact";
  const footerMode: LetterFooterMode =
    incoming.footerMode === "attachments" || incoming.footerMode === "none"
      ? incoming.footerMode
      : "compact";
  return {
    template,
    colors,
    font,
    fontOverride,
    senderAlign: incoming.senderAlign === "right" ? "right" : "left",
    recipientAlign: incoming.recipientAlign === "right" ? "right" : "left",
    dateAlign: incoming.dateAlign === "right" ? "right" : "left",
    ruleAfterSender: incoming.ruleAfterSender === true,
    ruleAfterRecipient: incoming.ruleAfterRecipient === true,
    ruleAfterSubject: incoming.ruleAfterSubject === true,
    headerMode,
    headerShowName: incoming.headerShowName !== false,
    headerShowAddress: incoming.headerShowAddress !== false,
    headerShowPhone: incoming.headerShowPhone !== false,
    headerShowEmail: incoming.headerShowEmail !== false,
    footerMode,
  };
}

import { FONT_LABELS, TEMPLATES, type FontKey, type TemplateId } from "@/components/cover/types";
import { LETTER_STORAGE_KEY } from "@/lib/dossier-project";

export type LetterAlignment = "left" | "right";
export type LetterTemplateId = "brief" | TemplateId;
export type LetterBodyColumns = 1 | 2 | 3;

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
  /** Beilagen am Ende des Motivationsschreibens. */
  showBeilagen?: boolean;
  beilagen?: string[];
};

export type LetterDesign = {
  template: LetterTemplateId;
  colors: Record<string, string>;
  font: FontKey;
  /** Briefspezifische Optionen sind optional, damit alte gespeicherte Designs kompatibel bleiben. */
  senderAlign?: LetterAlignment;
  recipientAlign?: LetterAlignment;
  dateAlign?: LetterAlignment;
  ruleAfterSender?: boolean;
  ruleAfterRecipient?: boolean;
  ruleAfterSubject?: boolean;
};

export type SavedLetter = {
  version: 1;
  data: LetterData;
  design: LetterDesign;
};

export { LETTER_STORAGE_KEY };

export const DEFAULT_LETTER_BEILAGEN = ["Lebenslauf", "Zeugnis"] as const;

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
    senderAlign: "left",
    recipientAlign: "left",
    dateAlign: "left",
    ruleAfterSender: false,
    ruleAfterRecipient: false,
    ruleAfterSubject: false,
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
          incoming.template !== "colorful" &&
          TEMPLATES.some((candidate) => candidate.id === incoming.template)
        ? (incoming.template as TemplateId)
        : incoming.template === "colorful"
          ? "klassisch"
          : fallback.template;
  const font =
    typeof incoming.font === "string" && incoming.font in FONT_LABELS
      ? (incoming.font as FontKey)
      : fallback.font;
  const colors =
    incoming.colors && typeof incoming.colors === "object"
      ? { ...defaultLetterColors(template), ...incoming.colors }
      : defaultLetterColors(template);
  return {
    template,
    colors,
    font,
    senderAlign: incoming.senderAlign === "right" ? "right" : "left",
    recipientAlign: incoming.recipientAlign === "right" ? "right" : "left",
    dateAlign: incoming.dateAlign === "right" ? "right" : "left",
    ruleAfterSender: incoming.ruleAfterSender === true,
    ruleAfterRecipient: incoming.ruleAfterRecipient === true,
    ruleAfterSubject: incoming.ruleAfterSubject === true,
  };
}

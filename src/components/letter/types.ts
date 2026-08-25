import { FONT_LABELS, TEMPLATES, type FontKey, type TemplateId } from "@/components/cover/types";
import { LETTER_STORAGE_KEY } from "@/lib/dossier-project";

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
  gruss: string;
  unterschrift: string;
};

export type LetterDesign = {
  template: TemplateId;
  colors: Record<string, string>;
  font: FontKey;
};

export type SavedLetter = {
  version: 1;
  data: LetterData;
  design: LetterDesign;
};

export { LETTER_STORAGE_KEY };

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
  gruss: "Freundliche Grüsse",
  unterschrift: "",
};

export function defaultLetterColors(template: TemplateId): Record<string, string> {
  const definition = TEMPLATES.find((candidate) => candidate.id === template) ?? TEMPLATES[0];
  return Object.fromEntries(definition.slots.map((slot) => [slot.key, slot.default]));
}

export function emptyLetterDesign(): LetterDesign {
  const template = TEMPLATES.find((candidate) => candidate.id !== "colorful")?.id ?? "klassisch";
  return {
    template,
    colors: defaultLetterColors(template),
    font: "sans",
  };
}

export function normalizeLetterDesign(value: unknown): LetterDesign {
  const fallback = emptyLetterDesign();
  if (!value || typeof value !== "object") return fallback;
  const incoming = value as Partial<LetterDesign>;
  const template =
    typeof incoming.template === "string" &&
    incoming.template !== "colorful" &&
    TEMPLATES.some((candidate) => candidate.id === incoming.template)
      ? incoming.template
      : fallback.template;
  const font =
    typeof incoming.font === "string" && incoming.font in FONT_LABELS
      ? (incoming.font as FontKey)
      : fallback.font;
  const colors =
    incoming.colors && typeof incoming.colors === "object"
      ? { ...defaultLetterColors(template), ...incoming.colors }
      : defaultLetterColors(template);
  return { template, colors, font };
}

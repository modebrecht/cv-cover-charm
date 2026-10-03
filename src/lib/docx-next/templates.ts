import type { Alignment, PageMargins } from "./model";

/** Configuration only: templates never receive XML or a package. */
export type TemplateDefinition = {
  id: string;
  archetype: "minimal" | "organic" | "editorial" | "sidebar" | "graphic" | "dark";
  typography: { font: string; bodyPt: number; namePt: number; headingPt: number; heroPt: number };
  colors: { ink: string; accent: string; paper: string };
  margins: PageMargins;
  cover: { order: readonly string[]; align: Alignment; heroSpaceMm: number; photoWidthMm: number };
  letter: { paragraphSpaceMm: number; lineHeight: number };
  cv: { sectionSpaceMm: number; headingRule: boolean; sidebarFraction: number };
  artwork: readonly { asset: string; semanticText: false }[];
};
export const BRIEF: TemplateDefinition = {
  id: "brief",
  archetype: "minimal",
  typography: { font: "Arial", bodyPt: 10.5, namePt: 24, headingPt: 12, heroPt: 32 },
  colors: { ink: "111111", accent: "244A61", paper: "FFFFFF" },
  margins: { top: 20, right: 20, bottom: 18, left: 20 },
  cover: {
    order: [
      "eyebrow",
      "datum",
      "foto",
      "kicker",
      "beruf",
      "name",
      "lehrbeginn",
      "kontaktTitel",
      "kontakt",
      "empfaengerTitel",
      "empfaenger",
      "beilagenTitel",
      "beilagen",
    ],
    align: "left",
    heroSpaceMm: 12,
    photoWidthMm: 40,
  },
  letter: { paragraphSpaceMm: 3, lineHeight: 1.2 },
  cv: { sectionSpaceMm: 4, headingRule: true, sidebarFraction: 0.3 },
  artwork: [],
};
export const NEXT_TEMPLATES: Readonly<Record<string, TemplateDefinition>> = { brief: BRIEF };
export function nextTemplate(id: string): TemplateDefinition {
  const template = NEXT_TEMPLATES[id];
  if (!template) throw new Error(`DOCX Next template ${id} has not passed migration gates.`);
  return template;
}

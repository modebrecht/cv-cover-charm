import type { Alignment, PageMargins } from "./model";

/** Configuration only: templates never receive XML or a package. */
export type TemplateDefinition = {
  id: string;
  archetype: "minimal" | "organic" | "editorial" | "sidebar" | "graphic" | "dark";
  typography: { font: string; bodyPt: number; namePt: number; headingPt: number; heroPt: number };
  colors: { ink: string; accent: string; paper: string };
  margins: PageMargins;
  cover: {
    order: readonly string[];
    align: Alignment;
    heroSpaceMm: number;
    photoWidthMm: number;
    photoAlign?: Alignment;
    rows?: readonly { fields: readonly string[]; widths: readonly number[]; fillSlot?: string }[];
    heroLeadMm?: number;
    photoAbsentLeadMm?: number;
    decorationPlacement?: "first-header";
  };
  letter: {
    paragraphSpaceMm: number;
    lineHeight: number;
    recipientGapMm: number;
    fontSource?: "standalone" | "dossier";
    compactMasthead?: { heightMm: number; widthMm: number; fillSlot: string };
  };
  chrome: {
    headerDistanceMm: number;
    footerDistanceMm: number;
    defaultContact?: { heightMm: number; gapMm: number };
    ignoreEmptyHeader?: boolean;
    lineMetricFactor?: number;
    band?: {
      fillSlot: string;
      accentSlot: string;
      compactFirstMm: number;
      compactContinuationMm: number;
      circles: readonly {
        rightMm: number;
        topMm: number;
        diameterMm: number;
        opacity: number;
        strokeMm?: number;
      }[];
    };
  };
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
  letter: { paragraphSpaceMm: 3, lineHeight: 1.2, recipientGapMm: 12, fontSource: "standalone" },
  chrome: { headerDistanceMm: 16, footerDistanceMm: 12 },
  cv: { sectionSpaceMm: 4, headingRule: true, sidebarFraction: 0.3 },
  artwork: [],
};
/** Isolated stress candidate; registration does not imply Word acceptance. */
export const WARM: TemplateDefinition = {
  id: "freundlich",
  archetype: "organic",
  typography: { font: "Georgia", bodyPt: 10.5, namePt: 24, headingPt: 12, heroPt: 24 },
  colors: { ink: "0B1F24", accent: "0F766E", paper: "FFF9EF" },
  margins: { top: 20, right: 22, bottom: 22, left: 24 },
  cover: {
    order: [
      "eyebrow",
      "ortDatum",
      "foto",
      "name",
      "beruf",
      "lehrbeginn",
      "kontaktTitel",
      "kontakt",
      "anTitel",
      "empfaenger",
    ],
    align: "center",
    heroSpaceMm: 0,
    photoWidthMm: 60,
    photoAlign: "center",
    heroLeadMm: 55,
    photoAbsentLeadMm: 115,
    decorationPlacement: "first-header",
    rows: [
      { fields: ["eyebrow", "ortDatum"], widths: [1, 1], fillSlot: "primary" },
      { fields: ["kontaktTitel", "anTitel"], widths: [1, 1] },
      { fields: ["kontakt", "empfaenger"], widths: [1, 1] },
    ],
  },
  letter: {
    paragraphSpaceMm: 3,
    lineHeight: 1.2,
    recipientGapMm: 12,
    fontSource: "dossier",
    compactMasthead: { heightMm: 52, widthMm: 82, fillSlot: "primary" },
  },
  chrome: {
    headerDistanceMm: 12,
    footerDistanceMm: 12,
    ignoreEmptyHeader: true,
    lineMetricFactor: 1.4,
    defaultContact: { heightMm: 44, gapMm: 4 },
    band: {
      fillSlot: "primary",
      accentSlot: "secondary",
      compactFirstMm: 52,
      compactContinuationMm: 14,
      circles: [
        { rightMm: -24, topMm: -41, diameterMm: 92, opacity: 0.78, strokeMm: 0.8 },
        { rightMm: -13, topMm: -31, diameterMm: 72, opacity: 0.72 },
      ],
    },
  },
  cv: { sectionSpaceMm: 4, headingRule: true, sidebarFraction: 0.3 },
  artwork: [],
};
export const NEXT_TEMPLATES: Readonly<Record<string, TemplateDefinition>> = {
  brief: BRIEF,
  freundlich: WARM,
};
export function nextTemplate(id: string): TemplateDefinition {
  const template = NEXT_TEMPLATES[id];
  if (!template) throw new Error(`DOCX Next template ${id} has not passed migration gates.`);
  return template;
}

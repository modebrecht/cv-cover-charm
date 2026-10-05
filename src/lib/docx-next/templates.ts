import type { Alignment, PageMargins } from "./model";

/** Page-width-relative nonsemantic geometry; absent height follows its chrome band. */
export type TemplateMotif = {
  shape: "rect" | "circle" | "path";
  path?: string;
  xFraction: number;
  widthFraction: number;
  topMm: number;
  heightMm?: number;
  /** Omit fill for border-only motifs such as rings. */
  fillSlot?: string;
  stroke?: { slot: string; widthMm: number };
  endSlot?: string;
  angleDeg?: number;
  opacity?: number;
  repeat?: "first" | "continuation";
};

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
    /** Native paragraph defaults; explicit saved field alignment keeps precedence. */
    fieldAlignments?: Readonly<Record<string, Alignment>>;
    rows?: readonly {
      fields: readonly (string | readonly string[])[];
      widths: readonly number[];
      fillSlot?: string;
      beforeMm?: number;
    }[];
    heroLeadMm?: number;
    photoAbsentLeadMm?: number;
    decorationPlacement?: "first-header";
    motifs?: readonly TemplateMotif[];
  };
  letter: {
    paragraphSpaceMm: number;
    lineHeight: number;
    recipientGapMm: number;
    fontSource?: "standalone" | "dossier";
    compactMasthead?: { heightMm: number; widthMm: number; fillSlot: string };
    keepTailTogether?: boolean;
  };
  chrome: {
    headerDistanceMm: number;
    footerDistanceMm: number;
    defaultContact?: { heightMm: number; gapMm: number };
    ignoreEmptyHeader?: boolean;
    lineMetricFactor?: number;
    band?: {
      /** Own semantic descriptor paint instead of the historical browser chrome defaults. */
      surfaceSource?: "descriptor";
      fillSlot: string;
      accentSlot: string;
      compactFirstMm: number;
      compactContinuationMm: number;
      motifs?: readonly TemplateMotif[];
      circles?: readonly {
        rightMm: number;
        topMm: number;
        diameterMm: number;
        opacity: number;
        strokeMm?: number;
      }[];
    };
  };
  cv: { sectionSpaceMm: number; headingRule: boolean; sidebarFraction: number };
  /** Quiet page paint independent of running contact chrome; repeats in native header stories. */
  pageMotifs?: Partial<Record<"letter" | "cv", readonly TemplateMotif[]>>;
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
/** Geometric stress candidate: native cover columns and declarative diagonal paint. */
export const PRISM: TemplateDefinition = {
  id: "prism",
  archetype: "graphic",
  typography: { font: "Arial", bodyPt: 10.5, namePt: 24, headingPt: 12, heroPt: 24 },
  colors: { ink: "18223A", accent: "6F95F2", paper: "F5F7FC" },
  margins: { top: 20, right: 20, bottom: 18, left: 20 },
  cover: {
    order: [
      "eyebrow",
      "ortDatum",
      "name",
      "beruf",
      "lehrbeginn",
      "foto",
      "kontaktTitel",
      "kontakt",
      "anTitel",
      "empfaenger",
      "beilagenTitel",
      "beilagen",
    ],
    align: "left",
    heroSpaceMm: 0,
    photoWidthMm: 60,
    photoAlign: "right",
    decorationPlacement: "first-header",
    rows: [
      { fields: ["eyebrow", "ortDatum"], widths: [1, 1], fillSlot: "primary" },
      { fields: [["name", "beruf", "lehrbeginn"], "foto"], widths: [0.62, 0.38], beforeMm: 90 },
      {
        fields: [
          ["kontaktTitel", "kontakt"],
          ["anTitel", "empfaenger", "beilagenTitel", "beilagen"],
        ],
        widths: [1, 1],
        beforeMm: 12,
      },
    ],
    motifs: [
      {
        shape: "path",
        path: "M 0 0 L 100 0 L 100 72 L 0 100",
        xFraction: 0,
        widthFraction: 1,
        topMm: 0,
        heightMm: 111,
        fillSlot: "primary",
      },
      {
        shape: "path",
        path: "M 28 0 L 100 0 L 100 100 L 0 78",
        xFraction: 0.51,
        widthFraction: 0.49,
        topMm: 0,
        heightMm: 111,
        fillSlot: "secondary",
        opacity: 0.94,
      },
    ],
  },
  letter: {
    paragraphSpaceMm: 3,
    lineHeight: 1.2,
    recipientGapMm: 12,
    fontSource: "dossier",
    keepTailTogether: true,
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
      compactFirstMm: 14,
      compactContinuationMm: 14,
      surfaceSource: "descriptor",
      motifs: [
        {
          shape: "path",
          path: "M 28 0 L 100 0 L 100 100 L 0 78",
          xFraction: 0.61,
          widthFraction: 0.39,
          topMm: 0,
          fillSlot: "secondary",
        },
      ],
    },
  },
  cv: { sectionSpaceMm: 4, headingRule: true, sidebarFraction: 0.3 },
  artwork: [],
};
/** Organic stress candidate: photo-left cover hero and quiet page paint, native text throughout. */
export const HUMAN: TemplateDefinition = {
  id: "human",
  archetype: "organic",
  typography: { font: "Trebuchet MS", bodyPt: 10.5, namePt: 24, headingPt: 12, heroPt: 26 },
  colors: { ink: "3B2A22", accent: "9C5B3C", paper: "FDF6F0" },
  margins: { top: 24, right: 23, bottom: 22, left: 25 },
  cover: {
    order: [
      "eyebrow",
      "ortDatum",
      "foto",
      "kicker",
      "beruf",
      "name",
      "lehrbeginn",
      "kontaktTitel",
      "kontakt",
      "anTitel",
      "empfaenger",
    ],
    align: "left",
    heroSpaceMm: 0,
    photoWidthMm: 46,
    photoAlign: "left",
    decorationPlacement: "first-header",
    rows: [
      { fields: ["eyebrow", "ortDatum"], widths: [0.62, 0.38] },
      { fields: ["foto", ["kicker", "beruf"]], widths: [0.35, 0.65], beforeMm: 14 },
      { fields: [["name", "lehrbeginn"]], widths: [1], beforeMm: 18 },
      {
        fields: [
          ["kontaktTitel", "kontakt"],
          ["anTitel", "empfaenger"],
        ],
        widths: [1, 1],
        beforeMm: 28,
      },
    ],
  },
  letter: {
    paragraphSpaceMm: 3,
    lineHeight: 1.2,
    recipientGapMm: 12,
    fontSource: "dossier",
    keepTailTogether: true,
  },
  chrome: {
    headerDistanceMm: 12,
    footerDistanceMm: 12,
    ignoreEmptyHeader: true,
    lineMetricFactor: 1.4,
    defaultContact: { heightMm: 36, gapMm: 4 },
    band: {
      surfaceSource: "descriptor",
      fillSlot: "primary",
      accentSlot: "secondary",
      compactFirstMm: 14,
      compactContinuationMm: 14,
    },
  },
  cv: { sectionSpaceMm: 3.6, headingRule: true, sidebarFraction: 0.3 },
  pageMotifs: {
    letter: [
      {
        shape: "circle",
        xFraction: 150 / 210,
        widthFraction: 82 / 210,
        topMm: -16,
        heightMm: 62,
        fillSlot: "secondary",
        opacity: 0.3,
      },
      {
        shape: "circle",
        xFraction: -18 / 210,
        widthFraction: 58 / 210,
        topMm: 242,
        heightMm: 40,
        fillSlot: "primary",
        opacity: 0.14,
      },
    ],
    cv: [
      {
        shape: "circle",
        xFraction: 150 / 210,
        widthFraction: 82 / 210,
        topMm: -16,
        heightMm: 62,
        fillSlot: "secondary",
        opacity: 0.3,
      },
    ],
  },
  artwork: [],
};
/** Offset circular cover field and restrained interior stationery, all semantic content native. */
export const ORBIT: TemplateDefinition = {
  id: "orbit",
  archetype: "graphic",
  typography: { font: "Arial", bodyPt: 10.5, namePt: 24, headingPt: 12, heroPt: 26 },
  colors: { ink: "19182D", accent: "625FE8", paper: "F7F8FC" },
  margins: { top: 24, right: 25, bottom: 22, left: 26 },
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
      "beilagenTitel",
      "beilagen",
    ],
    align: "left",
    heroSpaceMm: 0,
    photoWidthMm: 60,
    photoAlign: "right",
    heroLeadMm: 36,
    photoAbsentLeadMm: 102,
    fieldAlignments: {
      eyebrow: "right",
      ortDatum: "right",
      name: "left",
      beruf: "left",
      lehrbeginn: "left",
    },
    decorationPlacement: "first-header",
    rows: [
      { fields: [[], ["eyebrow", "ortDatum"]], widths: [0.5, 0.5] },
      {
        fields: [
          ["kontaktTitel", "kontakt"],
          ["anTitel", "empfaenger", "beilagenTitel", "beilagen"],
        ],
        widths: [1, 1],
        beforeMm: 24,
      },
    ],
    motifs: [
      {
        shape: "circle",
        xFraction: 106 / 210,
        widthFraction: 138 / 210,
        topMm: -34,
        heightMm: 138,
        fillSlot: "primary",
      },
      {
        shape: "circle",
        xFraction: 72 / 210,
        widthFraction: 82 / 210,
        topMm: 58,
        heightMm: 82,
        fillSlot: "secondary",
        opacity: 0.9,
      },
    ],
  },
  letter: {
    paragraphSpaceMm: 3,
    lineHeight: 1.2,
    recipientGapMm: 12,
    fontSource: "dossier",
    keepTailTogether: true,
  },
  chrome: {
    headerDistanceMm: 12,
    footerDistanceMm: 12,
    ignoreEmptyHeader: true,
    lineMetricFactor: 1.4,
    defaultContact: { heightMm: 36, gapMm: 4 },
    band: {
      surfaceSource: "descriptor",
      fillSlot: "primary",
      accentSlot: "secondary",
      compactFirstMm: 14,
      compactContinuationMm: 14,
    },
  },
  cv: { sectionSpaceMm: 3.6, headingRule: true, sidebarFraction: 0.3 },
  pageMotifs: {
    letter: [
      { shape: "rect", xFraction: 0, widthFraction: 1, topMm: 0, heightMm: 7, fillSlot: "primary" },
      {
        shape: "circle",
        xFraction: 184 / 210,
        widthFraction: 18 / 210,
        topMm: -4,
        heightMm: 18,
        fillSlot: "secondary",
        opacity: 0.34,
      },
    ],
    cv: [
      {
        shape: "rect",
        xFraction: 0,
        widthFraction: 1,
        topMm: 0,
        heightMm: 10,
        fillSlot: "primary",
      },
      {
        shape: "circle",
        xFraction: 180 / 210,
        widthFraction: 22 / 210,
        topMm: -6,
        heightMm: 22,
        stroke: { slot: "secondary", widthMm: 2 },
        opacity: 0.52,
      },
    ],
  },
  artwork: [],
};
export const NEXT_TEMPLATES: Readonly<Record<string, TemplateDefinition>> = {
  brief: BRIEF,
  freundlich: WARM,
  prism: PRISM,
  human: HUMAN,
  orbit: ORBIT,
};
export function nextTemplate(id: string): TemplateDefinition {
  const template = NEXT_TEMPLATES[id];
  if (!template) throw new Error(`DOCX Next template ${id} has not passed migration gates.`);
  return template;
}

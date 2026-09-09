import {
  FRESH_TEMPLATE_IDS,
  type FreshTemplateId,
} from "@/components/cover/fresh-template-registry";

export const LETTER_SHEET_MM = { width: 210, height: 297 } as const;

export type FreshLetterArchetype = "fresh" | "sidebar" | "band" | "frame";
export type FreshLetterColorRole = "primary" | "secondary" | "accent";

export type FreshLetterMotif = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: FreshLetterColorRole;
  opacity?: number;
  radiusMm?: number;
  borderMm?: number;
  clipPath?: string;
  gradientTo?: FreshLetterColorRole;
};

export type FreshLetterSpec = {
  archetype: FreshLetterArchetype;
  left: number;
  right: number;
  motifs: FreshLetterMotif[];
};

const rect = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  color: FreshLetterColorRole,
  extra: Partial<FreshLetterMotif> = {},
): FreshLetterMotif => ({ id, x, y, w, h, color, ...extra });

/**
 * Fresh cover geometry is deliberately expressive. Motivation letters use a
 * separate, restrained system: every motif is confined to a page edge or to
 * the shared header/footer safety zones, so decoration can never enter the
 * maximal reading box (no header + no footer).
 */
export const FRESH_LETTER_SPECS: Record<FreshTemplateId, FreshLetterSpec> = {
  edge: {
    archetype: "band",
    left: 25,
    right: 23,
    motifs: [
      rect("edge-band", 0, 0, 210, 12, "primary"),
      rect("edge-signal", 0, 0, 5, 12, "secondary"),
    ],
  },
  glow: {
    archetype: "fresh",
    left: 25,
    right: 24,
    motifs: [
      rect("top-orb", 190, 0, 20, 20, "primary", { opacity: 0.16, radiusMm: 10 }),
      rect("bottom-orb", 0, 270, 22, 22, "secondary", { opacity: 0.17, radiusMm: 11 }),
      rect("top-rule", 25, 16.2, 24, 1, "accent", { radiusMm: 0.5, gradientTo: "primary" }),
    ],
  },
  frame: {
    archetype: "frame",
    left: 27,
    right: 27,
    motifs: [
      rect("top-corner", 9, 5, 2, 12, "accent"),
      rect("bottom-corner", 184, 289, 17, 2, "secondary"),
    ],
  },
  monoLuxe: {
    archetype: "frame",
    left: 27,
    right: 27,
    motifs: [
      rect("top-rule", 27, 16.4, 156, 0.45, "primary", { opacity: 0.75 }),
      rect("top-mark", 27, 13.2, 4, 4, "accent"),
      rect("bottom-rule", 27, 288.5, 38, 0.45, "accent", { opacity: 0.75 }),
    ],
  },
  horizon: {
    archetype: "band",
    left: 25,
    right: 23,
    motifs: [
      rect("top-band", 0, 0, 210, 10, "primary", { gradientTo: "secondary" }),
      rect("top-rule", 25, 16.2, 24, 1.2, "accent", { radiusMm: 0.6 }),
    ],
  },
  sunrise: {
    archetype: "band",
    left: 25,
    right: 23,
    motifs: [
      rect("top-band", 0, 0, 210, 10, "primary", { gradientTo: "secondary" }),
      rect("sun", 188, 3, 12, 12, "accent", { opacity: 0.28, radiusMm: 6 }),
      rect("top-rule", 25, 16.2, 22, 1.1, "accent", { radiusMm: 0.55 }),
    ],
  },
  forestFlow: {
    archetype: "sidebar",
    left: 33,
    right: 23,
    motifs: [
      rect("rail", 0, 0, 10, 297, "primary"),
      rect("soft-orb", 8, 18, 18, 18, "secondary", { opacity: 0.22, radiusMm: 9 }),
      rect("rail-rule", 18, 22, 14, 1.2, "accent"),
    ],
  },
  violetPulse: {
    archetype: "fresh",
    left: 25,
    right: 24,
    motifs: [
      rect("top-field", 155, 0, 55, 17.5, "primary", {
        opacity: 0.18,
        radiusMm: 5,
        gradientTo: "secondary",
      }),
      rect("top-rule", 25, 16.2, 28, 1.2, "accent", { radiusMm: 0.6 }),
    ],
  },
  studio2: {
    archetype: "sidebar",
    left: 35,
    right: 23,
    motifs: [
      rect("rail", 0, 0, 13, 297, "primary"),
      rect("signal", 0, 18, 30, 8, "secondary"),
      rect("rail-rule", 19, 34, 14, 1.2, "accent"),
    ],
  },
  studio3: {
    archetype: "sidebar",
    left: 34,
    right: 23,
    motifs: [
      rect("rail", 0, 0, 12, 297, "primary"),
      rect("top-field", 12, 0, 54, 14, "secondary", { opacity: 0.92 }),
      rect("top-rule", 20, 16.2, 18, 1.2, "accent"),
    ],
  },
  warm2: {
    archetype: "fresh",
    left: 25,
    right: 24,
    motifs: [
      rect("warm-orb", 188, 0, 22, 18, "secondary", { opacity: 0.28, radiusMm: 11 }),
      rect("signal-dot", 174, 6, 10, 10, "primary", { opacity: 0.42, radiusMm: 5 }),
      rect("top-rule", 25, 16.2, 22, 1.1, "accent"),
    ],
  },
  warm3: {
    archetype: "fresh",
    left: 27,
    right: 24,
    motifs: [
      rect("top-band", 0, 0, 210, 8, "primary"),
      rect("right-field", 190, 8, 20, 32, "secondary", { opacity: 0.32, radiusMm: 10 }),
      rect("top-rule", 27, 16.2, 18, 1.1, "accent"),
    ],
  },
  ledger: {
    archetype: "sidebar",
    left: 33,
    right: 24,
    motifs: [
      rect("index-strip", 12, 0, 9, 297, "secondary", { opacity: 0.42 }),
      rect("index-rule", 22, 0, 0.45, 297, "primary", { opacity: 0.6 }),
      rect("top-rule", 33, 16.4, 153, 0.45, "accent", { opacity: 0.78 }),
    ],
  },
  prism: {
    archetype: "fresh",
    left: 26,
    right: 25,
    motifs: [
      rect("top-wedge", 118, 0, 92, 15, "primary", {
        clipPath: "polygon(18% 0, 100% 0, 100% 100%, 0 100%)",
      }),
      rect("top-signal", 144, 15, 66, 2.5, "secondary", {
        clipPath: "polygon(12% 0, 100% 0, 100% 100%, 0 100%)",
      }),
      rect("top-rule", 26, 16.2, 18, 1.1, "accent"),
    ],
  },
  gallery: {
    archetype: "sidebar",
    left: 36,
    right: 23,
    motifs: [
      rect("rail", 0, 0, 15, 297, "primary"),
      rect("portrait-block", 5, 18, 23, 34, "secondary", { radiusMm: 8 }),
      rect("signal", 20, 58, 6, 6, "accent"),
    ],
  },
  orbit: {
    archetype: "fresh",
    left: 26,
    right: 25,
    motifs: [
      rect("outer-ring", 190, 0, 20, 20, "primary", {
        opacity: 0.3,
        radiusMm: 10,
        borderMm: 2.2,
      }),
      rect("inner-ring", 189, 24, 14, 14, "secondary", {
        opacity: 0.55,
        radiusMm: 7,
        borderMm: 1.2,
      }),
      rect("top-rule", 26, 16.2, 20, 1.1, "accent"),
    ],
  },
  ribbon: {
    archetype: "band",
    left: 26,
    right: 24,
    motifs: [
      rect("top-ribbon", 0, 0, 190, 10.5, "primary", { radiusMm: 5 }),
      rect("signal-ribbon", 18, 10.5, 144, 5, "secondary", { radiusMm: 2.5 }),
      rect("bottom-rule", 0, 294, 210, 3, "accent"),
    ],
  },
  cove: {
    archetype: "band",
    left: 26,
    right: 24,
    motifs: [
      rect("top-cove", 0, 0, 210, 12, "primary", { radiusMm: 6 }),
      rect("right-cove", 188, 6, 22, 38, "secondary", { opacity: 0.86, radiusMm: 11 }),
      rect("top-rule", 26, 16.2, 20, 1.2, "accent"),
    ],
  },
};

export function isFreshLetterTemplate(template: string): template is FreshTemplateId {
  return (FRESH_TEMPLATE_IDS as readonly string[]).includes(template);
}

export function freshLetterSpec(template: string): FreshLetterSpec | null {
  return isFreshLetterTemplate(template) ? FRESH_LETTER_SPECS[template] : null;
}

export function motifIntersectsReadingBox(
  motif: FreshLetterMotif,
  spec: FreshLetterSpec,
): boolean {
  // `none` header/footer is the largest possible reading area and therefore the
  // strongest collision check for every shared chrome configuration.
  const reading = {
    left: spec.left,
    right: LETTER_SHEET_MM.width - spec.right,
    top: 18,
    bottom: LETTER_SHEET_MM.height - 10,
  };
  const motifRight = motif.x + motif.w;
  const motifBottom = motif.y + motif.h;
  return (
    motif.x < reading.right &&
    motifRight > reading.left &&
    motif.y < reading.bottom &&
    motifBottom > reading.top
  );
}

import type { TemplateId } from "@/components/cover/types";
import { cvFrameFor } from "@/components/cv/archetype";
import { freshLetterSpec } from "./fresh-letter-system";
import "./fresh-letter-integrity.css";
import {
  DEFAULT_LETTER_BEILAGEN,
  type LetterData,
  type LetterDesign,
  type LetterFooterMode,
  type LetterHeaderMode,
  type LetterTemplateId,
} from "./types";

export const LETTER_PAGE_MM = { width: 210, height: 297 } as const;

export type LetterArchetype = "quiet" | "band" | "sidebar" | "frame" | "fresh";

export type LetterPageContext = {
  /** Zero-based page index. Current editor renders page 0; pagination can reuse the same geometry later. */
  pageIndex?: number;
  /** Attachments belong only on the final page of a multi-page letter. */
  finalPage?: boolean;
};

type MmRect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

type MmBar = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type LetterPageGeometry = {
  pageIndex: number;
  firstPage: boolean;
  finalPage: boolean;
  archetype: LetterArchetype;
  freshTemplate: boolean;
  requestedHeaderMode: LetterHeaderMode;
  effectiveHeaderMode: LetterHeaderMode;
  requestedFooterMode: LetterFooterMode;
  effectiveFooterMode: LetterFooterMode;
  content: MmRect & { width: number; height: number };
  header: {
    contactHeight: number;
    contactLeft: number;
    contactRight: number;
    contactTop: number;
    contactMinHeight: number;
    sidebarWidth: number;
    compactTopBandHeight: number;
    compactAccent: MmBar;
    compactLineTop: number;
    compactPill: MmBar | null;
  };
  footer: {
    height: number;
    contentLeft: number;
    contentRight: number;
    paddingY: number;
    showAttachments: boolean;
  };
};

/**
 * Established templates remain archetype-based. Fresh templates own explicit
 * left/right insets in fresh-letter-system.ts because their letter signatures
 * are intentionally independent from CV geometry and from legacy `klassisch`
 * fallback behaviour.
 */
const CONTENT_INSETS: Record<LetterArchetype, { left: number; right: number }> = {
  quiet: { left: 24, right: 23 },
  fresh: { left: 25, right: 24 },
  band: { left: 24, right: 23 },
  sidebar: { left: 30, right: 23 },
  frame: { left: 27, right: 27 },
};

const FIRST_PAGE_TOP: Record<LetterHeaderMode, number> = {
  compact: 21,
  contact: 31,
  none: 18,
};

const CONTINUATION_TOP: Record<LetterHeaderMode, number> = {
  compact: 18,
  contact: 18,
  none: 16,
};

/**
 * CV geometry is used only as a structural visual reference for established
 * templates. Fresh templates are resolved first from their dedicated letter
 * registry, so they can never silently inherit legacy CV dimensions.
 */
export function letterArchetypeFor(template: LetterTemplateId): LetterArchetype {
  const fresh = freshLetterSpec(template);
  if (fresh) return fresh.archetype;

  if (template === "brief") return "quiet";

  const reference = cvFrameFor(template as TemplateId);
  const activeBand = reference.id === "band" && (reference.headFirstMm > 0 || reference.footMm > 0);

  if (reference.id === "column") return "sidebar";
  if (reference.id === "card" || reference.cardInsetMm > 0 || reference.borderInsetMm > 0) {
    return "frame";
  }
  if (activeBand) return "band";
  return "quiet";
}

export function visibleLetterAttachments(data: LetterData): string[] {
  const values = data.beilagen?.length ? data.beilagen : [...DEFAULT_LETTER_BEILAGEN];
  return values.filter((value) => value.trim());
}

export function letterFooterHeightMm(data: LetterData, mode: LetterFooterMode): number {
  if (mode === "none") return 0;
  if (mode === "compact") return 2.4;

  const attachments = data.showBeilagen !== false ? visibleLetterAttachments(data) : [];
  if (!attachments.length) return 4;

  // Footer text has roughly 140 mm usable width next to the heading. Reserve
  // space for wrapped long attachment names instead of sizing by item count only.
  const visualLineCount = attachments.reduce(
    (sum, value) => sum + Math.max(1, Math.ceil(value.trim().length / 56)),
    0,
  );
  return Math.min(30, 7 + visualLineCount * 3.8);
}

function effectiveHeaderMode(design: LetterDesign): LetterHeaderMode {
  // Header modes have the same semantic meaning as in the CV. The shared chrome
  // renderer decides how the contact mode is visually condensed on continuation pages.
  return design.headerMode ?? "compact";
}

function effectiveFooterMode(design: LetterDesign, finalPage: boolean): LetterFooterMode {
  const requested = design.footerMode ?? "compact";
  // Attachment lists belong on the final page only. Earlier pages keep the compact band.
  if (requested === "attachments" && !finalPage) return "compact";
  return requested;
}

export function letterPageGeometry(
  data: LetterData,
  design: LetterDesign,
  context: LetterPageContext = {},
): LetterPageGeometry {
  const pageIndex = Math.max(0, context.pageIndex ?? 0);
  const firstPage = pageIndex === 0;
  const finalPage = context.finalPage ?? true;
  const fresh = freshLetterSpec(design.template);
  const archetype = fresh?.archetype ?? letterArchetypeFor(design.template);
  const freshTemplate = fresh !== null;
  const requestedHeaderMode = design.headerMode ?? "compact";
  const requestedFooterMode = design.footerMode ?? "compact";
  const headerMode = effectiveHeaderMode(design);
  const footerMode = effectiveFooterMode(design, finalPage);
  const footerHeight = letterFooterHeightMm(data, footerMode);
  const insets = fresh ? { left: fresh.left, right: fresh.right } : CONTENT_INSETS[archetype];
  const top = firstPage ? FIRST_PAGE_TOP[headerMode] : CONTINUATION_TOP[headerMode];
  const bottom = footerMode === "none" ? 10 : footerMode === "attachments" ? footerHeight + 7 : 17;
  const width = LETTER_PAGE_MM.width - insets.left - insets.right;
  const height = LETTER_PAGE_MM.height - top - bottom;
  const showAttachments =
    footerMode === "attachments" &&
    finalPage &&
    data.showBeilagen !== false &&
    visibleLetterAttachments(data).length > 0;

  return {
    pageIndex,
    firstPage,
    finalPage,
    archetype,
    freshTemplate,
    requestedHeaderMode,
    effectiveHeaderMode: headerMode,
    requestedFooterMode,
    effectiveFooterMode: footerMode,
    content: {
      left: insets.left,
      right: insets.right,
      top,
      bottom,
      width,
      height,
    },
    header: {
      contactHeight: 22,
      contactLeft: 24,
      contactRight: 23,
      contactTop: 3.1,
      contactMinHeight: 15,
      sidebarWidth: archetype === "sidebar" ? 6 : 0,
      compactTopBandHeight: archetype === "band" ? 5 : 0,
      // Global compact-header rule: decorative chrome must be edge-anchored and coherent.
      // Detached mini-bars, hairlines and pills are forbidden for every template.
      compactAccent: { left: 0, top: 0, width: 0, height: 0 },
      compactLineTop: 0,
      compactPill: null,
    },
    footer: {
      height: footerHeight,
      contentLeft: 24,
      contentRight: 23,
      paddingY: 2.2,
      showAttachments,
    },
  };
}

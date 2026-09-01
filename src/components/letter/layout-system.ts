import { FRESH_TEMPLATE_IDS } from "@/components/cover/fresh-templates";
import { letterLayoutFor } from "@/components/dossier/DossierSheetBackground";
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

const FRESH_TEMPLATE_SET = new Set<string>(FRESH_TEMPLATE_IDS);

const CONTENT_INSETS: Record<LetterArchetype, { left: number; right: number }> = {
  quiet: { left: 24, right: 23 },
  fresh: { left: 25, right: 24 },
  band: { left: 24, right: 23 },
  sidebar: { left: 30, right: 23 },
  frame: { left: 27, right: 27 },
};

const FIRST_PAGE_TOP: Record<LetterHeaderMode, number> = {
  compact: 21,
  contact: 27,
  none: 18,
};

const CONTINUATION_TOP: Record<LetterHeaderMode, number> = {
  compact: 18,
  contact: 18,
  none: 16,
};

const COMPACT_ACCENTS: Record<LetterArchetype, MmBar> = {
  sidebar: { left: 13, top: 14, width: 24, height: 1.2 },
  frame: { left: 24, top: 15, width: 24, height: 1.2 },
  band: { left: 24, top: 12, width: 22, height: 1.1 },
  quiet: { left: 24, top: 11.8, width: 10, height: 3 },
  fresh: { left: 25, top: 11.8, width: 12, height: 2.4 },
};

/**
 * Existing dossier geometry is deliberately used only as a visual classifier.
 * The letter never inherits those large CV measurements; it maps the visual
 * reference to one of a handful of compact letter archetypes instead.
 */
export function letterArchetypeFor(template: LetterTemplateId): LetterArchetype {
  const reference = letterLayoutFor(template);
  const freshTemplate = template !== "brief" && FRESH_TEMPLATE_SET.has(template);

  if (reference.kind === "column" || (freshTemplate && reference.left >= 32)) return "sidebar";
  if (reference.kind === "card" || reference.cardInsetMm || reference.borderInsetMm) return "frame";
  if (reference.kind === "band" || (freshTemplate && reference.top >= 31)) return "band";
  return freshTemplate ? "fresh" : "quiet";
}

export function visibleLetterAttachments(data: LetterData): string[] {
  const values = data.beilagen?.length ? data.beilagen : [...DEFAULT_LETTER_BEILAGEN];
  return values.filter((value) => value.trim());
}

export function letterFooterHeightMm(data: LetterData, mode: LetterFooterMode): number {
  if (mode === "none") return 0;
  if (mode === "compact") return 2.4;

  const attachmentCount = data.showBeilagen !== false ? visibleLetterAttachments(data).length : 0;
  return attachmentCount > 0 ? Math.min(24, 7 + attachmentCount * 3.6) : 4;
}

function effectiveHeaderMode(design: LetterDesign, firstPage: boolean): LetterHeaderMode {
  const requested = design.headerMode ?? "compact";
  if (firstPage) return requested;
  // Continuation pages keep only a small design signature; sender contact data is not repeated.
  return requested === "none" ? "none" : "compact";
}

function effectiveFooterMode(
  design: LetterDesign,
  finalPage: boolean,
): LetterFooterMode {
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
  const archetype = letterArchetypeFor(design.template);
  const freshTemplate = design.template !== "brief" && FRESH_TEMPLATE_SET.has(design.template);
  const requestedHeaderMode = design.headerMode ?? "compact";
  const requestedFooterMode = design.footerMode ?? "compact";
  const headerMode = effectiveHeaderMode(design, firstPage);
  const footerMode = effectiveFooterMode(design, finalPage);
  const footerHeight = letterFooterHeightMm(data, footerMode);
  const insets = CONTENT_INSETS[archetype];
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
      contactHeight: 18,
      contactLeft: 24,
      contactRight: 23,
      contactTop: 3.1,
      contactMinHeight: 11,
      sidebarWidth: archetype === "sidebar" ? 6 : 0,
      compactTopBandHeight: archetype === "band" ? 5 : 0,
      compactAccent: COMPACT_ACCENTS[archetype],
      compactLineTop: archetype === "quiet" || archetype === "fresh" ? 13 : 0,
      compactPill:
        archetype === "frame" ? { left: 160, top: 11, width: 32, height: 7 } : null,
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

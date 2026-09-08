import { DEFAULTS } from "@/default-config";
import type { Block, ColorSlot, CoverData, CustomField, TemplateId } from "./types";
import { DEFAULT_COVER_BEILAGEN } from "./types";
import { buildBlocks as buildBaseBlocks } from "./layouts-base";
import type { StyleOverrides } from "./layouts-base";
import { isFreshTemplate } from "./fresh-templates";
import { templateDecorations } from "./template-decorations";
import "./editable-decorations.css";
import "./fresh-cover-visual-cleanup.css";

// Keep the established layout catalogue in a stable base module. Simple visual
// primitives live exactly once as editor blocks in template-decorations.ts;
// CoverBackground is reserved for structural masks, frames and page surfaces.
export * from "./layouts-base";

const MODERN_TOP_CLUSTER_OFFSET_MM = 6;
const COVER_BEILAGEN_RIGHT_X_MM = 110;
const COVER_BEILAGEN_WIDTH_MM = 80;
const COVER_BEILAGEN_MAX_BOTTOM_MM = 276;

function templateDefaultAdjustment(
  template: TemplateId,
  block: Block,
  overrides: StyleOverrides,
): Block {
  let adjusted = block;

  // Brief intentionally reuses Modern's base geometry. Keep the document label
  // on the same corrected 20mm left margin as Modern unless the user moved it.
  if (
    (template === "modern" || (template as string) === "brief") &&
    block.id === "eyebrow" &&
    overrides[block.id]?.x === undefined
  ) {
    adjusted = { ...adjusted, style: { ...adjusted.style, x: 20 } };
  }

  if (template === "modern") {
    if (
      (block.id === "foto" || block.id === "modernAccentCircle") &&
      overrides[block.id]?.y === undefined
    ) {
      adjusted = {
        ...adjusted,
        style: { ...adjusted.style, y: adjusted.style.y + MODERN_TOP_CLUSTER_OFFSET_MM },
      };
    }
  }

  if (template === "blockig" && block.id === "kicker") {
    adjusted = {
      ...adjusted,
      style: {
        ...adjusted.style,
        ...(overrides[block.id]?.w === undefined ? { w: 174 } : {}),
        ...(overrides[block.id]?.maxLines === undefined ? { maxLines: 1 } : {}),
      },
    };
  }

  return adjusted;
}

/**
 * Templates 21-38 were originally registered after the legacy layout switch
 * and therefore fell through to the old Warm content schema. That leaked stale
 * eyebrow copy from another design and placed the complete application kicker
 * plus profession on one flowing line.
 *
 * Keep the proven geometry for now, but give every Fresh cover one explicit
 * content contract:
 * - the top label is the stable document label "Bewerbung";
 * - application kicker and profession are separate logical lines inside the
 *   existing `beruf` block, so all template-specific transforms remain valid;
 * - the profession keeps its accent colour/weight without allowing `ALS` to
 *   flow behind the profession title.
 *
 * User data is not mutated. Switching back to a legacy template still restores
 * a custom eyebrow exactly as entered.
 */
function freshContentAdjustment(template: TemplateId, data: CoverData, block: Block): Block {
  if (!isFreshTemplate(template)) return block;

  if (block.id === "eyebrow") {
    return {
      ...block,
      lines: ["Bewerbung"],
      style: { ...block.style, maxLines: 1 },
    };
  }

  if (block.id === "beruf") {
    if (!data.beruf.trim()) return { ...block, lines: [] };
    const kicker = data.kicker.trim() || DEFAULTS.KICKER;
    return {
      ...block,
      lines: [kicker, [{ t: data.beruf, color: "primary", weight: 700 }]],
      style: {
        ...block.style,
        maxLines: Math.max(3, block.style.maxLines ?? 0),
        lineHeight: Math.max(1.2, block.style.lineHeight),
      },
    };
  }

  return block;
}

export function buildBlocks(
  template: TemplateId,
  data: CoverData,
  customs: CustomField[],
  overrides: StyleOverrides,
  slots: ColorSlot[],
): Block[] {
  const blocks = buildBaseBlocks(template, data, customs, overrides, slots).map((block) =>
    freshContentAdjustment(
      template,
      data,
      templateDefaultAdjustment(template, block, overrides),
    ),
  );
  const decorations = templateDecorations(template, overrides).map((block) =>
    templateDefaultAdjustment(template, block, overrides),
  );

  const companyVisible = data.showBetriebOnCover === true;
  const beilagen = DEFAULT_COVER_BEILAGEN.map(
    (fallback, index) => data.beilagen?.[index] ?? fallback,
  ).filter((value) => value.trim());
  const beilagenVisible = data.showBeilagenOnCover !== false && beilagen.length > 0;

  // Ausblenden entfernt nur die Darstellung. Die Firmendaten bleiben im
  // Titelblatt gespeichert und stehen weiterhin für das Motivationsschreiben
  // zur Übernahme bereit.
  const contentBlocks = blocks.map((block) =>
    !companyVisible && (block.id === "anTitel" || block.id === "empfaenger")
      ? { ...block, lines: [] }
      : block,
  );

  if (beilagenVisible) {
    const contactBody = blocks.find((block) => block.id === "kontakt");
    const recipientTitle = blocks.find((block) => block.id === "anTitel");
    const recipientBody = blocks.find((block) => block.id === "empfaenger");

    if (recipientTitle && recipientBody) {
      const titleBase = companyVisible
        ? {
            ...recipientTitle.style,
            above: "beilagen",
            follows: null,
            anchorBottom: false,
            gap: 1.5,
            uppercase: false,
            weight: Math.max(600, recipientTitle.style.weight),
          }
        : {
            ...recipientTitle.style,
            x: COVER_BEILAGEN_RIGHT_X_MM,
            w: COVER_BEILAGEN_WIDTH_MM,
            align: "right" as const,
            above: "beilagen",
            follows: null,
            anchorBottom: false,
            gap: 1.5,
            uppercase: false,
            weight: Math.max(600, recipientTitle.style.weight),
          };
      const bodyBase = companyVisible
        ? {
            ...recipientBody.style,
            above: "anTitel",
            follows: null,
            anchorBottom: false,
            gap: 2,
          }
        : {
            ...recipientBody.style,
            // If the company is hidden, the old recipient chain no longer has
            // a lower anchor. Without an explicit replacement the base `y=20`
            // leaks through and puts Beilagen beside the date/photo. Keep the
            // optional cover attachments in their own stable bottom-right slot,
            // aligned with the contact block where possible but capped at the
            // established print-safe lower edge.
            x: COVER_BEILAGEN_RIGHT_X_MM,
            w: COVER_BEILAGEN_WIDTH_MM,
            y: Math.min(
              contactBody?.style.anchorBottom === true
                ? contactBody.style.y
                : COVER_BEILAGEN_MAX_BOTTOM_MM,
              COVER_BEILAGEN_MAX_BOTTOM_MM,
            ),
            align: "right" as const,
            follows: null,
            above: null,
            anchorBottom: true,
          };
      const titleOverride = overrides.beilagenTitel ?? {};
      const bodyOverride = overrides.beilagen ?? {};

      contentBlocks.push(
        {
          id: "beilagenTitel",
          label: "Titel Beilagen",
          kind: "text",
          lines: ["Beilagen:"],
          style: {
            ...titleBase,
            ...titleOverride,
            weight: Math.max(600, titleOverride.weight ?? titleBase.weight),
          },
        },
        {
          id: "beilagen",
          label: "Beilagen",
          kind: "text",
          lines: beilagen,
          style: { ...bodyBase, ...bodyOverride },
        },
      );
    }
  }

  // Decorations render first so text/photos/custom content remain above them.
  // They are normal shape blocks, so BlockLayer + ElementBar own dragging,
  // resizing, colours, opacity, reset and removal without a background twin.
  return [...decorations, ...contentBlocks];
}

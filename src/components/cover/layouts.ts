import type { Block, ColorSlot, CoverData, CustomField, TemplateId } from "./types";
import { DEFAULT_COVER_BEILAGEN } from "./types";
import { buildBlocks as buildBaseBlocks } from "./layouts-base";
import type { StyleOverrides } from "./layouts-base";
import { templateDecorations } from "./template-decorations";
import "./editable-decorations.css";

// Keep the established layout catalogue in a stable base module. Simple visual
// primitives live exactly once as editor blocks in template-decorations.ts;
// CoverBackground is reserved for structural masks, frames and page surfaces.
export * from "./layouts-base";

const MODERN_TOP_CLUSTER_OFFSET_MM = 6;

function templateDefaultAdjustment(
  template: TemplateId,
  block: Block,
  overrides: StyleOverrides,
): Block {
  let adjusted = block;

  if (template === "modern") {
    if (block.id === "eyebrow" && overrides[block.id]?.x === undefined) {
      adjusted = { ...adjusted, style: { ...adjusted.style, x: 20 } };
    }
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

export function buildBlocks(
  template: TemplateId,
  data: CoverData,
  customs: CustomField[],
  overrides: StyleOverrides,
  slots: ColorSlot[],
): Block[] {
  const blocks = buildBaseBlocks(template, data, customs, overrides, slots).map((block) =>
    templateDefaultAdjustment(template, block, overrides),
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
            follows: "beilagenTitel",
            above: null,
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

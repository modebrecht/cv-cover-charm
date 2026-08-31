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

function modernTopClusterOffset(
  template: TemplateId,
  block: Block,
  overrides: StyleOverrides,
): Block {
  if (template !== "modern") return block;
  if (block.id !== "foto" && block.id !== "modernAccentCircle") return block;
  if (overrides[block.id]?.y !== undefined) return block;

  return {
    ...block,
    style: { ...block.style, y: block.style.y + MODERN_TOP_CLUSTER_OFFSET_MM },
  };
}

export function buildBlocks(
  template: TemplateId,
  data: CoverData,
  customs: CustomField[],
  overrides: StyleOverrides,
  slots: ColorSlot[],
): Block[] {
  const blocks = buildBaseBlocks(template, data, customs, overrides, slots).map((block) =>
    modernTopClusterOffset(template, block, overrides),
  );
  const decorations = templateDecorations(template, overrides).map((block) =>
    modernTopClusterOffset(template, block, overrides),
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

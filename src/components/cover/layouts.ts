import type {
  Block,
  BlockStyle,
  ColorSlot,
  CoverData,
  CustomField,
  TemplateId,
} from "./types";
import { buildBlocks as buildBaseBlocks } from "./layouts-base";
import type { StyleOverrides } from "./layouts-base";

// Keep the established layout catalogue in a stable base module. This wrapper
// only adds template decorations that need to behave like real editable blocks.
export * from "./layouts-base";

function modernDecorations(
  blocks: Block[],
  overrides: StyleOverrides,
): Block[] {
  const seed = blocks.find((block) => block.id === "trenner")?.style;
  if (!seed) return [];

  const shape = (
    id: string,
    label: string,
    kind: "line" | "rect",
    defaults: Partial<BlockStyle>,
  ): Block => ({
    id,
    label,
    kind: "shape",
    shape: kind,
    lines: [],
    style: {
      ...seed,
      hidden: false,
      ...defaults,
      ...(overrides[id] ?? {}),
    },
  });

  return [
    shape("modernAccentLine", "Akzentstrich", "line", {
      x: 20,
      y: 21,
      w: 10,
      ratio: 0,
      color: "accent",
      fill: null,
      strokeWidth: 2,
      opacity: 1,
    }),
    shape("modernBottomBand", "Unteres Farbband", "rect", {
      x: 0,
      y: 293,
      w: 210,
      ratio: 4 / 210,
      color: "primary",
      fill: "primary",
      strokeWidth: 0,
      bgRadius: 0,
      opacity: 1,
    }),
  ];
}

export function buildBlocks(
  template: TemplateId,
  data: CoverData,
  customs: CustomField[],
  overrides: StyleOverrides,
  slots: ColorSlot[],
): Block[] {
  const blocks = buildBaseBlocks(template, data, customs, overrides, slots);
  if (template !== "modern") return blocks;

  // Decorations render first so document text remains above them. Because they
  // are normal blocks, BlockLayer/ElementBar automatically provide selection,
  // dragging, size/color controls, reset and remove/hide behaviour.
  return [...modernDecorations(blocks, overrides), ...blocks];
}

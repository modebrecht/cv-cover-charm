import type { Block, ColorSlot, CoverData, CustomField, TemplateId } from "./types";
import { buildBlocks as buildBaseBlocks } from "./layouts-base";
import type { StyleOverrides } from "./layouts-base";
import { templateDecorations } from "./template-decorations";
import "./editable-decorations.css";

// Keep the established layout catalogue in a stable base module. This wrapper
// adds simple template artwork as real editor blocks while complex structural
// backgrounds stay in CoverBackground.
export * from "./layouts-base";

export function buildBlocks(
  template: TemplateId,
  data: CoverData,
  customs: CustomField[],
  overrides: StyleOverrides,
  slots: ColorSlot[],
): Block[] {
  const blocks = buildBaseBlocks(template, data, customs, overrides, slots);
  const decorations = templateDecorations(template, overrides);

  // Decorations render first so text/photos/custom content remain above them.
  // They are otherwise normal shape blocks, so the shared BlockLayer and
  // ElementBar provide dragging, size, colour, opacity, reset and remove.
  return [...decorations, ...blocks];
}

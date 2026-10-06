import { walkBlocks, type DocBlock } from "./model";

/** Semantic groups for row-aligned tracks. No text lookup, height estimate or page plan.
 * A short entry belongs to the outer native row instead of a nested entry table.
 * Rows taller than a page remain native and may flow across pages.
 */
export function semanticFlowUnits(blocks: DocBlock[]): DocBlock[][] {
  const units = blocks.flatMap((block): DocBlock[][] => {
    if (block.kind === "entry") return [[{ ...block, keepTogether: false }]];
    if (block.kind === "section" || block.kind === "group") {
      const children = semanticFlowUnits(block.blocks);
      const first = { ...block, blocks: children[0] ?? [] };
      return [[first], ...children.slice(1)];
    }
    return [[block]];
  });
  const grouped: DocBlock[][] = [];
  for (const unit of units) {
    const previous = grouped.at(-1);
    const tail = previous && walkBlocks(previous).at(-1);
    if (tail?.kind === "paragraph" && tail.keepNext) previous!.push(...unit);
    else grouped.push(unit);
  }
  return grouped;
}

import type { DocBlock, DocumentPart } from "./model";
import { walkBlocks } from "./model";

export type PlannedSection = {
  id: string;
  blocks: DocBlock[];
  columns: { count: 1 | 2 | 3; gapMm: number };
  breakBefore: "nextPage" | "continuous";
  logicalStart: boolean;
};
/** Physical Word sections preserve logical dossier parts and native column flow. */
export function planPartSections(part: DocumentPart): PlannedSection[] {
  const result: PlannedSection[] = [];
  let normal: DocBlock[] = [];
  const add = (blocks: DocBlock[], count: 1 | 2 | 3, gapMm = 0) => {
    result.push({
      id: `${part.id}.flow:${result.length}`,
      blocks,
      columns: { count, gapMm },
      breakBefore: result.length ? "continuous" : "nextPage",
      logicalStart: !result.length,
    });
  };
  const flush = () => {
    if (normal.length) add(normal, 1);
    normal = [];
  };
  const visit = (block: DocBlock) => {
    if (block.kind === "group" && !block.startPage) {
      block.blocks.forEach(visit);
      return;
    }
    if (block.kind === "column-flow") {
      if (walkBlocks(block.blocks).some((child) => child.kind === "column-flow"))
        throw new Error(`Nested column flow is unsupported: ${block.id}`);
      flush();
      add(block.blocks, block.count, block.gapMm);
    } else {
      if (walkBlocks([block]).some((child) => child.kind === "column-flow"))
        throw new Error(
          `Column flow must be in document flow, outside tables/entries: ${block.id}`,
        );
      normal.push(block);
    }
  };
  part.blocks.forEach(visit);
  flush();
  if (!result.length) add([], 1);
  return result;
}

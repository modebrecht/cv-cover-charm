import { lineText, type Block } from "@/components/cover/types";

export type CoverPdfTextBlock = { id: string; lines: string[] };

export function pdfBlockTextLines(block: Block): string[] {
  return block.lines.map((line) => lineText(line).replace(/\s+/g, ""));
}

/** Expected material text comes from the renderer input, never the painted DOM. */
export function coverPdfTextContract(blocks: readonly Block[]): string {
  return JSON.stringify({
    version: 1,
    blocks: blocks
      .filter((block) => block.kind === "text" && !block.style.hidden)
      .map((block) => ({ id: block.id, lines: pdfBlockTextLines(block) }))
      .filter((block) => block.lines.some(Boolean)),
  });
}

export function readCoverPdfTextContract(value: string | undefined): CoverPdfTextBlock[] | null {
  try {
    const contract = JSON.parse(value ?? "null");
    if (contract?.version !== 1 || !Array.isArray(contract.blocks)) return null;
    const ids = new Set<string>();
    for (const block of contract.blocks) {
      if (
        !block ||
        typeof block.id !== "string" ||
        !block.id ||
        ids.has(block.id) ||
        !Array.isArray(block.lines) ||
        !block.lines.every((line: unknown) => typeof line === "string")
      )
        return null;
      ids.add(block.id);
    }
    return contract.blocks;
  } catch {
    return null;
  }
}

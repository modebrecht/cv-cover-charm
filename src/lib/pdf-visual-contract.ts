import type { Block } from "@/components/cover/types";
import { pdfBlockTextLines } from "@/lib/cover-pdf-text-contract";

export type PdfVisualBlock = {
  id: string;
  page: number;
  image?: string;
  shape?: "box" | "path";
  lines?: string[];
};

export type PdfVisualContract = {
  version: 1;
  portrait: string | null;
  blocks: PdfVisualBlock[];
};

type VisualSource =
  | {
      kind: "cover";
      blocks: readonly Block[];
      photo: string | null;
    }
  | { kind: "cv"; pages: readonly (readonly Block[])[]; photo: string | null };

/** Compare the authored image URL without duplicating its data URL on the canvas. */
export function pdfImageSourceKey(source: string): string {
  let hash = 2166136261;
  for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619);
  return `${source.length}:${(hash >>> 0).toString(16)}`;
}

export function pdfVisualContract(source: VisualSource): string {
  const pages = source.kind === "cover" ? [source.blocks] : source.pages;
  const blocks: PdfVisualBlock[] = [];
  pages.forEach((pageBlocks, page) => {
    for (const block of pageBlocks) {
      if (block.style.hidden) continue;
      const required: PdfVisualBlock = { id: block.id, page };
      const image =
        block.kind === "photo"
          ? source.kind === "cover" && source.photo
          : block.kind === "image" || block.kind === "text"
            ? block.src
            : null;
      if (image) required.image = pdfImageSourceKey(image);
      if (
        block.kind === "shape" &&
        block.custom &&
        block.style.opacity !== 0 &&
        (block.shape !== "path" || block.path?.trim())
      )
        required.shape = block.shape === "path" ? "path" : "box";
      if (source.kind === "cv" && block.kind === "text") {
        const lines = pdfBlockTextLines(block);
        if (lines.some(Boolean)) required.lines = lines;
      }
      if (required.image || required.shape || required.lines) blocks.push(required);
    }
  });
  return JSON.stringify({
    version: 1,
    portrait: source.kind === "cv" && source.photo ? pdfImageSourceKey(source.photo) : null,
    blocks,
  } satisfies PdfVisualContract);
}

export function readPdfVisualContract(value: string | undefined): PdfVisualContract | null {
  try {
    const contract = JSON.parse(value ?? "null");
    if (
      contract?.version !== 1 ||
      !(
        contract.portrait === null ||
        (typeof contract.portrait === "string" && contract.portrait)
      ) ||
      !Array.isArray(contract.blocks)
    )
      return null;
    const ids = new Set<string>();
    for (const block of contract.blocks) {
      if (
        !block ||
        typeof block.id !== "string" ||
        !block.id ||
        (block.page !== 0 && block.page !== 1) ||
        (block.image !== undefined && (typeof block.image !== "string" || !block.image)) ||
        (block.shape !== undefined && block.shape !== "box" && block.shape !== "path") ||
        (block.lines !== undefined &&
          (!Array.isArray(block.lines) ||
            !block.lines.every((line: unknown) => typeof line === "string") ||
            !block.lines.some(Boolean))) ||
        !(block.image || block.shape || block.lines)
      )
        return null;
      const key = `${block.page}:${block.id}`;
      if (ids.has(key)) return null;
      ids.add(key);
    }
    return contract;
  } catch {
    return null;
  }
}

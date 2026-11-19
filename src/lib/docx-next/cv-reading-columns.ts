import { cvSectionLayout, cvSectionOrder, type CvData } from "@/components/cv/types";
import { cvFlowColumns } from "@/lib/cv-flow-columns";
import type { InteriorTextMetrics } from "./interior-metrics";
import { parallelFlowTable } from "./parallel-flow";
import { walkBlocks, type DocBlock, type DocumentPart, type SectionBlock } from "./model";

/** Lower the saved compact sections to native cells using the Web column capture when supplied. */
export function composeCvReadingColumns(
  part: DocumentPart,
  data: CvData,
  measuredGroups?: InteriorTextMetrics["cvMasonryColumns"],
) {
  const layouts = new Map(
    cvSectionOrder(data).map((key) => [`cv.section.${key}`, cvSectionLayout(data, key)]),
  );
  const width = part.page.widthMm - part.page.margins.left - part.page.margins.right;
  const gap = 6;
  const trackWidth = (width - gap) / 2;
  const result: DocBlock[] = [];
  for (let index = 0; index < part.blocks.length; index++) {
    const first = part.blocks[index];
    if (first.kind !== "section" || first.width !== "half") {
      result.push(first);
      continue;
    }
    const masonry = layouts.get(first.id)?.packing === "masonry";
    const items: SectionBlock[] = [first];
    while (index + 1 < part.blocks.length) {
      const next = part.blocks[index + 1];
      if (
        next.kind !== "section" ||
        next.width !== "half" ||
        next.startPage !== first.startPage ||
        (layouts.get(next.id)?.packing === "masonry") !== masonry ||
        (!masonry && items.length === 2)
      )
        break;
      items.push(next);
      index++;
    }
    let columns = [items.slice(0, 1), items.slice(1)];
    if (masonry && items.length > 1) {
      if (measuredGroups) {
        const sections = new Map(items.map((section) => [section.id, section]));
        const measured = measuredGroups.find((group) => {
          const ids = group.flat();
          return (
            ids.length === sections.size &&
            new Set(ids).size === sections.size &&
            ids.every((id) => sections.has(id))
          );
        });
        if (!measured)
          throw Error(
            "DOCX Next: Gemessene Masonry-Spalten stimmen nicht mit den Rubriken überein.",
          );
        columns = measured.map((column) => column.map((id) => sections.get(id)!));
      } else {
        columns = cvFlowColumns(
          items,
          (section) =>
            (section.heading ? 1 : 0) + section.blocks.filter((b) => b.kind !== "rule").length,
        );
      }
    }
    const tracks = columns.map((sections) => ({
      weight: 1,
      blocks: sections.map((section) => {
        const copy = { ...section, width: "full" as const, startPage: 1 as const };
        for (const block of walkBlocks([copy]))
          if (block.kind === "paragraph" && block.flowSurface) {
            block.flowSurface.rowWidthMm = trackWidth - (block.indentMm ?? 0);
            if (block.flowSurface.widthMm > block.flowSurface.rowWidthMm + 0.001)
              throw Error(
                `DOCX Next: Rubrik überschreitet die gespeicherte Spaltenbreite (${block.id}).`,
              );
          }
        return copy;
      }),
    }));
    const id = `cv.reading-columns:${items.map((s) => s.id).join("|")}`;
    const table = parallelFlowTable({ kind: "parallel-flow", id, gapMm: gap, tracks }, width);
    result.push({ kind: "group", id: `${id}.flow`, startPage: first.startPage, blocks: [table] });
  }
  part.blocks = result;
}

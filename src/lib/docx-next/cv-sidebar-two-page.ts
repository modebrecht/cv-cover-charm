import { CV_TWO_PAGE_PREVIEW_ERROR, DocxDownloadError } from "./download-error";
import type { CvSidebarTextMetrics } from "./cv-sidebar-text-metrics";
import { walkBlocks, type DocBlock, type DocumentPart } from "./model";

/** Keep the measured table, picture anchor and formatting. Split only at whole native rows. */
export function composeTwoPageCvSidebar(
  part: DocumentPart,
  fieldPages: NonNullable<CvSidebarTextMetrics["fieldPages"]>,
): void {
  const fail = (): never => {
    throw new DocxDownloadError(CV_TWO_PAGE_PREVIEW_ERROR);
  };
  const body = part.blocks.find((block) => block.id === "cv.sidebar");
  if (body?.kind !== "table" || body.rows.length !== 1) return fail();
  const row = body.rows[0];

  function pageFor(block: DocBlock): 1 | 2 {
    const fields = walkBlocks([block]).filter(
      (item) => item.kind === "paragraph" && item.runs.some((run) => run.text.trim()),
    );
    const page = fieldPages[fields[0]?.id];
    if ((page !== 1 && page !== 2) || fields.some((field) => fieldPages[field.id] !== page))
      return fail();
    return page;
  }

  function splitStory(blocks: DocBlock[]): [DocBlock[], DocBlock[]] {
    const pages: [DocBlock[], DocBlock[]] = [[], []];
    for (const block of blocks) {
      if (
        block.kind === "table" &&
        (block.id === "cv.sidebar.side-story" || block.id === "cv.sidebar.main-story")
      ) {
        const [inset] = block.rows;
        splitStory(inset.cells[0]).forEach((children, index) => {
          if (children.length)
            pages[index].push({
              ...block,
              id: index ? `${block.id}.continuation` : block.id,
              rows: [{ ...inset, cells: [children] }],
            });
        });
        continue;
      }
      if (block.kind !== "section") {
        if (block.kind !== "paragraph" || pageFor(block) !== 1) return fail();
        pages[0].push(block);
        continue;
      }
      if (block.width !== "full" || !block.blocks.length) return fail();
      const membership = block.blocks.map(pageFor);
      const split = membership.indexOf(2);
      if (
        (block.startPage === 2 && split !== 0) ||
        (block.id === "cv.section.person" && split !== -1) ||
        (split !== -1 && membership.slice(split).includes(1))
      )
        return fail();
      const first = split === -1 ? block.blocks : block.blocks.slice(0, split);
      if (first.length) pages[0].push({ ...block, startPage: 1, blocks: first });
      if (split !== -1)
        pages[1].push({
          ...block,
          id: first.length ? `${block.id}.continuation` : block.id,
          heading: first.length ? undefined : block.heading,
          startPage: 1,
          blocks: block.blocks.slice(split),
        });
    }
    return pages;
  }

  const cells = row.cells.map(splitStory);
  const firstCells = cells.map(([first]) => first);
  const secondCells = cells.map(([, second]) => second);
  if (!firstCells.some((cell) => cell.length) || !secondCells.some((cell) => cell.length))
    return fail();
  const continuation = {
    ...body,
    id: "cv.sidebar.continuation",
    bodyBoundary: undefined,
    bodyBoundaryLeadByCellMm: undefined,
    columnRounding: undefined,
    rows: [{ ...row, cells: secondCells }],
  };
  row.cells = firstCells;
  part.blocks.splice(
    part.blocks.indexOf(body) + 1,
    0,
    { kind: "page-break", id: "cv.sidebar.page-break" },
    continuation,
  );
}

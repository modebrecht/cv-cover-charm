import type { CvSidebarTextMetrics } from "./cv-sidebar-text-metrics";
import { walkBlocks, type DocBlock, type DocumentPart, type SectionBlock } from "./model";
import { halfWidthRubricRow } from "./cv-half-width-row";

type LongFlow = NonNullable<CvSidebarTextMetrics["longFlow"]>;
type StoryItem = { block: DocBlock; section?: SectionBlock; first?: boolean };

function splitFlowItems(blocks: DocBlock[], flow: LongFlow): DocBlock[][] {
  const items = blocks.flatMap((block): StoryItem[] =>
    block.kind === "section" && block.width === "full" && block.blocks.length
      ? block.blocks.map((child, index) => ({ block: child, section: block, first: index === 0 }))
      : [{ block }],
  );
  const pages = items.map(({ block }, index) => {
    const previous = items[index - 1]?.block;
    // The renderer lays out adjacent half-width rubrics as a pair.
    if (
      block.kind === "section" &&
      block.width === "half" &&
      previous?.kind === "section" &&
      previous.width === "half"
    )
      return undefined;
    return walkBlocks([block])
      .flatMap((part) =>
        part.kind === "paragraph"
          ? [part.id, ...part.runs.flatMap((run) => run.fieldId ?? [])]
          : [],
      )
      .map((id) => flow.fieldStarts[id])
      .find((page) => page !== undefined);
  });
  // Cut near the middle of every other measured sheet so one row can flow
  // across a page boundary without having to carry several pages of entries.
  const starts = [0];
  for (let page = 2; page <= flow.pageCount; page += 2) {
    const previous = starts.at(-1)!;
    const candidates = pages.flatMap((value, i) => (i > previous && value === page ? [i] : []));
    const following = pages.findIndex(
      (value, i) => i > previous && value !== undefined && value > page,
    );
    starts.push(
      candidates[Math.floor(candidates.length / 2)] ??
        (following === -1 ? items.length : following),
    );
  }

  function restore(group: StoryItem[], rowIndex: number): DocBlock[] {
    const output: DocBlock[] = [];
    let section: SectionBlock | undefined;
    let current: SectionBlock | undefined;
    for (const item of group) {
      if (!item.section) {
        section = current = undefined;
        output.push(item.block);
        continue;
      }
      if (item.section !== section || !current) {
        section = item.section;
        current = item.first
          ? { ...section, blocks: [] }
          : {
              ...section,
              id: `cv.sidebar.continuation.${rowIndex}.${section.id}`,
              heading: undefined,
              blocks: [],
            };
        output.push(current);
      }
      current.blocks.push(item.block);
    }
    return output;
  }

  return starts.map((start, index) => restore(items.slice(start, starts[index + 1]), index));
}

function splitHalfWidthRubrics(blocks: DocBlock[], flow: LongFlow): DocBlock[] {
  const result: DocBlock[] = [];
  for (let index = 0; index < blocks.length; index++) {
    const left = blocks[index];
    if (left.kind !== "section" || left.width !== "half") {
      result.push(left);
      continue;
    }
    const next = blocks[index + 1];
    const right =
      next?.kind === "section" && next.width === "half" && next.startPage === left.startPage
        ? next
        : undefined;
    const columns = [left, right].map((section) =>
      section ? splitFlowItems([{ ...section, width: "full" }], flow) : [],
    );
    const rows = columns[0]
      .map((a, row) => [a, columns[1][row] ?? []])
      .filter(([a, b]) => a.length || b.length);
    if (rows.length < 2) result.push(left, ...(right ? [right] : []));
    else
      rows.forEach(([a, b], row) =>
        result.push(halfWidthRubricRow(`${left.id}.half-row${row ? `.${row}` : ""}`, a, b)),
      );
    if (right) index++;
  }
  return result;
}

function splitStory(story: DocBlock[], flow: LongFlow): DocBlock[][] {
  const first = story[0];
  const inset =
    story.length === 1 &&
    first?.kind === "table" &&
    ["cv.sidebar.main-story", "cv.sidebar.side-story"].includes(first.id)
      ? first
      : undefined;
  const blocks = inset?.rows[0].cells[0] ?? story;
  const groups = splitFlowItems(splitHalfWidthRubrics(blocks, flow), flow);
  const last = groups.reduce((last, group, index) => (group.length ? index : last), -1);
  return groups.map((group, index) => {
    if (!inset || !group.length) return group;
    const row = inset.rows[0];
    return [
      {
        ...inset,
        id: index === 0 ? inset.id : `${inset.id}.continuation.${index}`,
        rows: [
          {
            ...row,
            cells: [group],
            cellDecorations: row.cellDecorations?.map(
              (cell) =>
                cell && {
                  ...cell,
                  ...(index ? { paddingTopMm: 0 } : {}),
                  ...(index < last ? { paddingBottomMm: 0 } : {}),
                },
            ),
          },
        ],
      },
    ];
  });
}

/** Bound each native row at whole, measured CV entries. Word still flows the rows. */
export function composeLongCvSidebar(part: DocumentPart, flow: LongFlow): boolean {
  const body = part.blocks.find((block) => block.id === "cv.sidebar");
  if (
    part.layout.mode !== "sidebar" ||
    body?.kind !== "table" ||
    body.bodyBoundary !== "section-start" ||
    body.rows.length !== 1 ||
    flow.pageCount < 3 ||
    part.footer.length ||
    part.firstFooter?.length
  )
    return false;

  const [opening] = body.rows;
  const stories = opening.cells.map((cell) => splitStory(cell, flow));
  const [first, ...later] = stories[0].map((_, index) => stories.map((story) => story[index]));
  const continuation = later.filter((cells) => cells.some((cell) => cell.length));
  if (!continuation.length) return false;

  opening.cells = first;
  const decoration = opening.cellDecorations?.map(
    (cell) => cell && { ...cell, paddingTopMm: 0, paddingBottomMm: 0 },
  );
  body.rows.push(
    ...continuation.map((cells) => ({ cells, keepTogether: false, cellDecorations: decoration })),
  );
  part.page.footerDistanceMm = 0;
  return true;
}

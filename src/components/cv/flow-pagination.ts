import type { ReactNode } from "react";

export type CvFlowRow = {
  id: string;
  node: ReactNode;
  heading?: boolean;
  minPage?: 0 | 1;
  measureKey?: string;
  sectionKey?: string;
  textFlow?: {
    text: string;
    offset: number;
    continuation: boolean;
    render: (text: string, continuation: boolean) => ReactNode;
  };
  columns?: {
    rows: CvFlowRow[][];
    render: (columns: CvFlowRow[][]) => ReactNode;
  };
};

type Measure = (row: CvFlowRow) => number;

function textFragment(row: CvFlowRow, text: string, offset: number): CvFlowRow {
  const flow = row.textFlow!;
  const continuation = flow.continuation || offset > flow.offset;
  return {
    ...row,
    measureKey: row.measureKey ?? row.id,
    id: `${row.measureKey ?? row.id}:fragment:${offset}`,
    node: flow.render(text, continuation),
    textFlow: { ...flow, text, offset, continuation },
  };
}

/** Split by measured words first. Grapheme boundaries also support one very long token. */
function splitText(
  row: CvFlowRow,
  capacity: number,
  measure: Measure,
): [CvFlowRow, CvFlowRow] | null {
  const flow = row.textFlow!;
  if (capacity <= 0 || !flow.text) return null;
  const search = (ends: number[]) => {
    let low = 0,
      high = ends.length - 1,
      best = 0;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2),
        end = ends[mid];
      if (measure(textFragment(row, flow.text.slice(0, end), flow.offset)) <= capacity) {
        best = end;
        low = mid + 1;
      } else high = mid - 1;
    }
    return best;
  };
  const words = Array.from(flow.text.matchAll(/\S+\s*/gu), (m) => m.index! + m[0].length);
  let end = search(words);
  if (!end) {
    const segments = new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(flow.text);
    end = search(Array.from(segments, (s) => s.index + s.segment.length));
  }
  if (!end || end >= flow.text.length || !flow.text.slice(0, end).trim()) return null;
  return [
    textFragment(row, flow.text.slice(0, end), flow.offset),
    textFragment(row, flow.text.slice(end), flow.offset + end),
  ];
}

function takeColumn(rows: CvFlowRow[], capacity: number, nextCapacity: number, measure: Measure) {
  const taken: CvFlowRow[] = [];
  let used = 0,
    index = 0;
  for (; index < rows.length; index++) {
    const row = rows[index],
      height = measure(row),
      remaining = capacity - used;
    if (row.heading && rows[index + 1]) {
      const next = rows[index + 1];
      // An ordinary entry stays with its heading. For an oversized description,
      // require a real measured first fragment rather than reserving the full entry.
      if (
        height + measure(next) > remaining &&
        !(
          next.textFlow &&
          (measure(next) > nextCapacity - height || next.textFlow.continuation) &&
          splitText(next, remaining - height, measure)
        )
      )
        break;
    }
    if (height <= remaining) {
      taken.push(row);
      used += height;
      continue;
    }
    const headingHeight = taken.at(-1)?.heading ? measure(taken.at(-1)!) : 0;
    if (row.textFlow && (height > nextCapacity - headingHeight || row.textFlow.continuation)) {
      const parts = splitText(row, remaining, measure);
      if (parts) {
        taken.push(parts[0]);
        return { taken, rest: [parts[1], ...rows.slice(index + 1)] };
      }
    }
    break;
  }
  return { taken, rest: rows.slice(index) };
}

function splitColumns(
  row: CvFlowRow,
  capacity: number,
  nextCapacity: number,
  measure: Measure,
): [CvFlowRow, CvFlowRow | null] | null {
  const columns = row.columns!;
  const parts = columns.rows.map((rows) => takeColumn(rows, capacity, nextCapacity, measure));
  if (!parts.some((p) => p.taken.length)) return null;
  const make = (rows: CvFlowRow[][], suffix: string): CvFlowRow => ({
    ...row,
    id: `${row.id}:${suffix}`,
    node: columns.render(rows),
    columns: { ...columns, rows },
  });
  return [
    make(
      parts.map((p) => p.taken),
      "head",
    ),
    parts.some((p) => p.rest.length)
      ? make(
          parts.map((p) => p.rest),
          "tail",
        )
      : null,
  ];
}

/** Pure flow orchestration. Every capacity and fragment height is supplied by the real DOM. */
export function paginateCvFlow(
  rows: CvFlowRow[],
  heightFor: (page: number) => number,
  measure: Measure,
  requiredPages = 1,
): CvFlowRow[][] {
  const pages: CvFlowRow[][] = [];
  let current: CvFlowRow[] = [],
    used = 0,
    page = 0;
  const finish = () => {
    pages.push(current);
    current = [];
    used = 0;
    page++;
  };
  const pending = [...rows];
  while (pending.length) {
    const row = pending.shift()!;
    while (page < (row.minPage ?? 0)) finish();
    const height = measure(row),
      remaining = Math.max(0, heightFor(page) - used),
      nextCapacity = heightFor(page + 1),
      headingHeight = current.at(-1)?.heading ? measure(current.at(-1)!) : 0;
    if (height <= remaining) {
      current.push(row);
      used += height;
      continue;
    }
    const parts = row.columns
      ? splitColumns(row, remaining, nextCapacity, measure)
      : row.textFlow && (height > nextCapacity - headingHeight || row.textFlow.continuation)
        ? splitText(row, remaining, measure)
        : null;
    if (parts) {
      current.push(parts[0]);
      used += measure(parts[0]);
      if (parts[1]) {
        finish();
        pending.unshift(parts[1]);
      }
      continue;
    }
    if (current.length) {
      const heading = current.at(-1)?.heading ? current.pop()! : null;
      if (current.length) finish();
      else {
        current = [];
        used = 0;
      }
      if (heading) {
        current.push(heading);
        used += measure(heading);
      }
      // Re-evaluate against the continuation page, including a carried heading.
      // A heading alone must not cause an infinite sequence of empty pages.
      if (!heading || heightFor(page) - used > remaining) {
        pending.unshift(row);
        continue;
      }
    }
    // Preserve the established handling of unfragmentable non-text items.
    current.push(row);
    used += height;
  }
  if (current.length || !pages.length) pages.push(current);
  while (pages.length < requiredPages) pages.push([]);
  return pages;
}

/** Production DOM adapter. The clone stays in its authored template/column scope. */
export function cvFlowMeasurer(root: HTMLElement, rows: CvFlowRow[], scale: number): Measure {
  const nodes = new Map<string, HTMLElement>();
  Array.from(root.children).forEach((element, i) =>
    nodes.set(rows[i].measureKey ?? rows[i].id, element as HTMLElement),
  );
  for (const node of root.querySelectorAll<HTMLElement>("[data-cv-flow-row]"))
    nodes.set(node.dataset.cvFlowRow!, node);
  const cache = new Map<CvFlowRow, number>();
  const measure: Measure = (row) => {
    if (cache.has(row)) return cache.get(row)!;
    const node = nodes.get(row.measureKey ?? row.id);
    let height: number;
    if (row.columns)
      height = Math.max(
        0,
        ...row.columns.rows.map((column) => column.reduce((sum, r) => sum + measure(r), 0)),
      );
    else if (
      row.textFlow &&
      node &&
      (row.textFlow.continuation ||
        node.querySelector("[data-cv-flow-text]")?.textContent !== row.textFlow.text)
    ) {
      const clone = node.cloneNode(true) as HTMLElement;
      clone.style.position = "absolute";
      clone.style.width = getComputedStyle(node).width;
      clone.style.left = "0";
      clone.style.top = "0";
      clone.style.visibility = "hidden";
      const body = clone.querySelector<HTMLElement>("[data-cv-flow-text]");
      if (body) body.textContent = row.textFlow.text;
      if (row.textFlow.continuation)
        for (const lead of clone.querySelectorAll<HTMLElement>("[data-cv-flow-lead]")) {
          if (lead.dataset.cvFlowLead === "cell") lead.textContent = "";
          else lead.remove();
        }
      node.parentElement!.appendChild(clone);
      height = clone.getBoundingClientRect().height / scale;
      clone.remove();
    } else height = node ? node.getBoundingClientRect().height / scale : 0;
    cache.set(row, height);
    return height;
  };
  return measure;
}

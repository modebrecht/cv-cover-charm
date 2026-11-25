import { paginateCvFlow, type CvFlowRow } from "./flow-pagination";
import type { CvLayoutSectionKey } from "./types";

type SectionKey = Exclude<CvLayoutSectionKey, "person">;
export type CvSidebarRange = [start: number, end: number, column?: 1 | 2];
export type CvSidebarPage = Partial<Record<SectionKey, CvSidebarRange>>;

type SectionSlice = [key: SectionKey, range: CvSidebarRange];
type MeasuredRow = { height: number; slices: SectionSlice[] };
type MeasuredRail = { capacity: number; prefix: number; rows: MeasuredRow[] };
type MeasuredSection = {
  key: SectionKey;
  bounds: DOMRect;
  entries: DOMRect[];
  half: boolean;
  order: number;
};

function sectionRows(sections: MeasuredSection[], scale: number): MeasuredRow[] {
  const [first] = sections;
  if (first.half)
    return [
      {
        height: Math.max(...sections.map(({ bounds }) => bounds.height)) / scale,
        slices: sections.map(({ key, entries }, index) => [
          key,
          [0, entries.length, index === 0 ? 1 : 2],
        ]),
      },
    ];

  const { key, bounds, entries } = first;
  return entries.map((entry, index) => ({
    height:
      ((entries[index + 1]?.top ?? bounds.bottom) - (index === 0 ? bounds.top : entry.top)) / scale,
    slices: [[key, [index, index + 1]]],
  }));
}

/** Measure the unsplit sidebar in its original page geometry. */
function measureRail(rail: HTMLElement, first: boolean): MeasuredRail | null {
  const content = rail.querySelector<HTMLElement>("[data-cv-sidebar-content]");
  if (!content) return null;
  const bounds = rail.getBoundingClientRect();
  const scale = bounds.height / rail.offsetHeight;
  if (!Number.isFinite(scale) || scale <= 0) return null;
  const top = content.getBoundingClientRect().top;
  const padding = Number.parseFloat(getComputedStyle(rail).paddingBottom);
  const capacity = Math.max(0, (bounds.bottom - top) / scale - padding - 2);
  const sections = Array.from(
    content.querySelectorAll<HTMLElement>(":scope > [data-cv-fit-section]"),
    (section): MeasuredSection => ({
      key: section.dataset.cvFitSection as SectionKey,
      bounds: section.getBoundingClientRect(),
      entries: Array.from(
        section.querySelectorAll<HTMLElement>(":scope > [data-cv-entry]"),
        (row) => row.getBoundingClientRect(),
      ),
      half: section.style.gridColumn === "span 1",
      order: Number(section.style.order),
    }),
  ).sort((a, b) => a.bounds.top - b.bounds.top || a.order - b.order);

  // The tall member sets the row height. Move paired half-width sections as a
  // single unit so each keeps its original track on the continuation page.
  const groups: MeasuredSection[][] = [];
  for (const section of sections) {
    const previous = groups.at(-1);
    if (
      section.half &&
      previous?.length === 1 &&
      previous[0].half &&
      Math.abs(previous[0].bounds.top - section.bounds.top) < 0.5
    )
      previous.push(section);
    else groups.push([section]);
  }
  return {
    capacity,
    prefix: first
      ? ((sections[0]?.bounds.top ?? content.getBoundingClientRect().bottom) - top) / scale
      : 0,
    rows: groups.flatMap((group) => sectionRows(group, scale)),
  };
}

/** Keep photos, contact, headings and entries in the same sidebar. */
export function paginateCvSidebar(
  opening: HTMLElement,
  following: HTMLElement,
): CvSidebarPage[] | null {
  const first = measureRail(opening, true);
  const later = measureRail(following, false);
  if (!first || !later) return null;
  const rails = [first, later];
  if (
    !rails.some(
      ({ rows, prefix, capacity }) =>
        rows.length && prefix + rows.reduce((sum, row) => sum + row.height, 0) > capacity,
    )
  )
    return null;

  const prefix = { id: "sidebar-opening", node: null };
  const measured = new Map<CvFlowRow, MeasuredRow>([
    [prefix, { height: first.prefix, slices: [] }],
  ]);
  const rows: CvFlowRow[] = [prefix];
  for (const minPage of [0, 1] as const) {
    rails[minPage].rows.forEach((unit, index) => {
      const row = { id: `${minPage}:${index}`, node: null, minPage };
      rows.push(row);
      measured.set(row, unit);
    });
  }
  const capacityFor = (page: number) => (page === 0 ? first : later).capacity;
  const heightFor = (row: CvFlowRow) => measured.get(row)!.height;
  const pages = paginateCvFlow(rows, capacityFor, heightFor);
  // An indivisible entry can be taller than a sheet. Keep the authored
  // layout in that case so its overflow warning still names the original page.
  if (
    pages.some(
      (page, index) => page.reduce((used, row) => used + heightFor(row), 0) > capacityFor(index),
    )
  )
    return null;

  return pages.map((rows) => {
    const slice: CvSidebarPage = {};
    for (const row of rows) {
      for (const [key, [start, end, column]] of measured.get(row)!.slices)
        slice[key] = column ? [start, end, column] : [slice[key]?.[0] ?? start, end];
    }
    return slice;
  });
}

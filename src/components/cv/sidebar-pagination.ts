import { paginateCvFlow, type CvFlowRow } from "./flow-pagination";
import type { CvLayoutSectionKey } from "./types";

type SectionKey = Exclude<CvLayoutSectionKey, "person">;
export type CvSidebarRange = [start: number, end: number];
export type CvSidebarPage = Partial<Record<SectionKey, CvSidebarRange>>;

type MeasuredSection = { key: SectionKey; headingHeight: number; entries: number[] };
type MeasuredRail = { capacity: number; prefix: number; sections: MeasuredSection[] };

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
  )
    .map((section) => ({ section, bounds: section.getBoundingClientRect() }))
    .sort((a, b) => a.bounds.top - b.bounds.top);

  return {
    capacity,
    prefix: first
      ? ((sections[0]?.bounds.top ?? content.getBoundingClientRect().bottom) - top) / scale
      : 0,
    sections: sections.flatMap(({ section, bounds }) => {
      const entries = Array.from(
        section.querySelectorAll<HTMLElement>(":scope > [data-cv-entry]"),
        (row) => row.getBoundingClientRect(),
      );
      if (!entries.length) return [];
      return [
        {
          key: section.dataset.cvFitSection as SectionKey,
          headingHeight: (entries[0].top - bounds.top) / scale,
          entries: entries.map(
            (row, index) => ((entries[index + 1]?.top ?? bounds.bottom) - row.top) / scale,
          ),
        },
      ];
    }),
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
  const usesMoreSpace = (rail: MeasuredRail) =>
    rail.sections.length &&
    rail.prefix +
      rail.sections.reduce(
        (sum, section) =>
          sum +
          section.headingHeight +
          section.entries.reduce((total, height) => total + height, 0),
        0,
      ) >
      rail.capacity;
  if (!rails.some(usesMoreSpace)) return null;

  const heights = new Map<CvFlowRow, number>();
  const owners = new Map<CvFlowRow, { key: SectionKey; index: number }>();
  const rows: CvFlowRow[] = [];
  if (first.prefix > 0) {
    const prefix = { id: "sidebar-opening", node: null };
    rows.push(prefix);
    heights.set(prefix, first.prefix);
  }
  for (const minPage of [0, 1] as const) {
    for (const section of rails[minPage].sections) {
      section.entries.forEach((height, index) => {
        const row = { id: `${section.key}:${index}`, node: null, minPage };
        rows.push(row);
        owners.set(row, { key: section.key, index });
        heights.set(row, height + (index === 0 ? section.headingHeight : 0));
      });
    }
  }
  const pages = paginateCvFlow(
    rows,
    (page) => (page === 0 ? first : later).capacity,
    (row) => heights.get(row)!,
  );
  return pages.map((rows) => {
    const slice: CvSidebarPage = {};
    for (const row of rows) {
      const owner = owners.get(row);
      if (!owner) continue;
      const { key, index } = owner;
      slice[key] = [slice[key]?.[0] ?? index, index + 1];
    }
    return slice;
  });
}

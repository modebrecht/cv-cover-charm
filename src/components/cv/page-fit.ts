import { reportDossierStorageWriteFailure } from "@/lib/dossier-storage-write";
import { referenceHasContent } from "@/lib/dossier-semantic-fields";
import {
  cvSectionOrder,
  cvSectionLayout,
  customSectionForKey,
  entryFilled,
  isCustomSectionKey,
  type CvData,
  type CvLayoutSectionKey,
  type CvSectionPacking,
  type CvSectionPage,
  type CvSectionWidth,
} from "./types";

export type CvPageFitMode = "one" | "two" | "auto";

/** Legacy key retained only so upgraded clients can remove stale persisted modes. */
export const CV_PAGE_FIT_STORAGE_KEY = "lebenslauf:page-fit:v1";
const CV_PAGE_FIT_EVENT = "lebenslauf-page-fit-change";

let runtimePageCount = 0;
let revision = 0;
let pendingMode: CvPageFitMode | null = null;

function clearLegacyPageFitStorage() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CV_PAGE_FIT_STORAGE_KEY);
  } catch (error) {
    reportDossierStorageWriteFailure(error);
    // A blocked storage API must not prevent the in-memory action.
  }
}

function dispatchChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CV_PAGE_FIT_EVENT));
}

export function getCvPageFitMode(): CvPageFitMode | null {
  clearLegacyPageFitStorage();
  return pendingMode;
}

/**
 * Page-fit is an action, not a saved preference. The requested mode exists
 * only until the live CV canvas has written the resulting section layout and
 * typography back into the real CV state.
 */
export function setCvPageFitMode(mode: CvPageFitMode | null) {
  clearLegacyPageFitStorage();
  pendingMode = mode;
  revision += 1;
  dispatchChange();
}

/** Consume exactly the request that was applied; newer clicks stay pending. */
export function consumeCvPageFitMode(mode: CvPageFitMode) {
  if (pendingMode !== mode) return;
  pendingMode = null;
  dispatchChange();
}

export function getCvPageFitRevision(): number {
  return revision;
}

export function publishCvPageFitPageCount(count: number) {
  const next = Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0;
  if (next === runtimePageCount) return;
  runtimePageCount = next;
  dispatchChange();
}

export function getCvPageFitPageCount(): number {
  return runtimePageCount;
}

export function subscribeCvPageFit(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const local = () => onChange();
  window.addEventListener(CV_PAGE_FIT_EVENT, local);
  return () => window.removeEventListener(CV_PAGE_FIT_EVENT, local);
}

const textWeight = (...values: unknown[]) =>
  values.reduce<number>(
    (sum, value) => sum + (typeof value === "string" ? value.trim().length / 52 : 0),
    0,
  );

function entryWeight(entry: CvData["schule"][number]) {
  if (!entryFilled(entry)) return 0;
  return (
    2.1 + textWeight(entry.zeit, entry.titel, entry.ort) + entry.beschreibung.trim().length / 38
  );
}

/**
 * Content weight is intentionally a stable estimate, not a second DOM layout
 * engine. The browser paginator remains the final authority; this score only
 * chooses a sensible section split and a conservative typography density.
 */
export function cvPageFitSectionWeight(data: CvData, key: CvLayoutSectionKey): number {
  if (key === "person") {
    const person = data.person;
    const values = [
      person.vorname,
      person.nachname,
      person.untertitel,
      person.adresse,
      person.plzOrt,
      person.telefon,
      person.email,
      person.geburtsdatum,
      person.geburtsort,
      person.heimatort,
      person.nationalitaet,
    ];
    const filled = values.filter((value) => typeof value === "string" && value.trim()).length;
    return 3.8 + filled * 0.48 + textWeight(...values) + (person.foto ? 1.1 : 0);
  }

  if (isCustomSectionKey(key)) {
    const section = customSectionForKey(data, key);
    if (!section) return 0;
    const entries = section.entries.reduce((sum, entry) => sum + entryWeight(entry), 0);
    return entries > 0 ? 1.2 + entries + section.title.trim().length / 80 : 0;
  }

  if (data.hidden[key]) return 0;

  if (key === "schule" || key === "erfahrung") {
    const entries = data[key].reduce((sum, entry) => sum + entryWeight(entry), 0);
    return entries > 0 ? 1.3 + entries : 0;
  }

  if (key === "sprachen") {
    const rows = data.sprachen.filter((row) => row.name.trim() || row.niveau.trim());
    return rows.length
      ? 1.2 + rows.reduce((sum, row) => sum + 0.9 + textWeight(row.name, row.niveau), 0)
      : 0;
  }

  if (key === "hobbys" || key === "staerken") {
    const rows = data[key].filter((row) => row.trim());
    return rows.length
      ? 1.1 + rows.reduce((sum, row) => sum + 0.72 + row.trim().length / 55, 0)
      : 0;
  }

  const rows = data.referenzen.filter(referenceHasContent);
  return rows.length
    ? 1.2 +
        rows.reduce(
          (sum, row) =>
            sum + 1.65 + textWeight(row.name, row.funktion, row.kontakt, row.email, row.zusatz),
          0,
        )
    : 0;
}

export type CvPageFitPlan = {
  mode: CvPageFitMode;
  totalWeight: number;
  /** Estimated vertical demand after safe compact sections are packed. */
  effectiveWeight: number;
  pageBySection: Partial<Record<CvLayoutSectionKey, CvSectionPage>>;
  widthBySection: Partial<Record<CvLayoutSectionKey, CvSectionWidth>>;
  packingBySection: Partial<Record<CvLayoutSectionKey, CvSectionPacking>>;
  assignmentSignature: string;
  titleScaleFactor: number;
  headingScaleFactor: number;
  bodyScaleFactor: number;
};

/** Preserve an explicitly free-positioned section when a pupil invokes a page preset. */
export function cvPageFitKeepsManualPosition(data: CvData, key: CvLayoutSectionKey): boolean {
  return data.sectionLayouts?.[key]?.positioning === "free";
}

export type CvPageFitOptions = {
  /** Sidebar columns are already space-efficient and must not be split again. */
  allowHalfWidth?: boolean;
  /** Actual row heights from the canvas measurement sheet, not character counts. */
  measuredSectionHeightsPx?: Partial<Record<CvLayoutSectionKey, number>>;
};

/**
 * Read section heights from the existing *unpaginated* canvas measurement
 * sheet. Each row is measured once, including the person/header row. A saved
 * two-page split must not bias the next balancing action.
 */
export function measureCvPageFitSectionHeights(
  canvas: HTMLElement | null,
): Partial<Record<CvLayoutSectionKey, number>> | null {
  if (!canvas) return null;
  const rows = canvas.querySelectorAll<HTMLElement>("[data-cv-measure-page] [data-cv-content-row]");
  if (!rows.length) return null;
  const heights: Partial<Record<CvLayoutSectionKey, number>> = {};
  let key: CvLayoutSectionKey = "person";
  for (const row of rows) {
    const id = row.dataset.cvContentRow;
    if (id === "h-kontakt" || id === "kontakt-main") key = "person";
    else if (id?.startsWith("h-")) key = id.slice(2) as CvLayoutSectionKey;
    else if (id?.startsWith("layout-")) key = id.slice("layout-".length) as CvLayoutSectionKey;
    else if (id === "kopf" || id === "kopf-modern" || id === "person-layout") key = "person";
    const height = row.getBoundingClientRect().height;
    if (Number.isFinite(height) && height > 0) heights[key] = (heights[key] ?? 0) + height;
  }
  return heights;
}

/**
 * Use the existing layout engine as the authority for an intelligent 1–2 page
 * fit. Do not force two nearly empty sheets for a short CV. A conservative
 * headroom budget allows font differences and later Word rendering.
 *
 * Missing/incomplete measurements resolve to two pages rather than risking
 * clipped CV content. Manually positioned content on page two is not moved.
 */
export function chooseCvSmartPageFitMode(
  data: CvData,
  measured: Partial<Record<CvLayoutSectionKey, number>> | null,
  usableFirstPagePx: number | null,
  currentlyOnePage = false,
  options: {
    mainSectionKeys?: readonly CvLayoutSectionKey[];
    sidebarFitsFirstPage?: boolean;
    /** Complete paginator demand for an unchanged compact classic layout. */
    measuredFlowDemand?: number | null;
  } = {},
): "one" | "two" {
  let active = cvSectionOrder(data).filter(
    (key) => key === "person" || cvPageFitSectionWeight(data, key) > 0,
  );
  if (
    active.some((key) => {
      const layout = data.sectionLayouts?.[key];
      return layout?.positioning === "free" && layout.page === 2;
    })
  )
    return "two";
  // Main and Sidebar flow side by side. Require a complete measured Sidebar
  // before excluding its rubrics from the main-column capacity calculation.
  const mainSectionKeys = options.mainSectionKeys;
  if (mainSectionKeys) {
    if (options.sidebarFitsFirstPage !== true) return "two";
    active = active.filter((key) => mainSectionKeys.includes(key));
  }
  if (!active.length) return "one";
  if (options.measuredFlowDemand !== undefined) {
    const demand = options.measuredFlowDemand;
    return typeof demand === "number" && Number.isFinite(demand) && demand > 0 && demand <= 0.9
      ? "one"
      : "two";
  }
  if (!measured || !Number.isFinite(usableFirstPagePx) || (usableFirstPagePx ?? 0) <= 0)
    return "two";
  let sum = 0;
  let complete = true;
  for (const key of active) {
    const height = measured[key];
    if (typeof height !== "number" || !Number.isFinite(height) || height <= 0) {
      complete = false;
      continue;
    }
    sum += height;
  }
  if (complete) return sum <= usableFirstPagePx! * 0.9 ? "one" : "two";
  // Compact one-page masonry can merge multiple short rubrics into a
  // single measured row. If the *current* page already fits, keep it on a
  // repeated automatic action instead of creating a second blank page.
  if (currentlyOnePage) {
    const values = Object.values(measured);
    if (
      values.length &&
      values.every((h) => typeof h === "number" && Number.isFinite(h) && h > 0)
    ) {
      return values.reduce<number>((total, h) => total + (h as number), 0) <=
        usableFirstPagePx! * 0.9
        ? "one"
        : "two";
    }
  }
  return "two";
}

/** Actual safe A4 body height, including custom top/bottom document margins. */
export function measureCvPageFitCapacityPx(canvas: HTMLElement | null): number | null {
  const main = canvas?.querySelector<HTMLElement>('[data-cv-page="0"] [data-cv-main]');
  const height = main?.getBoundingClientRect().height;
  return typeof height === "number" && Number.isFinite(height) && height > 0 ? height : null;
}

/** Measure all flowing Sidebar rubrics at their actual first-page geometry.
 * Saved page assignments must not hide second-page content from smart fit. */
export function measureCvPageFitSidebarFits(canvas: HTMLElement | null): boolean | null {
  const rail = canvas?.querySelector<HTMLElement>("[data-cv-measure-sidebar] [data-cv-sidebar]");
  const content = rail?.querySelector<HTMLElement>("[data-cv-sidebar-content]");
  if (!rail || !content) return null;
  const railHeight = rail.getBoundingClientRect().height;
  const contentHeight = content.getBoundingClientRect().height;
  const scale = railHeight / rail.offsetHeight;
  const style = getComputedStyle(rail);
  const padding =
    (Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom)) * scale;
  const capacity = railHeight - padding;
  if (
    ![scale, capacity, contentHeight].every(Number.isFinite) ||
    scale <= 0 ||
    capacity <= 0 ||
    contentHeight < 0
  )
    return null;
  return contentHeight <= capacity * 0.9;
}

/** Exact one-page trial: use the paginator's own measured height, including
 * grouped/Masonry rows, plus the actual first-page Sidebar. No text estimates
 * or zoom-dependent pixel budgets participate in this decision. */
export function measureCvOnePageDemand(canvas: HTMLElement | null): number | null {
  const main = canvas?.querySelector<HTMLElement>("[data-cv-measure-page] [data-cv-main]");
  const used = Number(main?.dataset.cvFlowHeightPx);
  const capacity = Number(main?.dataset.cvFlowCapacityPx);
  if (!Number.isFinite(used) || !Number.isFinite(capacity) || used < 0 || capacity <= 0)
    return null;
  const rail = canvas?.querySelector<HTMLElement>('[data-cv-page="0"] [data-cv-sidebar]');
  const content = rail?.querySelector<HTMLElement>("[data-cv-sidebar-content]");
  if (!rail) return used / capacity;
  if (!content) return null;
  const scale = rail.getBoundingClientRect().height / rail.offsetHeight;
  const style = getComputedStyle(rail);
  const sidebarCapacity =
    rail.getBoundingClientRect().height / scale -
    Number.parseFloat(style.paddingTop) -
    Number.parseFloat(style.paddingBottom) -
    2;
  const sidebarUsed = content.getBoundingClientRect().height / scale;
  if (
    ![scale, sidebarCapacity, sidebarUsed].every(Number.isFinite) ||
    scale <= 0 ||
    sidebarCapacity <= 0
  )
    return null;
  return Math.max(used / capacity, sidebarUsed / sidebarCapacity);
}

export type CvTwoPageMeasurement = {
  main: Partial<Record<CvLayoutSectionKey, number>>;
  sidebar: Partial<Record<CvLayoutSectionKey, number>>;
  mainCapacity: [number, number];
  sidebarCapacity: [number, number];
  sidebarFixed: [number, number];
};

/** Read the normalized full-width trial, in the paginator's document pixels. */
export function measureCvTwoPageFit(canvas: HTMLElement | null): CvTwoPageMeasurement | null {
  const box = canvas?.querySelector<HTMLElement>("[data-cv-measure-page] [data-cv-main]");
  if (!canvas || !box) return null;
  const scale = box.getBoundingClientRect().width / box.offsetWidth;
  const capacity: [number, number] = [
    Number(box.dataset.cvFlowCapacityPx),
    Number(box.dataset.cvFlowNextCapacityPx),
  ];
  const measured = measureCvPageFitSectionHeights(canvas);
  if (
    !measured ||
    !Number.isFinite(scale) ||
    scale <= 0 ||
    capacity.some((n) => !Number.isFinite(n) || n <= 0)
  )
    return null;
  const result: CvTwoPageMeasurement = {
    main: Object.fromEntries(
      Object.entries(measured).map(([key, height]) => [key, height! / scale]),
    ),
    sidebar: {},
    mainCapacity: capacity,
    sidebarCapacity: [1, 1],
    sidebarFixed: [0, 0],
  };
  for (const index of [0, 1] as const) {
    const rail = canvas.querySelector<HTMLElement>(
      `[data-cv-measure-sidebar-page="${index}"] [data-cv-sidebar]`,
    );
    if (!rail) continue;
    const content = rail.querySelector<HTMLElement>("[data-cv-sidebar-content]");
    if (!content) return null;
    const zoom = rail.getBoundingClientRect().height / rail.offsetHeight;
    const style = getComputedStyle(rail);
    result.sidebarCapacity[index] =
      rail.getBoundingClientRect().height / zoom -
      parseFloat(style.paddingTop) -
      parseFloat(style.paddingBottom) -
      2;
    let flowing = 0;
    for (const node of content.querySelectorAll<HTMLElement>("[data-cv-fit-section]")) {
      const key = node.dataset.cvFitSection as CvLayoutSectionKey;
      const height = node.getBoundingClientRect().height / zoom;
      if (index === 0) result.sidebar[key] = height;
      flowing += height;
    }
    result.sidebarFixed[index] = Math.max(
      0,
      content.getBoundingClientRect().height / zoom - flowing,
    );
    if (
      !Number.isFinite(result.sidebarCapacity[index]) ||
      result.sidebarCapacity[index] <= 0 ||
      !Number.isFinite(result.sidebarFixed[index])
    )
      return null;
  }
  return result;
}

/** Both columns get their own split and actual first/continuation capacity.
 * A global text-weight split cannot balance simultaneous Sidebar/main flow. */
export function planCvMeasuredTwoPages(
  data: CvData,
  measurement: CvTwoPageMeasurement,
  sidebarKeys: readonly CvLayoutSectionKey[] = [],
): Partial<Record<CvLayoutSectionKey, 1 | 2>> | null {
  const order = cvSectionOrder(data);
  const active = order.filter(
    (key) =>
      key !== "person" &&
      cvSectionLayout(data, key).positioning === "flow" &&
      cvPageFitSectionWeight(data, key) > 0,
  );
  const sideSet = new Set(sidebarKeys);
  const main = active.filter((key) => !sideSet.has(key));
  const side = active.filter((key) => sideSet.has(key));
  if (
    [...measurement.mainCapacity, ...measurement.sidebarCapacity].some(
      (n) => !Number.isFinite(n) || n <= 0,
    ) ||
    [measurement.main.person ?? 0, ...measurement.sidebarFixed].some(
      (n) => !Number.isFinite(n) || n < 0,
    ) ||
    main.some((key) => !Number.isFinite(measurement.main[key]) || !(measurement.main[key]! > 0)) ||
    side.some(
      (key) => !Number.isFinite(measurement.sidebar[key]) || !(measurement.sidebar[key]! > 0),
    )
  )
    return null;
  const hasFixedSecondPage = order.some(
    (key) =>
      cvSectionLayout(data, key).positioning === "free" && cvSectionLayout(data, key).page === 2,
  );
  const demands = (
    keys: CvLayoutSectionKey[],
    heights: Partial<Record<CvLayoutSectionKey, number>>,
    split: number,
    fixed: [number, number],
    capacity: [number, number],
  ) => {
    const one = fixed[0] + keys.slice(0, split).reduce((sum, key) => sum + heights[key]!, 0);
    const two = fixed[1] + keys.slice(split).reduce((sum, key) => sum + heights[key]!, 0);
    const fills = [one / capacity[0], two / capacity[1]];
    return (
      1000 * fills.reduce((sum, fill) => sum + Math.max(0, fill - 1), 0) +
      Math.abs(0.45 * fills[0] - 0.55 * fills[1])
    );
  };
  let best: [number, number] = [main.length, side.length];
  let cost = Infinity;
  for (let a = 0; a <= main.length; a++)
    for (let b = 0; b <= side.length; b++) {
      if (active.length && !hasFixedSecondPage && a === main.length && b === side.length) continue;
      const next =
        demands(
          main,
          measurement.main,
          a,
          [measurement.main.person ?? 0, 0],
          measurement.mainCapacity,
        ) +
        (side.length
          ? demands(
              side,
              measurement.sidebar,
              b,
              measurement.sidebarFixed,
              measurement.sidebarCapacity,
            )
          : 0);
      if (next < cost) {
        cost = next;
        best = [a, b];
      }
    }
  return Object.fromEntries([
    ...order
      .filter((key) => cvSectionLayout(data, key).positioning === "flow")
      .map((key) => [key, 1]),
    ...main.map((key, index) => [key, index < best[0] ? 1 : 2]),
    ...side.map((key, index) => [key, index < best[1] ? 1 : 2]),
  ]);
}

/** Validate the rendered trial, rather than trusting an estimated section split. */
export function cvTwoPageTrialFits(canvas: HTMLElement | null): boolean {
  const pages = canvas?.querySelectorAll<HTMLElement>("[data-cv-page]");
  if (!pages?.length || pages.length > 2) return false;
  for (const page of pages) {
    for (const node of page.querySelectorAll<HTMLElement>("[data-cv-main], [data-cv-sidebar]")) {
      if (node.scrollHeight > node.clientHeight + 2) return false;
    }
  }
  return true;
}

function twoPageScale(weight: number) {
  if (weight <= 20) return 1.07;
  if (weight <= 30) return 1.04;
  if (weight <= 42) return 1.02;
  return 1;
}

/**
 * Only short, list-like rubrics are safe automatic half-width candidates.
 * Chronological sections need their date/title rail, while references already
 * have their own two-up layout when they have the full section width.
 */
function canCompactToHalf(data: CvData, key: CvLayoutSectionKey, weight: number): boolean {
  if (weight <= 0 || key === "person" || key === "schule" || key === "erfahrung") return false;
  if (key === "referenzen") return false;

  if (isCustomSectionKey(key)) {
    const section = customSectionForKey(data, key);
    if (!section) return false;
    const filled = section.entries.filter(entryFilled);
    if (section.preset === "familie") return filled.length > 0 && filled.length <= 5;
    return filled.length > 0 && filled.length <= 2 && weight <= 5.8;
  }

  return (key === "sprachen" || key === "hobbys" || key === "staerken") && weight <= 5.8;
}

function onePageCompactLayout(
  data: CvData,
  order: CvLayoutSectionKey[],
  weights: Map<CvLayoutSectionKey, number>,
  allowHalfWidth: boolean,
) {
  const widthBySection: Partial<Record<CvLayoutSectionKey, CvSectionWidth>> = {};
  const packingBySection: Partial<Record<CvLayoutSectionKey, CvSectionPacking>> = {};
  for (const key of order) {
    widthBySection[key] = "full";
    packingBySection[key] = "rows";
  }

  let effectiveWeight = order.reduce((sum, key) => sum + (weights.get(key) ?? 0), 0);
  if (!allowHalfWidth) return { widthBySection, packingBySection, effectiveWeight };

  // Masonry is only useful for a contiguous run of at least two safe short
  // sections. A single half-width block would merely create an empty column.
  const active = order.filter((key) => (weights.get(key) ?? 0) > 0);
  let run: CvLayoutSectionKey[] = [];

  const flush = () => {
    if (run.length < 2) {
      run = [];
      return;
    }

    const columnWeights: [number, number] = [0, 0];
    let runWeight = 0;
    for (const key of run) {
      const weight = weights.get(key) ?? 0;
      const target: 0 | 1 = columnWeights[0] <= columnWeights[1] ? 0 : 1;
      columnWeights[target] += weight;
      runWeight += weight;
      widthBySection[key] = "half";
      packingBySection[key] = "masonry";
    }
    // Two independent columns occupy approximately the height of the heavier
    // column rather than the sum of every short section.
    effectiveWeight -= runWeight - Math.max(...columnWeights);
    run = [];
  };

  for (const key of active) {
    const weight = weights.get(key) ?? 0;
    if (canCompactToHalf(data, key, weight)) run.push(key);
    else flush();
  }
  flush();

  return { widthBySection, packingBySection, effectiveWeight };
}

/**
 * Build a predictable pupil-facing plan:
 * - one page: everything returns to page 1 / normal flow, contiguous short
 *   rubrics may form a Masonry trial; live measurements decide typography;
 * - two pages: keep section order, restore full widths + normal row packing,
 *   put personal data on page 1, and choose the split whose estimated content
 *   weights are closest to balanced.
 */
export function buildCvPageFitPlan(
  data: CvData,
  mode: CvPageFitMode,
  options: CvPageFitOptions = {},
): CvPageFitPlan {
  const order = cvSectionOrder(data);
  const weights = new Map(order.map((key) => [key, cvPageFitSectionWeight(data, key)]));
  const totalWeight = order.reduce((sum, key) => sum + (weights.get(key) ?? 0), 0);
  const pageBySection: Partial<Record<CvLayoutSectionKey, CvSectionPage>> = {};
  let widthBySection: Partial<Record<CvLayoutSectionKey, CvSectionWidth>> = {};
  let packingBySection: Partial<Record<CvLayoutSectionKey, CvSectionPacking>> = {};
  let effectiveWeight = totalWeight;

  if (mode === "one") {
    for (const key of order) pageBySection[key] = 1;
    const compact = onePageCompactLayout(data, order, weights, options.allowHalfWidth !== false);
    widthBySection = compact.widthBySection;
    packingBySection = compact.packingBySection;
    effectiveWeight = compact.effectiveWeight;
  } else {
    for (const key of order) {
      widthBySection[key] = "full";
      packingBySection[key] = "rows";
    }
    const active = order.filter((key) => key !== "person" && (weights.get(key) ?? 0) > 0);
    if (!active.length) {
      for (const key of order) pageBySection[key] = 1;
    } else {
      // Prefer measured pixel heights from the real unpaginated browser sheet.
      // Text-length weights are a deterministic fallback for SSR/tests and for
      // measurements that cannot cover every populated section.
      const measured = options.measuredSectionHeightsPx;
      const hasMeasuredHeights =
        !!measured &&
        ["person", ...active].every((key) => {
          const height = measured[key as CvLayoutSectionKey];
          return typeof height === "number" && Number.isFinite(height) && height > 0;
        });
      const heightOf = (key: CvLayoutSectionKey) =>
        hasMeasuredHeights ? measured![key]! : (weights.get(key) ?? 0);
      const personWeight = heightOf("person");
      const activeWeights = active.map(heightOf);
      const activeTotal = activeWeights.reduce((sum, value) => sum + value, 0);
      let bestSplit = 0;
      let bestCost = Number.POSITIVE_INFINITY;
      let before = 0;

      // split is the number of active sections kept on page 1. At least one
      // active section remains on page 2 so the explicit two-page choice really
      // produces a second content page whenever there is content to move.
      for (let split = 0; split < active.length; split += 1) {
        const pageOneWeight = personWeight + before;
        const pageTwoWeight = activeTotal - before;
        const emptinessPenalty = split === 0 && active.length >= 3 ? 1.5 : 0;
        // Aim just beyond the midpoint on the first page. Its introductory
        // details should not leave an almost empty first sheet while all
        // following short rubrics pile up on the second sheet.
        const targetFirstPage = 0.55 * (personWeight + activeTotal);
        const cost = 2 * Math.abs(pageOneWeight - targetFirstPage) + emptinessPenalty;
        if (cost < bestCost) {
          bestCost = cost;
          bestSplit = split;
        }
        before += activeWeights[split];
      }

      const firstPageTwoKey = active[bestSplit];
      const splitIndex = order.indexOf(firstPageTwoKey);
      for (const [index, key] of order.entries()) {
        pageBySection[key] = key === "person" || index < splitIndex ? 1 : 2;
      }
    }
  }

  const baseScale = mode === "one" ? 1 : twoPageScale(totalWeight);
  const titleScaleFactor = mode === "one" ? 1 : Math.min(1.04, baseScale);
  const headingScaleFactor = baseScale;
  const bodyScaleFactor = baseScale;
  const assignmentSignature = `${mode}|${order
    .map(
      (key) =>
        `${key}:${pageBySection[key] ?? 1}:${widthBySection[key] ?? "full"}:${packingBySection[key] ?? "rows"}`,
    )
    .join("|")}`;

  return {
    mode,
    totalWeight,
    effectiveWeight,
    pageBySection,
    widthBySection,
    packingBySection,
    assignmentSignature,
    titleScaleFactor,
    headingScaleFactor,
    bodyScaleFactor,
  };
}

import { describe, expect, test } from "bun:test";
import { paginateCvFlow, type CvFlowRow } from "../../src/components/cv/flow-pagination";

// Synthetic heights test orchestration only. Browser tests supply actual production DOM heights.
const heights = new Map<string, number>();
function fixed(id: string, height: number, heading = false): CvFlowRow {
  heights.set(id, height);
  return { id, node: id, heading };
}
function text(id: string, value: string): CvFlowRow {
  return {
    id,
    node: value,
    textFlow: {
      text: value,
      offset: 0,
      continuation: false,
      render: (fragment, continuation) => `${continuation ? "tail:" : "lead:"}${fragment}`,
    },
  };
}
function columns(id: string, rows: CvFlowRow[][]): CvFlowRow {
  return { id, node: id, columns: { rows, render: (parts) => JSON.stringify(parts) } };
}
function measure(row: CvFlowRow): number {
  if (row.columns)
    return Math.max(
      0,
      ...row.columns.rows.map((col) => col.reduce((sum, r) => sum + measure(r), 0)),
    );
  if (row.textFlow) return Array.from(row.textFlow.text).length;
  return heights.get(row.id)!;
}
const flatten = (pages: CvFlowRow[][]) => pages.flat();

describe("CV measured flow pagination", () => {
  test("preserves fitted rows and moves a normal entry intact with its heading", () => {
    const intro = fixed("intro", 65),
      heading = fixed("heading", 10, true),
      entry = text("entry", "x".repeat(40));
    const pages = paginateCvFlow([intro, heading, entry], () => 100, measure);
    expect(pages).toEqual([[intro], [heading, entry]]);
    expect(pages[1][1]).toBe(entry);
  });

  test("retains every character and unique fragment offset across three or more pages", () => {
    const value = "  First paragraph.\n\n" + "Realistic bullet detail. ".repeat(12) + "END";
    const pages = paginateCvFlow([text("long", value)], () => 75, measure);
    const fragments = flatten(pages);
    expect(pages.length).toBeGreaterThanOrEqual(3);
    expect(fragments.map((r) => r.textFlow!.text).join("")).toBe(value);
    expect(new Set(fragments.map((r) => r.id)).size).toBe(fragments.length);
    let offset = 0;
    for (const row of fragments) {
      expect(row.textFlow!.offset).toBe(offset);
      expect(row.textFlow!.continuation).toBe(offset > 0);
      expect(measure(row)).toBeLessThanOrEqual(75);
      offset += row.textFlow!.text.length;
    }
    expect(pages.every((p) => p.length > 0)).toBe(true);
  });

  test("keeps a heading with a real fragment when the combined entry exceeds a page", () => {
    const heading = fixed("large-heading", 10, true),
      entry = text("almost-full", "x".repeat(95));
    const pages = paginateCvFlow([heading, entry], () => 100, measure);
    expect(pages.length).toBe(2);
    expect(pages[0][0]).toBe(heading);
    expect(pages[0][1].textFlow!.text).toHaveLength(90);
    expect(pages[1][0].textFlow!.text).toHaveLength(5);
    expect(pages.every((p) => p.reduce((sum, r) => sum + measure(r), 0) <= 100)).toBe(true);
  });

  test("uses continuation-page capacity without limiting the total number of pages", () => {
    const pages = paginateCvFlow(
      [text("capacity", "x".repeat(260))],
      (p) => (p === 0 ? 60 : 100),
      measure,
    );
    expect(pages.map((p) => p.reduce((sum, r) => sum + measure(r), 0))).toEqual([60, 100, 100]);
  });

  test("splits unbroken text at grapheme boundaries without separating joined Unicode", () => {
    const grapheme = "👩‍💻",
      value = grapheme.repeat(9);
    const pages = paginateCvFlow([text("unicode", value)], () => 8, measure);
    const fragments = flatten(pages).map((r) => r.textFlow!.text);
    expect(fragments.join("")).toBe(value);
    expect(fragments.every((v) => v === grapheme.repeat(2) || v === grapheme)).toBe(true);
  });

  test("flows independent columns in sequence and retains an empty exhausted column", () => {
    const left = [fixed("l1", 40), fixed("l2", 40), fixed("l3", 40)];
    const right = [fixed("r1", 30)];
    const pages = paginateCvFlow([columns("group", [left, right])], () => 90, measure);
    expect(pages.length).toBe(2);
    expect(pages[0][0].columns!.rows).toEqual([[left[0], left[1]], right]);
    expect(pages[1][0].columns!.rows).toEqual([[left[2]], []]);
    expect(pages.every((p) => measure(p[0]) <= 90)).toBe(true);
  });

  test("fragments an oversized entry within a column and preserves its heading", () => {
    const heading = fixed("column-heading", 10, true),
      value = "x".repeat(195);
    const pages = paginateCvFlow(
      [columns("text-group", [[heading, text("column-text", value)], [fixed("other", 40)]])],
      () => 100,
      measure,
    );
    const left = pages.flatMap((p) => p[0].columns!.rows[0]);
    expect(left[0]).toBe(heading);
    expect(
      left
        .filter((r) => r.textFlow)
        .map((r) => r.textFlow!.text)
        .join(""),
    ).toBe(value);
    expect(pages.length).toBe(3);
    expect(pages.every((p) => measure(p[0]) <= 100)).toBe(true);
    expect(pages[1][0].columns!.rows[1]).toEqual([]);
  });

  test("does not orphan column headings when the following entry only fits alone", () => {
    const heading = fixed("column-tight-heading", 10, true),
      value = "x".repeat(95);
    const pages = paginateCvFlow(
      [columns("tight-group", [[heading, text("tight-text", value)]])],
      () => 100,
      measure,
    );
    expect(pages.length).toBe(2);
    expect(pages[0][0].columns!.rows[0][0]).toBe(heading);
    expect(pages[0][0].columns!.rows[0]).toHaveLength(2);
    expect(pages[0][0].columns!.rows[0][1].textFlow!.text).toHaveLength(90);
    expect(pages.every((p) => measure(p[0]) <= 100)).toBe(true);
    expect(
      pages
        .flatMap((p) => p[0].columns!.rows[0])
        .filter((r) => r.textFlow)
        .map((r) => r.textFlow!.text)
        .join(""),
    ).toBe(value);
  });

  test("respects explicit page-two placement and intentional required pages", () => {
    const first = fixed("first", 20),
      second = { ...fixed("second", 20), minPage: 1 as const };
    expect(paginateCvFlow([first, second], () => 100, measure)).toEqual([[first], [second]]);
    expect(paginateCvFlow([], () => 100, measure, 2)).toEqual([[], []]);
  });

  test("starts from fresh state for repeated short and long changes", () => {
    const short = text("live", "short"),
      long = text("live", "x".repeat(250));
    expect(paginateCvFlow([short], () => 100, measure)).toEqual([[short]]);
    expect(paginateCvFlow([long], () => 100, measure)).toHaveLength(3);
    expect(paginateCvFlow([short], () => 100, measure)).toEqual([[short]]);
    expect(
      flatten(paginateCvFlow([long], () => 100, measure))
        .map((r) => r.textFlow!.text)
        .join(""),
    ).toBe(long.textFlow!.text);
  });
});

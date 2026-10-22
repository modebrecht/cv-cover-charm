import { expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { scaleCvReadingFlow } from "../../src/lib/docx-next/cv-flow-scale";
import { tableColumnWidths } from "../../src/lib/docx-next/layouts";
import { walkBlocks, type Paragraph, type TableBlock } from "../../src/lib/docx-next/model";
import { briefFixture } from "../fixtures/docx-next/brief";
const part = () => buildDossierDocModel(briefFixture()).cv;
const para: Paragraph = {
  kind: "paragraph",
  id: "cv.test",
  role: "body",
  runs: [
    {
      id: "cv.test.value",
      fieldId: "cv.test",
      text: "Unveränderter Text",
      style: {
        font: "Arial",
        sizePt: 12,
        color: "000000",
        bold: false,
        italic: false,
        underline: false,
        trackingPt: 1,
      },
    },
  ],
  align: "left",
  beforeMm: 2,
  afterMm: 3,
  lineHeight: 1.2,
  minimumLineHeightPt: 14.4,
  keepNext: false,
  keepLines: true,
  indentMm: 2,
  tabStopsMm: [10],
};

test("physical text units scale once while IDs, text, page geometry and source stay unchanged", () => {
  const cv = part();
  cv.blocks = [structuredClone(para)];
  const before = structuredClone(cv);
  const scaled = scaleCvReadingFlow(cv, 0.9);
  const p = scaled[0] as Paragraph;
  expect(cv).toEqual(before);
  expect(p.id).toBe(para.id);
  expect(p.runs[0].fieldId).toBe("cv.test");
  expect(p.runs[0].text).toBe(para.runs[0].text);
  expect(p.runs[0].style.sizePt).toBeCloseTo(10.8, 10);
  expect(p.runs[0].style.trackingPt).toBe(0.9);
  expect(p.beforeMm).toBe(1.8);
  expect(p.afterMm).toBe(2.7);
  expect(p.minimumLineHeightPt).toBeCloseTo(12.96, 10);
  expect(p.lineHeight).toBe(1.2);
  expect(p.tabStopsMm).toEqual([9]);
  expect(p.indentMm).toBe(1.8);
  expect(scaleCvReadingFlow(cv, 0.9)).toEqual(scaled);
});

test("fixed rails and gaps scale while flexible columns retain the physical available width", () => {
  const cv = part();
  const width = cv.page.widthMm - cv.page.margins.left - cv.page.margins.right;
  const t: TableBlock = {
    kind: "table",
    id: "cv.table",
    widths: [1, 1, 1],
    columnWidthsMm: [25, 12, null],
    decoration: { borderColor: "000000", borderWidthMm: 0, paddingXMm: 0, paddingYMm: 0 },
    rows: [{ keepTogether: false, cells: [[structuredClone(para)], [], [structuredClone(para)]] }],
  };
  cv.blocks = [t];
  const scaled = scaleCvReadingFlow(cv, 0.9)[0] as TableBlock;
  expect(scaled.columnWidthsMm).toEqual([22.5, 10.8, null]);
  expect(scaled.widthMm).toBeUndefined();
  expect(tableColumnWidths(scaled, width).reduce((a, b) => a + b, 0)).toBeCloseTo(width, 10);
  expect(tableColumnWidths(scaled, width)[2]).toBeGreaterThan(tableColumnWidths(t, width)[2]);
  expect(t.columnWidthsMm).toEqual([25, 12, null]);
});

test("heading capsules and minimum leading use the scaled text size without shrinking available paper", () => {
  const cv = part(),
    width = cv.page.widthMm - cv.page.margins.left - cv.page.margins.right;
  const p = structuredClone(para);
  p.flowSurface = {
    widthMm: 30,
    rowWidthMm: width - 2,
    heightMm: 6,
    paddingXMm: 2,
    paddingYMm: 1,
    ink: "123456",
    outlineMm: 0.2,
    rule: { color: "123456", gapMm: 2, heightMm: 0.2, opacity: 1 },
  };
  cv.blocks = [p];
  const next = scaleCvReadingFlow(cv, 0.9)[0] as Paragraph;
  expect(next.flowSurface!.widthMm).toBe(27);
  expect(next.flowSurface!.rowWidthMm).toBeCloseTo(width - 1.8, 10);
  expect(next.flowSurface!.heightMm).toBe(5.4);
  expect(next.flowSurface!.paddingXMm).toBe(1.8);
  expect(next.flowSurface!.rule!.gapMm).toBe(1.8);
  expect(next.keepLines).toBe(true);
  expect(next.lineHeight).toBe(1.2);
});

test("unscaled and unsupported owners fail safely without changing page-owned images or classic opt-out", () => {
  const cv = part();
  expect(scaleCvReadingFlow(cv, 1)).toBe(cv.blocks);
  for (const s of [NaN, Infinity, 0, 0.49, 2.01])
    expect(() => scaleCvReadingFlow(cv, s)).toThrow("scale");
  const sidebar = structuredClone(cv);
  sidebar.layout.mode = "sidebar";
  expect(() => scaleCvReadingFlow(sidebar, 0.9)).toThrow("classic");
  cv.blocks = [{ kind: "column-flow", id: "bad.columns", count: 2, gapMm: 6, blocks: [] }];
  expect(() => scaleCvReadingFlow(cv, 0.9)).toThrow("Unsupported");
  cv.blocks = [
    {
      kind: "image",
      id: "cv.photo",
      source: "photo",
      alt: "original",
      widthMm: 30,
      maxHeightMm: 40,
      placement: "free",
      xMm: 150,
      yMm: 20,
      gapMm: 0,
      coordinateOrigin: "page",
    },
  ];
  expect(scaleCvReadingFlow(cv, 0.9)).toEqual(cv.blocks);
  const model = buildDossierDocModel(briefFixture()),
    before = structuredClone(model);
  scaleCvReadingFlow(model.cv, 0.9);
  expect(model).toEqual(before);
  expect(
    walkBlocks(scaleCvReadingFlow(model.cv, 0.9)).filter((b) => b.kind === "paragraph").length,
  ).toBeGreaterThan(0);
});

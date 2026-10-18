import { expect, test } from "bun:test";
import { buildCvPageFitPlan } from "../../src/components/cv/page-fit";
import { cvFlowColumns } from "../../src/lib/cv-flow-columns";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { composeCvReadingColumns } from "../../src/lib/docx-next/cv-reading-columns";
import { ownFlowSurfaceSpacing } from "../../src/lib/docx-next/flow-surface-spacing";
import { walkBlocks, type TableBlock } from "../../src/lib/docx-next/model";
import { tableColumnWidths } from "../../src/lib/docx-next/layouts";
import { validateDossierDocModel } from "../../src/lib/docx-next/validation";
import { coverPdfDocumentFromSaved } from "../../src/lib/dossier-pdf-document";
import { designReadingRowsUiEnabled } from "../../src/lib/docx-next/design-visibility";
import { briefFixture } from "../fixtures/docx-next/brief";

function fitted(mode: "one" | "two" = "one") {
  const source = briefFixture("normal");
  const plan = buildCvPageFitPlan(source.cv.data, mode);
  source.cv.data.sectionLayouts = Object.fromEntries(
    Object.entries(plan.pageBySection).map(([key, page]) => [
      key,
      {
        page,
        width: plan.widthBySection[key],
        packing: plan.packingBySection[key],
        positioning: "flow",
      },
    ]),
  );
  Object.assign(source.cv.design, {
    titleScale: plan.titleScaleFactor,
    headingScale: plan.headingScaleFactor,
    bodyScale: plan.bodyScaleFactor,
  });
  return source;
}
const fields = (model: ReturnType<typeof buildDossierDocModel>) =>
  walkBlocks(model.cv.blocks)
    .filter((b) => b.kind === "paragraph")
    .flatMap((b) =>
      b.runs
        .filter((r) => r.fieldId !== "cv.section.person.heading")
        .map((r) => [r.fieldId, r.text]),
    )
    .sort(([a], [b]) => (a ?? "").localeCompare(b ?? ""));

test("Web and native flow share stable column assignment including ties and empty rows", () => {
  const rows = [
    { id: "a", rows: 4 },
    { id: "b", rows: 4 },
    { id: "c", rows: 4 },
  ];
  expect(cvFlowColumns(rows, (r) => r.rows).map((c) => c.map((r) => r.id))).toEqual([
    ["a", "c"],
    ["b"],
  ]);
  expect(cvFlowColumns([0, 0, 0], (r) => r).map((c) => c.length)).toEqual([2, 1]);
  expect(() => cvFlowColumns([NaN], (r) => r)).toThrow("row count");
});

test("saved one-page settings retain every field across five families and native cells keep the 6 mm gap", () => {
  for (const template of ["brief", "modern", "freundlich", "verlauf", "neon"] as const) {
    const source = fitted();
    source.cover = coverPdfDocumentFromSaved({
      template,
      data: source.cover.data,
      colors: {},
      fontScale: 1,
    })!;
    source.cv.design.template = source.letter.design.template = template;
    const before = JSON.stringify(source);
    const baseline = buildDossierDocModel(source);
    const model = buildDossierDocModel(source, { cvContentComposition: "reading-rows" });
    expect(model.issues).toEqual([]);
    expect(JSON.stringify(source)).toBe(before);
    expect(fields(model)).toEqual(fields(baseline));
    expect(model.cover).toEqual(baseline.cover);
    expect(model.letter).toEqual(baseline.letter);
    const tables = walkBlocks(model.cv.blocks).filter(
      (b): b is TableBlock => b.kind === "table" && b.id.startsWith("cv.reading-columns:"),
    );
    expect(tables.length).toBeGreaterThan(0);
    for (const table of tables) {
      const width =
        model.cv.page.widthMm - model.cv.page.margins.left - model.cv.page.margins.right;
      expect(tableColumnWidths(table, width)[1]).toBeCloseTo(6, 8);
      expect(table.rows[0].keepTogether).toBe(false);
      expect(table.rows[0].cells[1]).toEqual([]);
    }
    const title = walkBlocks(model.cv.blocks).find(
      (b) => b.kind === "paragraph" && b.id.endsWith(".title"),
    );
    const unscaledSource = structuredClone(source);
    unscaledSource.cv.design.bodyScale = 1;
    const unscaledTitle = walkBlocks(buildDossierDocModel(unscaledSource).cv.blocks).find(
      (b) => b.id === title?.id,
    );
    if (title?.kind !== "paragraph" || unscaledTitle?.kind !== "paragraph")
      throw Error("Missing title");
    expect(title.runs[0].style.sizePt).toBeCloseTo(
      unscaledTitle.runs[0].style.sizePt * source.cv.design.bodyScale!,
      8,
    );
    validateDossierDocModel(model);
  }
});

test("two-page choice preserves explicit section pages instead of compacting them", () => {
  const source = fitted("two");
  const model = buildDossierDocModel(source, { cvContentComposition: "reading-rows" });
  expect(walkBlocks(model.cv.blocks).some((b) => b.id.startsWith("cv.reading-columns:"))).toBe(
    false,
  );
  expect(model.cv.blocks.some((b) => b.kind === "section" && b.startPage === 2)).toBe(true);
  expect(fields(model)).toEqual(fields(buildDossierDocModel(source)));
});

test("first capsules in compact cells use native top insets, keep unique fields and are idempotent", () => {
  const source = fitted();
  const model = buildDossierDocModel(source, { cvContentComposition: "reading-rows" });
  const ids = walkBlocks(model.cv.blocks).map((b) => b.id);
  for (const heading of walkBlocks(model.cv.blocks))
    if (
      heading.kind === "paragraph" &&
      heading.role === "heading" &&
      heading.id.startsWith("cv.section.")
    ) {
      heading.flowSurface = {
        widthMm: 20,
        rowWidthMm: 70,
        heightMm: 7,
        paddingXMm: 2,
        paddingYMm: 1,
        ink: "244A61",
        outlineMm: 0.2,
      };
    }
  ownFlowSurfaceSpacing(model.cv, { readingColumns: true });
  const first = walkBlocks(model.cv.blocks).filter(
    (b) => b.kind === "paragraph" && b.flowSurface?.spacingOwner === "origin",
  );
  expect(first.length).toBeGreaterThan(0);
  expect(walkBlocks(model.cv.blocks).map((b) => b.id)).toEqual(ids);
  expect(new Set(ids).size).toBe(ids.length);
  const before = JSON.stringify(model);
  ownFlowSurfaceSpacing(model.cv, { readingColumns: true });
  expect(JSON.stringify(model)).toBe(before);
});

test("compact capsule overflow stays an explicit rejection", () => {
  const source = fitted();
  const model = buildDossierDocModel(source);
  const heading = walkBlocks(model.cv.blocks).find((b) => b.id === "cv.section.sprachen.heading")!;
  if (heading.kind !== "paragraph") throw Error("Missing heading");
  heading.flowSurface = {
    widthMm: 200,
    rowWidthMm: 210,
    heightMm: 7,
    paddingXMm: 2,
    paddingYMm: 1,
    ink: "244A61",
    outlineMm: 0.2,
  };
  expect(() => composeCvReadingColumns(model.cv, source.cv.data)).toThrow("Spaltenbreite");
});

test("the real UI row trial requires both design and interior opt-ins", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  try {
    for (const [search, expected] of [
      ["?docx-next-reading-rows-qa=1", false],
      ["?docx-next-design-qa=1&docx-next-reading-rows-qa=1", false],
      ["?docx-next-design-qa=1&docx-next-interior-qa=1&docx-next-reading-rows-qa=1", true],
    ] as const) {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: { location: { search } },
      });
      expect(designReadingRowsUiEnabled()).toBe(expected);
    }
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "window", descriptor);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

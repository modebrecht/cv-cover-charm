import { describe, expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { CV_FLOW_LAYOUTS, cvWordLayout, tableColumnWidths } from "../../src/lib/docx-next/layouts";
import {
  walkBlocks,
  type Paragraph,
  type SectionBlock,
  type TableBlock,
} from "../../src/lib/docx-next/model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import {
  BRIEF_VARIANT_FIXTURES,
  briefVariantFixture,
  briefFixture,
  briefPaginationFixture,
} from "../fixtures/docx-next/brief";

async function xml(model: ReturnType<typeof buildDossierDocModel>) {
  const bytes = new Uint8Array(await (await renderDossierDocx(model)).arrayBuffer());
  return new TextDecoder().decode(
    readZipEntries(bytes).find((part) => part.name === "word/document.xml")!.bytes,
  );
}
const section = (model: ReturnType<typeof buildDossierDocModel>, key = "schule") =>
  model.cv.blocks.find((block) => block.id === `cv.section.${key}`) as SectionBlock;

describe("shared native CV compositions", () => {
  test("all variants are deterministic and preserve unique identities without mutating app data", () => {
    for (const fixture of BRIEF_VARIANT_FIXTURES) {
      const input = briefVariantFixture(fixture),
        before = structuredClone(input);
      const model = buildDossierDocModel(input);
      expect(model).toEqual(buildDossierDocModel(before));
      expect(input).toEqual(before);
      expect(model.issues).toEqual([]);
      const ids = walkBlocks(model.cv.blocks).map((block) => block.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(model.cv.layout.variant).toBe(fixture.split("-")[0]);
    }
  });
  test("classic remains flow; compact and retired sidebar aliases cannot silently become classic", async () => {
    expect(cvWordLayout("modern")).toBe("sidebar");
    expect(cvWordLayout("executive")).toBe("sidebar");
    expect(() => cvWordLayout("missing" as "classic")).toThrow("unknown CV layout");
    const input = briefFixture("minimal");
    for (const alias of ["modern", "executive", "sidebar"] as const) {
      input.settings.cvLayout = alias;
      expect(
        buildDossierDocModel(input).cv.blocks.some((block) => block.kind === "parallel-flow"),
      ).toBe(true);
    }
    input.settings.cvLayout = "classic";
    expect(
      walkBlocks(buildDossierDocModel(input).cv.blocks).some((block) =>
        block.id.endsWith(".dateRail"),
      ),
    ).toBe(false);
  });
  test("dated entries use fixed date tracks, semantic fields and native row pagination", async () => {
    for (const variant of ["timeline", "editorial"] as const) {
      const input = briefVariantFixture(`${variant}-short`);
      input.settings.fieldStyles = { "cv.entry.schule:variant-school.date": { underline: true } };
      const model = buildDossierDocModel(input);
      const rail = walkBlocks(model.cv.blocks).find(
        (block) => block.id === "cv.entry.schule:variant-school.dateRail",
      ) as TableBlock;
      expect(rail.rows[0].keepTogether).toBe(true);
      expect(rail.rows[0].cells[0][0]).toMatchObject({
        keepNext: false,
        runs: [{ fieldId: "cv.entry.schule:variant-school.date", style: { underline: true } }],
      });
      expect(rail.rows[0].cells[1][0]).toMatchObject({
        keepNext: true,
        id: "cv.entry.schule:variant-school.title",
      });
      expect(rail.rows[0].cells[1].at(-1)).toMatchObject({ keepNext: false, keepLines: false });
      expect(tableColumnWidths(rail, 70)[0]).toBe(variant === "timeline" ? 26.5 : 30);
      expect(tableColumnWidths(rail, 160)[0]).toBe(tableColumnWidths(rail, 70)[0]);
      const document = await xml(model);
      expect(document).toContain(
        `w:w="${Math.round(((variant === "timeline" ? 26.5 : 30) * 1440) / 25.4)}"`,
      );
      expect(document).toContain("<w:cantSplit/>");
      if (variant === "timeline") expect(document).toContain('<w:left w:val="single" w:sz="6"');
    }
  });
  test("missing date and date-only entries flow without empty table columns", () => {
    const input = briefVariantFixture("timeline-short");
    input.cv.data.schule[0].zeit = "";
    expect(
      walkBlocks(buildDossierDocModel(input).cv.blocks).some(
        (block) => block.id === "cv.entry.schule:variant-school.dateRail",
      ),
    ).toBe(false);
    Object.assign(input.cv.data.schule[0], { zeit: "2026", titel: "", ort: "", beschreibung: "" });
    expect(section(buildDossierDocModel(input)).blocks[0]).toMatchObject({
      kind: "entry",
      blocks: [{ kind: "paragraph", id: "cv.entry.schule:variant-school.date" }],
    });
  });
  test("user spacing, heading offsets, half-width placement and order survive composition", async () => {
    const input = briefVariantFixture("timeline-short");
    input.settings.cvSectionGapMm = 9;
    input.cv.design.sectionTitleOffsetMm = -6;
    input.cv.design.sectionContentIndentMm = 12;
    input.cv.design.headingRule = "short";
    input.cv.data.sectionOrder = ["custom:variant-beta", "custom:variant-alpha", "schule"];
    const model = buildDossierDocModel(input);
    expect(section(model).heading).toMatchObject({ beforeMm: 9, indentMm: 5 });
    expect(section(model).contentIndentMm).toBe(23);
    expect(section(model, "custom:variant-beta")).toMatchObject({
      width: "half",
      heading: { indentMm: 11 },
      contentIndentMm: 23,
    });
    expect(
      model.cv.blocks
        .filter((block) => block.kind === "section")
        .map((block) => block.id)
        .slice(0, 3),
    ).toEqual([
      "cv.section.custom:variant-beta",
      "cv.section.custom:variant-alpha",
      "cv.section.schule",
    ]);
    await xml(model);
    input.settings.cvSectionGapMm = undefined;
    input.settings.cvLayout = "minimal";
    expect(section(buildDossierDocModel(input)).heading?.beforeMm).toBe(
      CV_FLOW_LAYOUTS.minimal.sectionGapMm,
    );
  });
  test("fixed tracks reject mismatched arrays, narrow parent widths and invalid border edges", async () => {
    const model = buildDossierDocModel(briefVariantFixture("editorial-short"));
    const rail = walkBlocks(model.cv.blocks).find((block) =>
      block.id.endsWith(".dateRail"),
    ) as TableBlock;
    expect(() => tableColumnWidths(rail, 35)).toThrow("insufficient text width");
    expect(() => tableColumnWidths(rail, 25)).toThrow("exceed available width");
    rail.columnWidthsMm = [30];
    await expect(xml(model)).rejects.toThrow("invalid table geometry");
    rail.columnWidthsMm = [30, null];
    rail.decoration!.borderSides = ["left", "left"];
    await expect(xml(model)).rejects.toThrow("invalid flow box");
  });
});

describe("native CV continuation margin policy", () => {
  test("0/10/40 mm margins use one section and a first-page flow spacer where needed", async () => {
    for (const kind of ["zero", "ten", "forty", "chrome"] as const) {
      const input = briefPaginationFixture(kind),
        model = buildDossierDocModel(input);
      expect(model.issues).toEqual([]);
      const requested = input.settings.cvContinuationTopMarginMm!;
      if (kind !== "chrome") expect(model.cv.page.headerDistanceMm).toBe(0);
      expect(model.cv.layout.pagination).toMatchObject({ continuationTopMarginMm: requested });
      const spacer = model.cv.blocks.find((block) => block.id === "cv.firstPageLead");
      expect(spacer?.kind === "spacer" ? spacer.heightMm : 0).toBe(
        model.cv.layout.pagination!.firstPageLeadMm,
      );
      const document = await xml(model);
      expect(document.match(/<w:sectPr>/g)).toHaveLength(3);
      expect(document).toContain(
        `<w:pgMar w:top="${Math.round((model.cv.page.margins.top * 1440) / 25.4)}"`,
      );
    }
  });
  test("larger continuation margin is captured and blocks an unaccepted adaptation", async () => {
    const input = briefFixture("normal");
    input.settings.cvContinuationTopMarginMm = 40;
    const model = buildDossierDocModel(input);
    expect(model.cv.layout.pagination).toMatchObject({
      continuationTopMarginMm: 40,
      firstPageLeadMm: 0,
    });
    expect(model.issues[0].code).toBe("continuation-margin-exceeds-first-page");
    await expect(xml(model)).rejects.toThrow("unaccepted model issues");
    input.settings.cvContinuationTopMarginMm = NaN;
    expect(() => buildDossierDocModel(input)).toThrow("invalid CV continuation");
  });
});

import { expect, test } from "bun:test";
import { cumulativeColumnTwips } from "../../src/lib/docx-next/table-grid";
import { twips } from "../../src/lib/docx-next/xml";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { sidebarFixture } from "../fixtures/docx-next/sidebar";
import { walkBlocks, type TableBlock } from "../../src/lib/docx-next/model";
import { tableColumnWidths } from "../../src/lib/docx-next/layouts";

test("shared integer column edges conserve total width in both physical orientations", () => {
  expect(cumulativeColumnTwips([49.2, 6, 114.8], 170)).toEqual([2789, 340, 6509]);
  expect(cumulativeColumnTwips([114.8, 6, 49.2], 170)).toEqual([6508, 341, 2789]);
  for (const total of [100, 133.3, 170, 179.125])
    for (const fraction of [0.21, 0.3, 0.49, 0.7]) {
      const widths = [(total - 6) * fraction, 6, (total - 6) * (1 - fraction)];
      const grid = cumulativeColumnTwips(widths, total);
      expect(grid.reduce((sum, width) => sum + width, 0)).toBe(twips(total));
      for (let index = 0; index < widths.length; index++) {
        const edgeMm = widths.slice(0, index + 1).reduce((sum, width) => sum + width, 0);
        expect(grid.slice(0, index + 1).reduce((sum, width) => sum + width, 0)).toBe(twips(edgeMm));
      }
    }
});

test("inconsistent, nonfinite and collapsed table grids fail instead of redistributing width", () => {
  for (const widths of [[], [1, 1], [NaN, 169], [Infinity, 1], [-1, 171], [0, 170]])
    expect(() => cumulativeColumnTwips(widths, 170)).toThrow("invalid cumulative table grid");
  for (const total of [0, -1, NaN, Infinity])
    expect(() => cumulativeColumnTwips([49.2, 6, 114.8], total)).toThrow();
  expect(() => cumulativeColumnTwips([0.001, 169.999], 170)).toThrow("collapsed");
});

test("guarded application serialization uses equal declared, grid and cell widths", async () => {
  for (const kind of ["left", "right"] as const) {
    const model = buildDossierDocModel(sidebarFixture(kind), {
      cvSidebarComposition: "body-stories",
    });
    const before = structuredClone(model);
    const table = model.cv.blocks.find((block) => block.kind === "table") as TableBlock;
    expect(table.columnRounding).toBe("cumulative");
    const blob = await renderDossierDocx(model, { allowUnacceptedModelIssues: true });
    const doc = readZipEntries(new Uint8Array(await blob.arrayBuffer())).find(
      (part) => part.name === "word/document.xml",
    )!;
    const xml = new TextDecoder().decode(doc.bytes);
    const owner = xml.slice(xml.indexOf('<w:tbl><w:tblPr><w:tblW w:w="9638"'));
    const grid = [...owner.split("</w:tblGrid>")[0].matchAll(/<w:gridCol w:w="(\d+)"\/>/g)].map(
      (match) => Number(match[1]),
    );
    expect(grid.reduce((sum, width) => sum + width, 0)).toBe(9638);
    expect(grid).toEqual(kind === "left" ? [2789, 340, 6509] : [6508, 341, 2789]);
    for (const width of grid) expect(owner).toContain(`<w:tcW w:w="${width}" w:type="dxa"/>`);
    expect(model).toEqual(before);
    table.columnRounding = "per-column" as never;
    await expect(renderDossierDocx(model, { allowUnacceptedModelIssues: true })).rejects.toThrow(
      "invalid table column rounding",
    );
  }
});

test("the guarded body scope also conserves nested date columns without changing model content", async () => {
  const model = buildDossierDocModel(sidebarFixture("placements"), {
    cvSidebarComposition: "body-stories",
  });
  const before = structuredClone(model);
  const blob = await renderDossierDocx(model, { allowUnacceptedModelIssues: true });
  const doc = readZipEntries(new Uint8Array(await blob.arrayBuffer())).find(
    (part) => part.name === "word/document.xml",
  )!;
  const xml = new TextDecoder().decode(doc.bytes);
  const field = xml.indexOf('w:tag w:val="cv.person.geburtsdatum.label"');
  expect(field).toBeGreaterThan(0);
  const nested = xml.slice(xml.lastIndexOf("<w:tbl>", field), field);
  const total = Number(nested.match(/<w:tblW w:w="(\d+)"/)![1]);
  const grid = [...nested.matchAll(/<w:gridCol w:w="(\d+)"\/>/g)].map((match) => Number(match[1]));
  expect(total).toBe(6508);
  expect(grid).toEqual([1953, 4555]);
  expect(grid.reduce((sum, width) => sum + width, 0)).toBe(total);
  expect(model).toEqual(before);
});

test("reference pairs align to the section edge and retain the preview gap in either sidebar orientation", async () => {
  for (const kind of ["left", "right"] as const)
    for (const count of [1, 2, 3]) {
      const input = sidebarFixture(kind);
      const reference = input.cv.data.referenzen[0];
      input.cv.data.referenzen = Array.from({ length: count }, (_, index) => ({
        ...reference,
        id: `alignment-${index}`,
      }));
      const model = buildDossierDocModel(input, { cvSidebarComposition: "body-stories" });
      const pairs = walkBlocks(model.cv.blocks).filter(
        (block): block is TableBlock =>
          block.kind === "table" && block.id.startsWith("cv.section.referenzen.pair:"),
      );
      expect(pairs.length).toBe(Math.ceil(count / 2));
      for (const pair of pairs) {
        expect(tableColumnWidths(pair, 114.8)).toEqual([54.4, 6, 54.4]);
        expect(pair.decoration?.paddingXMm).toBe(0);
        expect(pair.rows[0].cells[1]).toEqual([]);
      }
      const blob = await renderDossierDocx(model, { allowUnacceptedModelIssues: true });
      const xml = new TextDecoder().decode(
        readZipEntries(new Uint8Array(await blob.arrayBuffer())).find(
          (part) => part.name === "word/document.xml",
        )!.bytes,
      );
      for (let index = 0; index < count; index++)
        for (const field of ["name", "role", "contact"])
          expect(
            xml.match(
              new RegExp(`w:tag w:val="cv.entry.referenzen:alignment-${index}\\.${field}"`, "g"),
            )?.length,
          ).toBe(1);
      const caption = xml.indexOf('w:tblCaption w:val="cv.section.referenzen.pair:');
      const tableStart = xml.lastIndexOf("<w:tbl>", caption);
      const properties = xml.slice(tableStart, caption);
      expect(properties).toContain('<w:left w:w="0" w:type="dxa"/>');
      expect(properties).toContain('<w:right w:w="0" w:type="dxa"/>');
      const grid = [
        ...xml
          .slice(caption)
          .split("</w:tblGrid>")[0]
          .matchAll(/<w:gridCol w:w="(\d+)"\/>/g),
      ].map((match) => Number(match[1]));
      expect(grid.length).toBe(3);
      expect(Math.abs(grid[1] - twips(6))).toBeLessThanOrEqual(1);
      expect(Math.abs(grid[0] - grid[2])).toBeLessThanOrEqual(1);
    }
});

test("half-width sections retain their outer text edge with an empty 6 mm middle track", async () => {
  for (const kind of ["left", "right", "classic"] as const)
    for (const pair of [false, true]) {
      const input = sidebarFixture(kind === "classic" ? "left" : kind);
      if (kind === "classic") input.settings.cvLayout = "classic";
      input.cv.data.sectionLayouts = {
        "custom:familie": { width: "half", page: 1 },
        ...(pair ? { schule: { width: "half" as const, page: 1 as const } } : {}),
      };
      const model = buildDossierDocModel(
        input,
        kind === "classic" ? {} : { cvSidebarComposition: "body-stories" },
      );
      const before = structuredClone(model);
      const blob = await renderDossierDocx(model, { allowUnacceptedModelIssues: true });
      const xml = new TextDecoder().decode(
        readZipEntries(new Uint8Array(await blob.arrayBuffer())).find(
          (part) => part.name === "word/document.xml",
        )!.bytes,
      );
      const caption = xml.indexOf('w:tblCaption w:val="cv.section.custom:familie.half-row"');
      expect(caption).toBeGreaterThan(0);
      const start = xml.lastIndexOf("<w:tbl>", caption);
      const properties = xml.slice(start, caption);
      expect(properties).toContain('<w:left w:w="0" w:type="dxa"/>');
      expect(properties).toContain('<w:right w:w="0" w:type="dxa"/>');
      expect(properties).not.toContain("<w:tblInd");
      const grid = [
        ...xml
          .slice(caption)
          .split("</w:tblGrid>")[0]
          .matchAll(/<w:gridCol w:w="(\d+)"\/>/g),
      ].map((match) => Number(match[1]));
      expect(grid).toHaveLength(3);
      expect(Math.abs(grid[1] - twips(6))).toBeLessThanOrEqual(1);
      expect(Math.abs(grid[0] - grid[2])).toBeLessThanOrEqual(1);
      expect(xml.match(/w:tag w:val="cv.section.custom:familie.heading"/g)).toHaveLength(1);
      expect(xml.match(/w:tag w:val="cv.section.schule.heading"/g)).toHaveLength(1);
      expect(model).toEqual(before);
    }
});

test("a narrow fixed spacer remains empty and cannot bypass the text-width gate", () => {
  const table: TableBlock = {
    kind: "table",
    id: "spacer-width",
    widths: [1, 1, 1],
    columnWidthsMm: [null, 6, null],
    rows: [{ cells: [[], [], []], keepTogether: false }],
    decoration: { borderColor: "FFFFFF", borderWidthMm: 0, paddingXMm: 0, paddingYMm: 0 },
  };
  expect(tableColumnWidths(table, 100)).toEqual([47, 6, 47]);
  table.rows[0].cells[1] = [{ kind: "spacer", id: "populated-gap", heightMm: 1 }];
  expect(() => tableColumnWidths(table, 100)).toThrow("insufficient text width");
  table.rows[0].cells[1] = [];
  table.columnWidthsMm![1] = 0;
  expect(() => tableColumnWidths(table, 100)).toThrow("insufficient text width");
});

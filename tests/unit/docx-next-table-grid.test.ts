import { expect, test } from "bun:test";
import { cumulativeColumnTwips } from "../../src/lib/docx-next/table-grid";
import { twips } from "../../src/lib/docx-next/xml";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { sidebarFixture } from "../fixtures/docx-next/sidebar";
import type { TableBlock } from "../../src/lib/docx-next/model";

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

import { expect, test } from "bun:test";
import { walkBlocks } from "../../src/lib/docx-next/model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import {
  SIDEBAR_POPULATED_ROW_CASES,
  sidebarPopulatedRowFixture,
} from "../fixtures/docx-next/sidebar-populated-row";

test("populated controls preserve complete native paragraphs and physical widths across ownership and orientation", () => {
  expect(SIDEBAR_POPULATED_ROW_CASES).toHaveLength(4);
  const paragraphs = (blocks: Parameters<typeof walkBlocks>[0]) =>
    walkBlocks(blocks)
      .filter((block) => block.kind === "paragraph")
      .sort((a, b) => a.id.localeCompare(b.id));
  for (const value of SIDEBAR_POPULATED_ROW_CASES) {
    const current = sidebarPopulatedRowFixture(value);
    const control = sidebarPopulatedRowFixture({ ...value, policy: "grid" });
    const mirrored = sidebarPopulatedRowFixture({
      ...value,
      orientation: value.orientation === "left" ? "right" : "left",
    });
    expect(paragraphs(current.model.cv.blocks)).toEqual(paragraphs(control.model.cv.blocks));
    expect(paragraphs(current.model.cv.blocks)).toEqual(paragraphs(mirrored.model.cv.blocks));
    expect(paragraphs(current.model.cv.blocks)).toHaveLength(10);
    expect(current.fixture.tracks.map((track) => track.lane)).toEqual(
      control.fixture.tracks.map((track) => track.lane),
    );
    for (let index = 0; index < 2; index++) {
      const a = current.fixture.tracks[index],
        b = mirrored.fixture.tracks[index];
      expect(a.lane.rightMm - a.lane.leftMm).toBeCloseTo(b.lane.rightMm - b.lane.leftMm, 6);
      expect(a.fields).toEqual(b.fields);
      expect(a.fields[4].text.length).toBeGreaterThan(10000);
    }
    const table = current.model.cv.blocks[0];
    if (table.kind !== "table") throw Error("Missing native outer table");
    const side = current.fixture.tracks[1].cell;
    expect(table.rows[0].cellRowSpans?.[side]).toBe(table.rows.length);
    expect(table.rows.slice(1).every((row) => row.cells[side].length === 0)).toBe(true);
    if (table.rows.length === 3) {
      const main = current.fixture.tracks[0].cell;
      expect(table.rows[1].cells[main]).toHaveLength(4);
      expect(table.rows[2].cells[main]).toHaveLength(1);
      expect(table.rows[2].keepTogether).toBe(false);
      if (value.orientation === "right")
        expect(table.rows[1].cellDecorations).not.toBe(table.rows[2].cellDecorations);
    }
  }
});

test("populated native packages retain all ten field IDs through immutable JSON and guarded selective emission", async () => {
  for (const value of SIDEBAR_POPULATED_ROW_CASES) {
    const { model, fixture } = sidebarPopulatedRowFixture(value);
    const before = structuredClone(model);
    if (value.policy !== "grid") {
      await expect(renderDossierDocx(model)).rejects.toThrow(
        "cell-ending attachment is unaccepted",
      );
      await expect(renderDossierDocx(JSON.parse(JSON.stringify(model)))).rejects.toThrow(
        "cell-ending attachment is unaccepted",
      );
    }
    const options = { allowUnacceptedModelIssues: value.policy !== "grid" };
    const bytes = new Uint8Array(await (await renderDossierDocx(model, options)).arrayBuffer());
    const restored = new Uint8Array(
      await (await renderDossierDocx(JSON.parse(JSON.stringify(model)), options)).arrayBuffer(),
    );
    expect(restored).toEqual(bytes);
    expect(model).toEqual(before);
    const xml = new TextDecoder().decode(
      readZipEntries(bytes).find((entry) => entry.name === "word/document.xml")!.bytes,
    );
    for (const field of fixture.completeFields)
      expect(xml.split(`<w:tag w:val="${field.fieldId}"/>`)).toHaveLength(2);
    expect(xml).not.toContain("<w:txbxContent>");
    expect(xml).not.toContain("<w:tblpPr");
    expect(xml).not.toContain("<w:framePr");
  }
});

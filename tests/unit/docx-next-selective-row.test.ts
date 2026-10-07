import { expect, test } from "bun:test";
import { walkBlocks } from "../../src/lib/docx-next/model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import {
  SIDEBAR_SELECTIVE_ROW_CASES,
  sidebarSelectiveRowFixture,
} from "../fixtures/docx-next/sidebar-selective-row";

test("outer opening rows retain every semantic paragraph and detach lead/tail endings", () => {
  expect(SIDEBAR_SELECTIVE_ROW_CASES).toHaveLength(18);
  const paragraphs = (blocks: Parameters<typeof walkBlocks>[0]) =>
    walkBlocks(blocks).filter((block) => block.kind === "paragraph");
  for (const value of SIDEBAR_SELECTIVE_ROW_CASES) {
    const { model, fixture } = sidebarSelectiveRowFixture(value);
    const control = sidebarSelectiveRowFixture({ ...value, policy: "grid" });
    expect(paragraphs(model.cv.blocks)).toEqual(paragraphs(control.model.cv.blocks));
    expect(fixture.lane).toEqual(control.fixture.lane);
    const table = model.cv.blocks[0];
    if (table.kind !== "table") throw Error("Missing outer table");
    if (value.policy === "grid") {
      expect(table.rows).toHaveLength(2);
      continue;
    }
    expect(table.rows).toHaveLength(3);
    expect(table.rows[0].cellEndKeepNext).toEqual([false, false, false]);
    expect(table.rows[1].cellEndKeepNext).toEqual(
      [true, true, true].map(() => value.policy === "split-attached"),
    );
    expect(table.rows[2].cellEndKeepNext).toEqual([false, false, false]);
    expect(table.rows[1].keepTogether).toBe(true);
    expect(table.rows[2].keepTogether).toBe(false);
    expect(table.rows[0].cellRowSpans).toEqual([3, 1, 1]);
    expect(paragraphs(table.rows[1].cells[2]).map((p) => p.id)).toEqual(fixture.openingFieldIds);
    expect(table.rows[2].cells[2]).toHaveLength(1);
    expect(table.rows[2].cells[2][0]).toEqual(paragraphs(control.model.cv.blocks)[4]);
  }
});

test("all outer-row controls roundtrip without mutation and diagnostic endings remain export-blocked", async () => {
  for (const value of SIDEBAR_SELECTIVE_ROW_CASES) {
    const { model, fixture } = sidebarSelectiveRowFixture(value);
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
    if (value.policy !== "grid") {
      const caption = xml.indexOf(`<w:tblCaption w:val="${fixture.tableId}"/>`);
      expect(caption).toBeGreaterThan(0);
      const outerTable = xml.slice(
        xml.lastIndexOf("<w:tbl>", caption),
        xml.indexOf("</w:tbl>", caption),
      );
      expect(outerTable.split("<w:cantSplit/>")).toHaveLength(2);
    }
  }
});

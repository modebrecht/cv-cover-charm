import { expect, test } from "bun:test";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import {
  SIDEBAR_CARRIER_STORY_CASES,
  sidebarCarrierStoryFixture,
} from "../fixtures/docx-next/sidebar-carrier-story";

test("whole carrier cells preserve every original authored block and portable diagnostic guard", async () => {
  for (const value of SIDEBAR_CARRIER_STORY_CASES) {
    const { model, control, fixture } = sidebarCarrierStoryFixture(value);
    const carrier = model.cv.blocks[0],
      side = control.cv.blocks[0];
    if (carrier.kind !== "table" || side.kind !== "table") throw Error("Missing native carrier");
    expect(carrier.rows[0].cells[fixture.declaredStoryCells.side]).toEqual(side.rows[0].cells[0]);
    expect(carrier.rows[0].cells[fixture.declaredStoryCells.main]).toEqual(
      control.cv.blocks.slice(1),
    );
    expect(carrier.rows[0].keepTogether).toBe(false);
    expect(carrier.rows[0].cells[1]).toEqual([]);
    model.issues = [];
    delete model.floatingTableTextFlow;
    for (const candidate of [model, JSON.parse(JSON.stringify(model))])
      await expect(renderDossierDocx(candidate)).rejects.toThrow(
        "floating table pagination is unaccepted",
      );
  }
});

test("source integer tracks preserve original native edges without changing any other package part", async () => {
  for (const value of SIDEBAR_CARRIER_STORY_CASES) {
    const { model, control, fixture } = sidebarCarrierStoryFixture(value),
      before = structuredClone(model);
    const options = { allowUnacceptedModelIssues: true };
    const bytes = new Uint8Array(await (await renderDossierDocx(model, options)).arrayBuffer());
    expect(
      new Uint8Array(
        await (await renderDossierDocx(JSON.parse(JSON.stringify(model)), options)).arrayBuffer(),
      ),
    ).toEqual(bytes);
    expect(model).toEqual(before);
    const entries = readZipEntries(bytes),
      original = readZipEntries(
        new Uint8Array(await (await renderDossierDocx(control, options)).arrayBuffer()),
      );
    expect(entries.map((row) => row.name)).toEqual(original.map((row) => row.name));
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].name !== "word/document.xml")
        expect(entries[i].bytes).toEqual(original[i].bytes);
      else {
        const xml = new TextDecoder().decode(entries[i].bytes);
        expect(xml.match(/<w:tblpPr /g)).toHaveLength(1);
        const carrier = xml.slice(xml.indexOf("<w:tbl><w:tblPr><w:tblpPr "));
        const grid = carrier.match(/<w:tblGrid>(.*?)<\/w:tblGrid>/)![1];
        expect([...grid.matchAll(/w:w="(\d+)"/g)].map((match) => Number(match[1]))).toEqual(
          fixture.nativeColumnWidths,
        );
        expect(carrier.match(/<w:tblW w:w="(\d+)"/)![1]).toBe(
          String(fixture.nativeColumnWidths.reduce((a, b) => a + b, 0)),
        );
      }
    }
  }
});

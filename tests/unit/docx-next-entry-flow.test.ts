import { expect, test } from "bun:test";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { walkBlocks } from "../../src/lib/docx-next/model";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { SIDEBAR_CARRIER_STORY_CASES } from "../fixtures/docx-next/sidebar-carrier-story";
import { sidebarEntryFlowFixture } from "../fixtures/docx-next/sidebar-entry-flow";
import { paragraphSignature } from "../fixtures/docx-next/sidebar-floating";

test("entry flow preserves complete paragraph policies and both physical lanes in all six cases", async () => {
  for (const value of SIDEBAR_CARRIER_STORY_CASES) {
    const { model, control, fixture } = sidebarEntryFlowFixture(value);
    expect(paragraphSignature(model.cv.blocks)).toEqual(paragraphSignature(control.cv.blocks));
    expect(
      walkBlocks(model.cv.blocks).filter((block) => block.kind === "entry" && block.keepTogether),
    ).toHaveLength(0);
    const table = model.cv.blocks[0];
    if (table.kind !== "table") throw Error("Missing body carrier");
    expect(table.indentMm).toBe(0);
    expect(model.cv.page.margins.left).toBe(
      Math.min(fixture.mainLane.leftMm, fixture.sideLane.leftMm),
    );
    expect(model.cv.page.widthMm - model.cv.page.margins.right).toBe(
      Math.max(fixture.mainLane.rightMm, fixture.sideLane.rightMm),
    );
    const before = structuredClone(model),
      options = { allowUnacceptedModelIssues: true };
    const bytes = new Uint8Array(await (await renderDossierDocx(model, options)).arrayBuffer());
    expect(model).toEqual(before);
    const original = readZipEntries(
      new Uint8Array(await (await renderDossierDocx(control, options)).arrayBuffer()),
    );
    const candidate = readZipEntries(bytes);
    for (let i = 0; i < original.length; i++)
      if (original[i].name !== "word/document.xml")
        expect(candidate[i].bytes).toEqual(original[i].bytes);
    const xml = new TextDecoder().decode(
      candidate.find((part) => part.name === "word/document.xml")!.bytes,
    );
    for (const id of fixture.removedEntryTables)
      expect(xml).not.toContain(`<w:tblCaption w:val="${id}"/>`);
    const blocks = paragraphSignature(model.cv.blocks);
    for (const paragraph of blocks) expect(xml).toContain(`<w:tag w:val="${paragraph.id}"/>`);
    model.issues = [];
    await expect(renderDossierDocx(model)).rejects.toThrow("body boundary is unaccepted");
  }
});

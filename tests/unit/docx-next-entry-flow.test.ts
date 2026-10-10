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

test("keeping the real boundary with its table changes only that nonsemantic paragraph", async () => {
  const value = SIDEBAR_CARRIER_STORY_CASES.find(
    (value) => value.orientation === "left" && value.kind === "both-long",
  )!;
  const original = sidebarEntryFlowFixture(value).model;
  const candidate = sidebarEntryFlowFixture(value, { keepBodyBoundaryWithTable: true }).model;
  expect(paragraphSignature(candidate.cv.blocks)).toEqual(paragraphSignature(original.cv.blocks));
  const options = { allowUnacceptedModelIssues: true };
  const a = readZipEntries(
    new Uint8Array(await (await renderDossierDocx(original, options)).arrayBuffer()),
  );
  const b = readZipEntries(
    new Uint8Array(await (await renderDossierDocx(candidate, options)).arrayBuffer()),
  );
  for (let i = 0; i < a.length; i++) {
    expect(a[i].name).toBe(b[i].name);
    if (a[i].name !== "word/document.xml") expect(a[i].bytes).toEqual(b[i].bytes);
    else {
      const old = new TextDecoder().decode(a[i].bytes);
      const caption = old.indexOf('<w:tblCaption w:val="probe.floating-carrier"/>');
      const table = old.lastIndexOf("<w:tbl>", caption);
      const empty =
        '<w:p><w:pPr><w:spacing w:after="0" w:line="20" w:lineRule="exact"/></w:pPr></w:p>';
      expect(old.slice(table - empty.length, table)).toBe(empty);
      const kept = empty.replace("<w:pPr>", '<w:pPr><w:keepNext w:val="1"/>');
      expect(new TextDecoder().decode(b[i].bytes)).toBe(
        old.slice(0, table - empty.length) + kept + old.slice(table),
      );
    }
  }
  expect(
    new Uint8Array(
      await (await renderDossierDocx(JSON.parse(JSON.stringify(candidate)), options)).arrayBuffer(),
    ),
  ).toEqual(new Uint8Array(await (await renderDossierDocx(candidate, options)).arrayBuffer()));
  candidate.issues = [];
  await expect(renderDossierDocx(candidate)).rejects.toThrow("body boundary is unaccepted");
});

test("boundary attachment rejects malformed values or a missing real body boundary", async () => {
  const value = SIDEBAR_CARRIER_STORY_CASES[0];
  for (const invalid of [null, 1, "true", {}]) {
    const { model } = sidebarEntryFlowFixture(value);
    Object.assign(model.cv.blocks[0], { bodyBoundaryKeepNext: invalid });
    await expect(renderDossierDocx(model, { allowUnacceptedModelIssues: true })).rejects.toThrow(
      "invalid table body boundary attachment",
    );
  }
  const { model } = sidebarEntryFlowFixture(value, { keepBodyBoundaryWithTable: true });
  const table = model.cv.blocks[0];
  if (table.kind !== "table") throw Error("Missing carrier");
  delete table.bodyBoundary;
  model.issues = [];
  await expect(renderDossierDocx(model)).rejects.toThrow("invalid table body boundary attachment");
});

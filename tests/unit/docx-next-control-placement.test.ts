import { expect, test } from "bun:test";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { validateDossierDocModel } from "../../src/lib/docx-next/validation";
import { walkBlocks } from "../../src/lib/docx-next/model";
import { paragraph } from "../../src/lib/docx-next/native-text";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import {
  SIDEBAR_CONTROL_PLACEMENT_CASES,
  sidebarControlPlacementFixture,
} from "../fixtures/docx-next/sidebar-control-placement";

test("placement changes only the first whole control and survives portable JSON", async () => {
  for (const value of SIDEBAR_CONTROL_PLACEMENT_CASES) {
    const { model, control, fixture } = sidebarControlPlacementFixture(value);
    const originalModel = structuredClone(model);
    const options = { allowUnacceptedModelIssues: true };
    const bytes = new Uint8Array(await (await renderDossierDocx(model, options)).arrayBuffer());
    expect(model).toEqual(originalModel);
    expect(
      new Uint8Array(
        await (await renderDossierDocx(JSON.parse(JSON.stringify(model)), options)).arrayBuffer(),
      ),
    ).toEqual(bytes);
    const before = readZipEntries(
      new Uint8Array(await (await renderDossierDocx(control, options)).arrayBuffer()),
    );
    const after = readZipEntries(bytes);
    expect(after.map((part) => part.name)).toEqual(before.map((part) => part.name));
    const original = walkBlocks(control.cv.blocks).find(
      (block) => block.id === fixture.changedControlId,
    );
    const changed = walkBlocks(model.cv.blocks).find(
      (block) => block.id === fixture.changedControlId,
    );
    if (original?.kind !== "paragraph" || changed?.kind !== "paragraph")
      throw Error("Missing field");
    for (let i = 0; i < before.length; i++) {
      if (before[i].name !== "word/document.xml") expect(after[i].bytes).toEqual(before[i].bytes);
      else {
        const xml = new TextDecoder().decode(before[i].bytes);
        expect(xml.split(paragraph(original))).toHaveLength(2);
        expect(new TextDecoder().decode(after[i].bytes)).toBe(
          xml.replace(paragraph(original), paragraph(changed)),
        );
      }
    }
  }
});

test("malformed placement values fail validation", () => {
  for (const value of [null, false, true, 1, "", "block", {}]) {
    const { model } = sidebarControlPlacementFixture(SIDEBAR_CONTROL_PLACEMENT_CASES[0]);
    const paragraph = walkBlocks(model.cv.blocks).find((block) => block.kind === "paragraph");
    if (!paragraph) throw Error("Missing paragraph");
    Object.assign(paragraph, { controlPlacement: value });
    expect(() => validateDossierDocModel(model)).toThrow("invalid paragraph control placement");
  }
});

test("clearing issues and floating options cannot bypass the inline placement gate", async () => {
  const { model } = sidebarControlPlacementFixture(SIDEBAR_CONTROL_PLACEMENT_CASES[0]);
  model.issues = [];
  delete model.floatingTableTextFlow;
  const table = model.cv.blocks[0];
  if (table.kind !== "table") throw Error("Missing table");
  delete table.position;
  for (const candidate of [model, JSON.parse(JSON.stringify(model))])
    await expect(renderDossierDocx(candidate)).rejects.toThrow(
      "inline paragraph identity is unaccepted",
    );
});

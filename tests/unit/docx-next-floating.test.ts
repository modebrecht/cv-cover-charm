import { expect, test } from "bun:test";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { validateDossierDocModel } from "../../src/lib/docx-next/validation";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import {
  SIDEBAR_FLOATING_CASES,
  sidebarFloatingFixture,
  paragraphSignature,
} from "../fixtures/docx-next/sidebar-floating";

test("floating native tables require diagnostic opt-in, including after model JSON restoration", async () => {
  const value = SIDEBAR_FLOATING_CASES.find((value) => value.floating)!;
  const { model } = sidebarFloatingFixture(value);
  expect(model.issues).toEqual([]);
  await expect(renderDossierDocx(model)).rejects.toThrow("floating table pagination is unaccepted");
  await expect(renderDossierDocx(JSON.parse(JSON.stringify(model)))).rejects.toThrow(
    "floating table pagination is unaccepted",
  );
});

test("diagnostic floating tables validate fixed page geometry and reject nested placement", () => {
  const { model } = sidebarFloatingFixture(SIDEBAR_FLOATING_CASES.find((value) => value.floating)!);
  const table = model.cv.blocks[0];
  if (table.kind !== "table" || !table.position) throw Error("Missing diagnostic floating table");
  for (const change of [
    { widthMm: undefined },
    { widthMm: Infinity },
    { indentMm: 1 },
    { position: { xMm: -1, yMm: 20 } },
    { position: { xMm: NaN, yMm: 20 } },
    { position: { xMm: 200, yMm: 20 } },
    { position: { xMm: 20, yMm: -1 } },
    { position: { xMm: 20, yMm: Infinity } },
    { position: { xMm: 20, yMm: model.cv.page.heightMm } },
  ]) {
    const invalid = structuredClone(model);
    Object.assign(invalid.cv.blocks[0], change);
    expect(() => validateDossierDocModel(invalid)).toThrow();
  }
  model.cv.blocks[0] = { kind: "group", id: "probe.nested", blocks: [table] };
  expect(() => validateDossierDocModel(model)).toThrow("nested positioned table is unsupported");
});

test("20 native placement controls preserve editable paragraphs and immutable model JSON packages", async () => {
  expect(SIDEBAR_FLOATING_CASES).toHaveLength(20);
  for (const value of SIDEBAR_FLOATING_CASES) {
    const { model, main } = sidebarFloatingFixture(value);
    const before = structuredClone(model);
    const mainIds = new Set(paragraphSignature(main).map((paragraph) => paragraph.id));
    expect(
      paragraphSignature(model.cv.blocks).filter((paragraph) => mainIds.has(paragraph.id)),
    ).toEqual(paragraphSignature(main));
    const options = { allowUnacceptedModelIssues: value.floating };
    const bytes = new Uint8Array(await (await renderDossierDocx(model, options)).arrayBuffer());
    const restored = new Uint8Array(
      await (await renderDossierDocx(JSON.parse(JSON.stringify(model)), options)).arrayBuffer(),
    );
    expect(restored).toEqual(bytes);
    expect(model).toEqual(before);
    const parts = Object.fromEntries(
      readZipEntries(bytes).map((entry) => [entry.name, new TextDecoder().decode(entry.bytes)]),
    );
    expect(parts["word/document.xml"].includes("<w:tblpPr")).toBe(value.floating);
    expect(parts["word/settings.xml"].includes("<w:doNotBreakWrappedTables")).toBe(value.floating);
    expect(parts["word/document.xml"]).not.toContain("<w:txbxContent");
    expect(parts["word/document.xml"]).not.toContain("<w:trHeight");
    if (value.kind === "boundary") {
      const control = sidebarFloatingFixture({ ...value, floating: false });
      expect(paragraphSignature(main)).toEqual(paragraphSignature(control.main));
    }
  }
});

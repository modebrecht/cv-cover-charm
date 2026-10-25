import { expect, test } from "bun:test";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { validateDossierDocModel } from "../../src/lib/docx-next/validation";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { SIDEBAR_CARRIER_STORY_CASES } from "../fixtures/docx-next/sidebar-carrier-story";
import { sidebarBodyCarrierFixture } from "../fixtures/docx-next/sidebar-body-carrier";

const value = SIDEBAR_CARRIER_STORY_CASES.find(
  (value) => value.orientation === "left" && value.kind === "both-long",
)!;

test("body table retains whole cells, exact lane widths and portable source data", async () => {
  const { model, control } = sidebarBodyCarrierFixture(value);
  const table = model.cv.blocks[0],
    original = control.cv.blocks[0];
  if (table.kind !== "table" || original.kind !== "table" || !original.position)
    throw Error("Missing carrier");
  expect(table.rows).toEqual(original.rows);
  expect(table.widths).toEqual(original.widths);
  expect(table.widthMm).toBe(original.widthMm);
  expect(model.cv.page).toEqual(control.cv.page);
  expect(table.indentMm! + model.cv.page.margins.left).toBe(original.position.xMm);
  const before = structuredClone(model),
    options = { allowUnacceptedModelIssues: true };
  const bytes = new Uint8Array(await (await renderDossierDocx(model, options)).arrayBuffer());
  expect(model).toEqual(before);
  expect(
    new Uint8Array(
      await (await renderDossierDocx(JSON.parse(JSON.stringify(model)), options)).arrayBuffer(),
    ),
  ).toEqual(bytes);
  const parts = readZipEntries(bytes);
  const old = readZipEntries(
    new Uint8Array(await (await renderDossierDocx(control, options)).arrayBuffer()),
  );
  expect(parts.map((part) => part.name)).toEqual(old.map((part) => part.name));
  for (let i = 0; i < parts.length; i++)
    if (!["word/document.xml", "word/settings.xml"].includes(parts[i].name))
      expect(parts[i].bytes).toEqual(old[i].bytes);
});

test("body boundaries reject malformed, nested, floating and out-of-page indentation", () => {
  for (const input of [null, false, 1, "", "cell", {}]) {
    const { model } = sidebarBodyCarrierFixture(value);
    Object.assign(model.cv.blocks[0], { bodyBoundary: input });
    expect(() => validateDossierDocModel(model)).toThrow("invalid table body boundary");
  }
  for (const change of ["floating", "nested", "outside"]) {
    const { model } = sidebarBodyCarrierFixture(value);
    const table = model.cv.blocks[0];
    if (table.kind !== "table") throw Error("Missing table");
    if (change === "floating") table.position = { xMm: 20, yMm: 20 };
    else if (change === "nested")
      model.cv.blocks = [{ kind: "group", id: "probe.group", blocks: [table] }];
    else table.indentMm = -model.cv.page.margins.left - 1;
    expect(() => validateDossierDocModel(model)).toThrow(
      change === "outside" ? "invalid flow box" : "invalid table body boundary",
    );
  }
});

test("body boundary cannot enable export after issues and floating options are cleared", async () => {
  const { model } = sidebarBodyCarrierFixture(value);
  model.issues = [];
  expect(model.floatingTableTextFlow).toBeUndefined();
  for (const candidate of [model, JSON.parse(JSON.stringify(model))])
    await expect(renderDossierDocx(candidate)).rejects.toThrow("table body boundary is unaccepted");
});

import { expect, test } from "bun:test";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { validateDossierDocModel } from "../../src/lib/docx-next/validation";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { walkBlocks } from "../../src/lib/docx-next/model";
import {
  SIDEBAR_CELL_END_CASES,
  sidebarCellEndingFixture,
} from "../fixtures/docx-next/sidebar-cell-ending";

test("unaccepted cell-ending attachment cannot bypass export guards through JSON or another story", async () => {
  const { model } = sidebarCellEndingFixture(SIDEBAR_CELL_END_CASES[2]);
  expect(model.issues).toEqual([]);
  for (const story of ["body", "header", "firstHeader", "footer", "nested"] as const) {
    const candidate = structuredClone(model);
    const table = candidate.cv.blocks[0];
    if (story === "nested")
      candidate.cv.blocks = [{ kind: "group", id: "probe.nested", blocks: [table] }];
    else if (story !== "body") {
      candidate.cv.blocks = [];
      candidate.cv[story] = [table];
    }
    await expect(renderDossierDocx(candidate)).rejects.toThrow(
      "cell-ending attachment is unaccepted",
    );
    await expect(renderDossierDocx(JSON.parse(JSON.stringify(candidate)))).rejects.toThrow(
      "cell-ending attachment is unaccepted",
    );
  }
  const table = model.cv.blocks[0];
  if (table.kind !== "table") throw Error("Missing table");
  for (const row of table.rows) row.cellEndKeepNext = row.cells.map(() => null);
  await expect(renderDossierDocx(model)).rejects.toThrow("cell-ending attachment is unaccepted");
});

test("cell-ending declarations reject malformed counts and non-boolean flags without changing the model", () => {
  const { model } = sidebarCellEndingFixture(SIDEBAR_CELL_END_CASES[2]);
  const before = structuredClone(model);
  for (const flags of [
    [],
    [true],
    [true, true, true, true],
    [true, false, 1],
    ["true", null, false],
    [undefined, true, false],
    null,
    "true",
  ]) {
    const candidate = structuredClone(model);
    const table = candidate.cv.blocks[0];
    if (table.kind !== "table") throw Error("Missing table");
    Object.assign(table.rows[0], { cellEndKeepNext: flags });
    expect(() => validateDossierDocModel(candidate)).toThrow("invalid cell-ending attachment");
  }
  validateDossierDocModel(model);
  expect(model).toEqual(before);
});

test("12 controls preserve all semantic paragraphs, physical lanes and deterministic native cell endings", async () => {
  const paragraphs = (blocks: Parameters<typeof walkBlocks>[0]) =>
    walkBlocks(blocks).filter((block) => block.kind === "paragraph");
  expect(SIDEBAR_CELL_END_CASES).toHaveLength(12);
  for (const value of SIDEBAR_CELL_END_CASES) {
    const { model, fixture } = sidebarCellEndingFixture(value);
    const control = sidebarCellEndingFixture({ ...value, policy: "default" });
    expect(paragraphs(model.cv.blocks)).toEqual(paragraphs(control.model.cv.blocks));
    expect(fixture.lane).toEqual(control.fixture.lane);
    const before = structuredClone(model);
    const options = { allowUnacceptedModelIssues: value.policy !== "default" };
    const bytes = new Uint8Array(await (await renderDossierDocx(model, options)).arrayBuffer());
    const restored = new Uint8Array(
      await (await renderDossierDocx(JSON.parse(JSON.stringify(model)), options)).arrayBuffer(),
    );
    expect(restored).toEqual(bytes);
    expect(model).toEqual(before);
    const document = new TextDecoder().decode(
      readZipEntries(bytes).find((entry) => entry.name === "word/document.xml")!.bytes,
    );
    const cells = [...document.matchAll(/<w:tc>(.*?)<\/w:tc>/g)];
    expect(cells).toHaveLength(6);
    for (const [index, flag] of fixture.cellEndKeepNext.flat().entries()) {
      const end = flag === null ? "" : `<w:keepNext w:val="${flag ? 1 : 0}"/>`;
      expect(
        cells[index][1].endsWith(
          `<w:p><w:pPr>${end}<w:spacing w:after="0" w:line="20" w:lineRule="exact"/></w:pPr></w:p>`,
        ),
      ).toBe(true);
    }
    for (const field of fixture.completeFields)
      expect(document).toContain(`<w:tag w:val="${field.fieldId}"/>`);
    expect(document).not.toContain("<w:txbxContent>");
  }
});

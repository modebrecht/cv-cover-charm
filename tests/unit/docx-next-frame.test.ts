import { expect, test } from "bun:test";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { validateDossierDocModel } from "../../src/lib/docx-next/validation";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { walkBlocks } from "../../src/lib/docx-next/model";
import { SIDEBAR_FRAME_CASES, sidebarFrameFixture } from "../fixtures/docx-next/sidebar-frame";
import { sidebarFloatingFixture, paragraphSignature } from "../fixtures/docx-next/sidebar-floating";

test("automatic-height paragraph frames remain blocked after model JSON restoration", async () => {
  const { model } = sidebarFrameFixture(SIDEBAR_FRAME_CASES[0]);
  expect(model.issues).toEqual([]);
  await expect(renderDossierDocx(model)).rejects.toThrow(
    "paragraph frame pagination is unaccepted",
  );
  await expect(renderDossierDocx(JSON.parse(JSON.stringify(model)))).rejects.toThrow(
    "paragraph frame pagination is unaccepted",
  );
});

test("paragraph frame diagnostics reject invalid geometry, nested frames and overflowing paragraph indents", () => {
  const { model } = sidebarFrameFixture(SIDEBAR_FRAME_CASES[0]);
  const frame = model.cv.blocks[0];
  if (frame.kind !== "paragraph-frame") throw Error("Missing frame");
  for (const change of [
    { xMm: -1 },
    { xMm: NaN },
    { xMm: 200 },
    { yMm: -1 },
    { yMm: Infinity },
    { yMm: model.cv.page.heightMm },
    { widthMm: 9 },
    { widthMm: Infinity },
    { paragraphs: [] },
  ]) {
    const invalid = structuredClone(model);
    Object.assign(invalid.cv.blocks[0], change);
    expect(() => validateDossierDocModel(invalid)).toThrow();
  }
  for (const indentMm of [-1, frame.widthMm]) {
    const invalid = structuredClone(model);
    if (invalid.cv.blocks[0].kind !== "paragraph-frame") throw Error("Missing frame");
    invalid.cv.blocks[0].paragraphs[0].indentMm = indentMm;
    expect(() => validateDossierDocModel(invalid)).toThrow("invalid paragraph frame");
  }
  model.cv.blocks[0] = { kind: "group", id: "probe.nested", blocks: [frame] };
  expect(() => validateDossierDocModel(model)).toThrow("nested paragraph frame is unsupported");
});

test("four bounded frame controls preserve native fields, adjacent paragraph ownership, lists and immutable JSON packages", async () => {
  expect(SIDEBAR_FRAME_CASES).toHaveLength(4);
  for (const value of SIDEBAR_FRAME_CASES) {
    const { model, fixture } = sidebarFrameFixture(value);
    const control = sidebarFloatingFixture({ ...value, floating: true, semanticRows: false });
    expect(paragraphSignature(model.cv.blocks)).toEqual(
      paragraphSignature(control.model.cv.blocks),
    );
    const frame = model.cv.blocks[0];
    if (frame.kind !== "paragraph-frame") throw Error("Missing frame");
    const ids = walkBlocks(model.cv.blocks).map((block) => block.id);
    expect(new Set(ids).size).toBe(ids.length);
    frame.paragraphs[0].list = "bullet";
    frame.paragraphs[0].listGroupId = "probe.frame-list";
    const before = structuredClone(model);
    const options = { allowUnacceptedModelIssues: true };
    const bytes = new Uint8Array(await (await renderDossierDocx(model, options)).arrayBuffer());
    expect(
      new Uint8Array(
        await (await renderDossierDocx(JSON.parse(JSON.stringify(model)), options)).arrayBuffer(),
      ),
    ).toEqual(bytes);
    expect(model).toEqual(before);
    const parts = Object.fromEntries(
      readZipEntries(bytes).map((entry) => [entry.name, new TextDecoder().decode(entry.bytes)]),
    );
    const document = parts["word/document.xml"];
    const paragraphs = [
      ...document.matchAll(/<w:p><w:pPr>([\s\S]*?)<\/w:pPr>([\s\S]*?)<\/w:p>/g),
    ].filter((match) => match[1].includes("<w:framePr"));
    expect(paragraphs).toHaveLength(fixture.sideFields.length);
    paragraphs.forEach((match, index) => {
      expect(match[1]).toContain('w:hRule="auto"');
      expect(match[1]).not.toMatch(/<w:framePr[^>]* w:h="/);
      expect(match[2].startsWith("<w:sdt>")).toBe(true);
      expect(match[2]).toContain(`w:tag w:val="${fixture.sideFields[index].fieldId}"`);
    });
    expect(paragraphs[0][1]).toContain("<w:numPr>");
    expect(document).not.toContain("<w:txbxContent");
  }
});

import { expect, test } from "bun:test";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { validateDossierDocModel } from "../../src/lib/docx-next/validation";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { emptyParagraph } from "../../src/lib/docx-next/native-text";
import {
  SIDEBAR_FLOATING_ANCHOR_CASES,
  sidebarFloatingAnchorFixture,
} from "../fixtures/docx-next/sidebar-floating-anchor";

test("declared floating anchors reject wrong, missing, nested and nonadjacent native paragraph IDs", () => {
  const { model } = sidebarFloatingAnchorFixture(SIDEBAR_FLOATING_ANCHOR_CASES[1]);
  for (const id of [null, false, 1, "", "visible text", "cv.person.name", "missing.semantic.id"]) {
    const invalid = JSON.parse(JSON.stringify(model));
    invalid.cv.blocks[0].position.anchorParagraphId = id;
    expect(() => validateDossierDocModel(invalid)).toThrow("invalid floating paragraph anchor");
  }
  const missing = structuredClone(model);
  missing.cv.blocks.splice(1, 1);
  expect(() => validateDossierDocModel(missing)).toThrow("invalid floating paragraph anchor");
  const nested = structuredClone(model);
  nested.cv.blocks = [{ kind: "group", id: "nested.owner", blocks: nested.cv.blocks }];
  expect(() => validateDossierDocModel(nested)).toThrow("invalid floating paragraph anchor");
});

test("native paragraph ownership remains diagnostically blocked after JSON with cleared issues", async () => {
  const { model } = sidebarFloatingAnchorFixture(SIDEBAR_FLOATING_ANCHOR_CASES[1]);
  model.issues = [];
  delete model.floatingTableTextFlow;
  await expect(renderDossierDocx(model)).rejects.toThrow("floating table pagination is unaccepted");
  await expect(renderDossierDocx(JSON.parse(JSON.stringify(model)))).rejects.toThrow(
    "floating table pagination is unaccepted",
  );
});

test("all twelve explicit anchors preserve whole native stories and every part except one unowned separator", async () => {
  expect(SIDEBAR_FLOATING_ANCHOR_CASES).toHaveLength(12);
  for (const value of SIDEBAR_FLOATING_ANCHOR_CASES) {
    const { model, fixture } = sidebarFloatingAnchorFixture(value);
    const control = sidebarFloatingAnchorFixture({ ...value, anchor: "empty-separator" }).model;
    const before = structuredClone(model),
      normalized = structuredClone(model),
      table = normalized.cv.blocks[0];
    if (table.kind !== "table" || !table.position) throw Error("Missing positioned native owner");
    delete table.position.anchorParagraphId;
    expect(normalized).toEqual(control);
    const options = { allowUnacceptedModelIssues: true };
    const bytes = new Uint8Array(await (await renderDossierDocx(model, options)).arrayBuffer());
    expect(
      new Uint8Array(
        await (await renderDossierDocx(JSON.parse(JSON.stringify(model)), options)).arrayBuffer(),
      ),
    ).toEqual(bytes);
    expect(model).toEqual(before);
    const entries = readZipEntries(bytes),
      originals = readZipEntries(
        new Uint8Array(await (await renderDossierDocx(control, options)).arrayBuffer()),
      );
    expect(entries.map((row) => row.name)).toEqual(originals.map((row) => row.name));
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].name === "word/document.xml" && value.anchor === "following-paragraph") {
        const previous = new TextDecoder().decode(originals[i].bytes),
          current = new TextDecoder().decode(entries[i].bytes);
        const boundary = `</w:tbl>${emptyParagraph}<w:sdt><w:sdtPr><w:alias w:val="${fixture.anchorParagraphId}"/>`;
        expect(previous.split(boundary)).toHaveLength(2);
        expect(previous.replace(boundary, boundary.replace(emptyParagraph, ""))).toEqual(current);
      } else expect(entries[i].bytes).toEqual(originals[i].bytes);
    }
  }
});

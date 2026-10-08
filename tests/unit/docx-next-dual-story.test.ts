import { expect, test } from "bun:test";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { validateDossierDocModel } from "../../src/lib/docx-next/validation";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { emptyParagraph } from "../../src/lib/docx-next/native-text";
import {
  SIDEBAR_DUAL_STORY_CASES,
  sidebarDualStoryFixture,
} from "../fixtures/docx-next/sidebar-dual-story";

test("adjacent floating ownership rejects missing, nonadjacent, inline and conflicting anchors", () => {
  const { model } = sidebarDualStoryFixture(SIDEBAR_DUAL_STORY_CASES[0]);
  for (const value of [null, false, 1, "", "visible text", "missing.id"]) {
    const invalid = JSON.parse(JSON.stringify(model));
    invalid.cv.blocks[0].position.nextFloatingTableId = value;
    expect(() => validateDossierDocModel(invalid)).toThrow("invalid adjacent floating owner");
  }
  for (const change of ["missing", "inline", "paragraph", "conflict", "nested"]) {
    const invalid = JSON.parse(JSON.stringify(model));
    if (change === "missing") invalid.cv.blocks.pop();
    if (change === "inline") delete invalid.cv.blocks[1].position;
    if (change === "paragraph")
      invalid.cv.blocks.splice(1, 0, invalid.cv.blocks[1].rows[0].cells[0][0]);
    if (change === "conflict") invalid.cv.blocks[0].position.anchorParagraphId = "main.id";
    if (change === "nested")
      invalid.cv.blocks = [{ kind: "group", id: "nested.owner", blocks: invalid.cv.blocks }];
    expect(() => validateDossierDocModel(invalid)).toThrow("invalid adjacent floating owner");
  }
});

test("both complete floating owners remain blocked after restoring JSON and clearing issue lists", async () => {
  const { model } = sidebarDualStoryFixture(SIDEBAR_DUAL_STORY_CASES[0]);
  model.issues = [];
  delete model.floatingTableTextFlow;
  for (const value of [model, JSON.parse(JSON.stringify(model))])
    await expect(renderDossierDocx(value)).rejects.toThrow(
      "floating table pagination is unaccepted",
    );
});

test("explicit adjacency changes exactly one empty boundary and preserves all authored blocks and package parts", async () => {
  for (const value of SIDEBAR_DUAL_STORY_CASES) {
    const { model } = sidebarDualStoryFixture(value),
      separated = structuredClone(model);
    const side = separated.cv.blocks[0];
    if (side.kind !== "table" || !side.position) throw Error("Missing positioned owner");
    delete side.position.nextFloatingTableId;
    const before = structuredClone(model),
      options = { allowUnacceptedModelIssues: true };
    const bytes = new Uint8Array(await (await renderDossierDocx(model, options)).arrayBuffer());
    expect(
      new Uint8Array(
        await (await renderDossierDocx(JSON.parse(JSON.stringify(model)), options)).arrayBuffer(),
      ),
    ).toEqual(bytes);
    expect(model).toEqual(before);
    const entries = readZipEntries(bytes),
      originals = readZipEntries(
        new Uint8Array(await (await renderDossierDocx(separated, options)).arrayBuffer()),
      );
    expect(entries.map((row) => row.name)).toEqual(originals.map((row) => row.name));
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].name !== "word/document.xml")
        expect(entries[i].bytes).toEqual(originals[i].bytes);
      else {
        const current = new TextDecoder().decode(entries[i].bytes),
          previous = new TextDecoder().decode(originals[i].bytes);
        const boundary = `</w:tbl>${emptyParagraph}<w:tbl><w:tblPr><w:tblpPr`;
        expect(previous.split(boundary)).toHaveLength(2);
        expect(previous.replace(boundary, boundary.replace(emptyParagraph, ""))).toEqual(current);
      }
    }
  }
});

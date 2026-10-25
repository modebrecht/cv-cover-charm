import { expect, test } from "bun:test";
import { validateDossierDocModel } from "../../src/lib/docx-next/validation";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import {
  SIDEBAR_OWNER_BOUNDARY_CASES,
  sidebarOwnerBoundaryFixture,
} from "../fixtures/docx-next/sidebar-owner-boundary";
import {
  sidebarDualStoryFixture,
  SIDEBAR_DUAL_STORY_CASES,
} from "../fixtures/docx-next/sidebar-dual-story";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { emptyParagraph } from "../../src/lib/docx-next/native-text";

test("all six declared boundaries preserve JSON, model and every other package part", async () => {
  for (const value of SIDEBAR_OWNER_BOUNDARY_CASES) {
    const { model, control } = sidebarOwnerBoundaryFixture(value);
    const before = structuredClone(model);
    const options = { allowUnacceptedModelIssues: true };
    const bytes = new Uint8Array(await (await renderDossierDocx(model, options)).arrayBuffer());
    const restored = new Uint8Array(
      await (await renderDossierDocx(JSON.parse(JSON.stringify(model)), options)).arrayBuffer(),
    );
    expect(restored).toEqual(bytes);
    expect(model).toEqual(before);
    const original = readZipEntries(
      new Uint8Array(await (await renderDossierDocx(control, options)).arrayBuffer()),
    );
    const candidate = readZipEntries(bytes);
    expect(candidate.map((part) => part.name)).toEqual(original.map((part) => part.name));
    for (let i = 0; i < original.length; i++) {
      if (original[i].name !== "word/document.xml") {
        expect(candidate[i].bytes).toEqual(original[i].bytes);
        continue;
      }
      const xml = new TextDecoder().decode(original[i].bytes);
      const start = "<w:tbl><w:tblPr><w:tblpPr";
      expect(xml.split(start)).toHaveLength(2);
      expect(new TextDecoder().decode(candidate[i].bytes)).toBe(
        xml.replace(start, emptyParagraph + start),
      );
    }
  }
});

test("floating boundaries reject malformed JSON and conflicting adjacency", () => {
  const { model } = sidebarOwnerBoundaryFixture(SIDEBAR_OWNER_BOUNDARY_CASES[0]);
  for (const value of [null, false, true, 1, "", "cell", {}]) {
    const invalid = JSON.parse(JSON.stringify(model));
    invalid.cv.blocks[0].position.leadingBoundary = value;
    expect(() => validateDossierDocModel(invalid)).toThrow("invalid floating leading boundary");
  }
  const invalid = sidebarDualStoryFixture(SIDEBAR_DUAL_STORY_CASES[0]).model;
  const following = invalid.cv.blocks[1];
  if (following.kind !== "table" || !following.position) throw Error("Missing positioned owner");
  following.position.leadingBoundary = "paragraph";
  expect(() => validateDossierDocModel(invalid)).toThrow("invalid adjacent floating owner");
});
test("owner boundary cannot enable production export through portable JSON or cleared issues", async () => {
  const { model } = sidebarOwnerBoundaryFixture(SIDEBAR_OWNER_BOUNDARY_CASES[0]);
  model.issues = [];
  delete model.floatingTableTextFlow;
  for (const value of [model, JSON.parse(JSON.stringify(model))])
    await expect(renderDossierDocx(value)).rejects.toThrow(
      "floating table pagination is unaccepted",
    );
});

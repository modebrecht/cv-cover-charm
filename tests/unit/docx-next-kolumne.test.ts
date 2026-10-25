import { expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { validateDecoration } from "../../src/lib/docx-next/decoration";
import { walkBlocks, type Paragraph } from "../../src/lib/docx-next/model";
import { KOLUMNE, nextTemplate } from "../../src/lib/docx-next/templates";
import { KOLUMNE_FIXTURES, kolumneFixture } from "../fixtures/docx-next/kolumne";

test("Kolumne stress models retain immutable semantic source and valid paint", () => {
  expect(nextTemplate("terracotta")).toBe(KOLUMNE);
  for (const kind of KOLUMNE_FIXTURES) {
    const input = kolumneFixture(kind),
      before = JSON.stringify(input);
    const model = buildDossierDocModel(input);
    expect(model.issues).toEqual([]);
    expect(buildDossierDocModel(JSON.parse(before))).toEqual(model);
    expect(JSON.stringify(input)).toBe(before);
    for (const part of [model.cover, model.letter, model.cv])
      for (const shape of part.headerShapes ?? []) validateDecoration(shape);
  }
});

test("long contacts own the native column fill; source color and semantic IDs stay intact", () => {
  const input = kolumneFixture("contact-long"),
    model = buildDossierDocModel(input);
  const blocks = walkBlocks(model.cover.blocks);
  const cell = blocks.find((b) => b.id === "cover.composition.row:0.cell:0.surface");
  expect(cell).toMatchObject({ kind: "table", decoration: { fillColor: "8C3F28", paddingXMm: 3 } });
  const contact = blocks.find((b) => b.id === "cover.kontakt") as Paragraph;
  expect(contact.runs.map((r) => r.text).join("")).toContain("Kontaktzeile 60:");
  expect(contact.runs.some((r) => r.fieldId === "cover.kontakt")).toBe(true);
  expect(model.cover.headerShapes?.some((s) => s.id === "cover.decor-side-column")).toBe(false);
  expect(model.letter.headerShapes?.some((s) => s.widthMm === 17)).toBe(true);
});

test("saved photos, typography and existing CV compositions remain generic", () => {
  const input = kolumneFixture("images", "data:image/png;base64/test");
  input.settings.fieldStyles = {
    "cover.fullName": { font: "Georgia", color: "123456", italic: true },
  };
  const model = buildDossierDocModel(input),
    blocks = walkBlocks(model.cover.blocks);
  expect((blocks.find((b) => b.id === "cover.fullName") as Paragraph).runs[0].style).toMatchObject({
    font: "Georgia",
    color: "123456",
    italic: true,
  });
  expect(blocks.find((b) => b.id === "cover.photo")).toMatchObject({
    kind: "image",
    source: input.cover.data.foto,
    widthMm: input.cover.blocks.find((b) => b.id === "foto")!.style.w,
  });
  expect(buildDossierDocModel(kolumneFixture("timeline")).cv.layout.variant).toBe("timeline");
  expect(buildDossierDocModel(kolumneFixture("magazin")).cv.layout.variant).toBe("editorial");
});

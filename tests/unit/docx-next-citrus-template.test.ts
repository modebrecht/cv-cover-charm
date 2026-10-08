import { expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { compositeTextColor } from "../../src/lib/docx-next/colors";
import { validateDecoration } from "../../src/lib/docx-next/decoration";
import { walkBlocks, type Paragraph, type SectionBlock } from "../../src/lib/docx-next/model";
import { CITRUS, nextTemplate } from "../../src/lib/docx-next/templates";
import { CITRUS_FIXTURES, citrusFixture } from "../fixtures/docx-next/citrus";

test("Citrus stress inputs restore the same immutable semantic models and valid contours", () => {
  expect(nextTemplate("citrus")).toBe(CITRUS);
  for (const kind of CITRUS_FIXTURES) {
    const input = citrusFixture(kind),
      before = JSON.stringify(input);
    const model = buildDossierDocModel(input);
    expect(model.issues).toEqual([]);
    expect(buildDossierDocModel(JSON.parse(before))).toEqual(model);
    expect(JSON.stringify(input)).toBe(before);
    for (const part of [model.cover, model.letter, model.cv])
      for (const shape of part.headerShapes ?? []) validateDecoration(shape);
  }
});

test("default rubric shading stays editable; both saved off policies take precedence", () => {
  for (const kind of ["normal", "badges-off", "legacy-badges-off"] as const) {
    const model = buildDossierDocModel(citrusFixture(kind));
    const sections = walkBlocks(model.cv.blocks).filter(
      (b) => b.kind === "section",
    ) as SectionBlock[];
    expect(sections.length).toBeGreaterThan(0);
    for (const section of sections)
      for (const run of section.heading!.runs) {
        expect(Boolean(run.style.backgroundColor)).toBe(kind === "normal");
        expect(run.text.length).toBeGreaterThan(0);
        expect(run.fieldId).toContain("cv.section.");
      }
  }
});

test("saved photo frames and field styles retain precedence; existing CV layouts stay shared", () => {
  const input = citrusFixture("images", "data:image/png;base64/test");
  input.settings.fieldStyles = {
    "cover.fullName": { font: "Georgia", color: "123456", italic: true },
  };
  const blocks = walkBlocks(buildDossierDocModel(input).cover.blocks);
  expect((blocks.find((b) => b.id === "cover.fullName") as Paragraph).runs[0].style).toMatchObject({
    font: "Georgia",
    color: compositeTextColor(
      "123456",
      input.cover.colors.bg.replace("#", ""),
      input.cover.blocks.find((b) => b.id === "name")!.style.opacity,
    ),
    italic: true,
  });
  expect(blocks.find((b) => b.id === "cover.photo")).toMatchObject({
    kind: "image",
    source: input.cover.data.foto,
    widthMm: input.cover.blocks.find((b) => b.id === "foto")!.style.w,
  });
  expect(buildDossierDocModel(citrusFixture("timeline")).cv.layout.variant).toBe("timeline");
  expect(buildDossierDocModel(citrusFixture("magazin")).cv.layout.variant).toBe("editorial");
  expect(buildDossierDocModel(citrusFixture("no-motifs")).cv.headerShapes).toBeUndefined();
});

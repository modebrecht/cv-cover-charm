import { describe, expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { validateDecoration } from "../../src/lib/docx-next/decoration";
import { walkBlocks, type Paragraph } from "../../src/lib/docx-next/model";
import { STUDIO_2, STUDIO, nextTemplate } from "../../src/lib/docx-next/templates";
import { GRAPHIC_FIXTURES, graphicCandidateFixture } from "../fixtures/docx-next/graphic-candidate";

for (const template of [STUDIO_2, STUDIO]) {
  describe(`${template.id} declarative migration`, () => {
    test("stress inputs retain deterministic editable models and valid paint", () => {
      for (const kind of [...GRAPHIC_FIXTURES, "cover-long", "contact-long"] as const) {
        const input = graphicCandidateFixture(template.id, kind);
        const model = buildDossierDocModel(input);
        expect(model.issues).toEqual([]);
        expect(buildDossierDocModel(JSON.parse(JSON.stringify(input)))).toEqual(model);
        for (const part of [model.cover, model.letter, model.cv]) {
          for (const shape of part.headerShapes ?? []) validateDecoration(shape);
        }
      }
    });
    test("saved text styles and photo frames survive shared compositions", () => {
      const input = graphicCandidateFixture(template.id, "images", "data:image/png;base64/test");
      input.settings.fieldStyles = {
        "cover.fullName": { font: "Georgia", color: "123456", italic: true },
      };
      const model = buildDossierDocModel(input);
      const blocks = walkBlocks(model.cover.blocks);
      const name = blocks.find((block) => block.id === "cover.fullName") as Paragraph;
      expect(name.runs[0].style).toMatchObject({ font: "Georgia", color: "123456", italic: true });
      expect(blocks.find((block) => block.id === "cover.photo")).toMatchObject({
        kind: "image",
        source: input.cover.data.foto,
        widthMm: input.cover.blocks.find((block) => block.id === "foto")!.style.w,
        frame: {
          heightRatio: input.cover.blocks.find((block) => block.id === "foto")!.style.ratio,
          radiusMm: input.cover.blocks.find((block) => block.id === "foto")!.style.radius,
        },
      });
      expect(walkBlocks(model.cv.blocks).some((block) => block.kind === "image")).toBe(true);
    });
    test("custom rich text remains semantic rather than decorative artwork", () => {
      const model = buildDossierDocModel(graphicCandidateFixture(template.id, "custom"));
      const text = walkBlocks(model.letter.blocks)
        .flatMap((block) =>
          block.kind === "paragraph"
            ? block.runs.map((run) => ("text" in run ? run.text : ""))
            : [],
        )
        .join(" ");
      expect(text).toContain("Editierbarer Kandidaten-Inhalt");
      expect(text).toContain("Native Liste");
      expect(text).toContain("Linke Zelle");
      expect(template.artwork).toEqual([]);
    });
  });
}

test("Studio 2 owns its navy/yellow split and 58 mm stationery signal", () => {
  const model = buildDossierDocModel(graphicCandidateFixture("studio2", "custom-colors"));
  expect(model.cover.headerShapes?.slice(0, 2)).toMatchObject([
    { shape: "rect", heightMm: 96, fill: { color: "385D58" } },
    {
      xMm: 124,
      widthMm: 86,
      heightMm: 96,
      cornerRadiiMm: [0, 0, 0, 30],
      fill: { color: "D48B35" },
    },
  ]);
  expect(STUDIO_2.chrome.band?.motifs?.[0].widthFraction).toBe(58 / 210);
});

test("Studio retains authored cover paint and independently repeating narrow rails", () => {
  for (const template of [STUDIO]) {
    const input = graphicCandidateFixture(template.id, "normal");
    const model = buildDossierDocModel(input);
    expect(model.cover.headerShapes?.some((shape) => shape.widthMm === 72)).toBe(true);
    expect(model.letter.headerShapes?.some((shape) => shape.widthMm === 20)).toBe(true);
    expect(template.cover.rows?.[0].fields).toHaveLength(3);
    expect(template.cover.rows?.[0].fields[1]).toEqual([]);
    const contact = walkBlocks(model.cover.blocks).find(
      (block) => block.id === "cover.kontakt",
    ) as Paragraph;
    expect(contact.runs[0].style?.color).toBe(input.cover.colors.bg.slice(1).toUpperCase());
    const hidden = graphicCandidateFixture(template.id, "none");
    hidden.cv.design.bgOpacity = 0;
    expect(buildDossierDocModel(hidden).cv.headerShapes).toBeUndefined();
  }
});

test("Kolumne uses the subsequently verified native contact surface", () => {
  expect(nextTemplate("terracotta").cover.rows?.[0].cellSurfaceElementIds?.[0]).toBe(
    "decor-side-column",
  );
});

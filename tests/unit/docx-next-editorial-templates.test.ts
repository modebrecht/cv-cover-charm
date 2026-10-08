import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { validateDecoration } from "../../src/lib/docx-next/decoration";
import { walkBlocks, type Paragraph, type TableBlock } from "../../src/lib/docx-next/model";
import { nextTemplate } from "../../src/lib/docx-next/templates";
import { EDGE_FIXTURES, edgeFixture } from "../fixtures/docx-next/edge";
import { GALLERY_FIXTURES, galleryFixture } from "../fixtures/docx-next/gallery";

describe("Edge and Gallery declarative template migration", () => {
  for (const [label, fixtures, fixture] of [
    ["Edge", EDGE_FIXTURES, edgeFixture],
    ["Gallery", GALLERY_FIXTURES, galleryFixture],
  ] as const) {
    test(`${label}: stress models retain unique editable fields after portable JSON`, () => {
      for (const kind of fixtures) {
        const input = fixture(kind),
          before = JSON.stringify(input);
        const model = buildDossierDocModel(input);
        expect(model.issues).toEqual([]);
        expect(model).toEqual(buildDossierDocModel(JSON.parse(before)));
        expect(JSON.stringify(input)).toBe(before);
        for (const part of [model.cover, model.letter, model.cv]) {
          const blocks = walkBlocks([...part.blocks, ...part.header, ...part.footer]);
          expect(new Set(blocks.map((block) => block.id)).size).toBe(blocks.length);
          expect(blocks.some((block) => block.kind === "paragraph" && block.runs.length)).toBe(
            true,
          );
          for (const shape of part.headerShapes ?? []) validateDecoration(shape);
        }
      }
    });
    test(`${label}: authored fonts, semantic typography and saved photo frame override defaults`, () => {
      const input = fixture("images", "data:image/png;base64/test");
      const sourcePhoto = input.cover.blocks.find((block) => block.kind === "photo")!;
      input.settings.fieldStyles = {
        "cover.fullName": { font: "Georgia", italic: true, color: "123456" },
      };
      const model = buildDossierDocModel(input);
      const blocks = walkBlocks(model.cover.blocks);
      const name = blocks.find((block) => block.id === "cover.fullName") as Paragraph;
      expect(name.runs[0].style).toMatchObject({ font: "Georgia", italic: true, color: "123456" });
      const image = blocks.find((block) => block.kind === "image");
      expect(image?.kind === "image" && image.widthMm).toBe(sourcePhoto.style.w);
      expect(image?.kind === "image" && image.frame?.radiusMm).toBe(sourcePhoto.style.radius);
      expect(model.cv.blocks.some((block) => block.kind === "parallel-flow")).toBe(false);
      expect(buildDossierDocModel(fixture("timeline")).cv.layout.variant).toBe("timeline");
      expect(buildDossierDocModel(fixture("magazin")).cv.layout.variant).toBe("editorial");
      // This is model coverage only; it does not expand the experimental Sidebar gate.
      expect(
        buildDossierDocModel(fixture("sidebar")).cv.blocks.some(
          (block) => block.kind === "parallel-flow",
        ),
      ).toBe(true);
    });
  }
  test("Edge rail and connected corner follow user palette without painting a second masthead", () => {
    const model = buildDossierDocModel(edgeFixture("custom-colors"));
    expect(model.cover.headerShapes?.find((shape) => shape.shape === "path")).toMatchObject({
      xMm: 118,
      yMm: 24,
      widthMm: 92,
      heightMm: 72,
      fill: { color: "D48B35", endColor: "6B948C" },
      semanticText: false,
    });
    for (const part of [model.letter, model.cv]) {
      const rule = part.headerShapes?.find((shape) => shape.heightMm === 1.2);
      expect(rule!.xMm + rule!.widthMm).toBeLessThan(part.page.margins.left);
      expect(part.artwork.some((paint) => paint.id.includes(".band."))).toBe(false);
      expect(
        part.headerShapes?.some(
          (shape) => shape.xMm === 0 && shape.widthMm === 7 && shape.fill?.color === "385D58",
        ),
      ).toBe(true);
      expect(
        part.header
          .flatMap((paragraph) => paragraph.runs)
          .every((run) => run.style.font === "Arial"),
      ).toBe(true);
    }
  });
  test("Gallery keeps the date with the portrait tower and grows a semantic contact row", () => {
    const model = buildDossierDocModel(galleryFixture("contact-long"));
    const rows = walkBlocks(model.cover.blocks).filter(
      (block) => block.kind === "table",
    ) as TableBlock[];
    expect(
      rows.some((table) =>
        table.rows.some((row) => {
          const ids = walkBlocks(row.cells[1] ?? []).map((block) => block.id);
          return ids.includes("cover.ortDatum");
        }),
      ),
    ).toBe(true);
    const contact = walkBlocks(model.cover.blocks).find(
      (block) => block.id === "cover.kontakt",
    ) as Paragraph;
    expect(contact.runs.map((run) => run.text).join("")).toContain("Kontaktzeile 60:");
    expect(rows.some((row) => row.decoration?.fillColor === "D6B7A4")).toBe(true);
    expect(
      model.cover.headerShapes?.some(
        (shape) => shape.xMm === 138 && shape.heightMm === 158 && shape.cornerRadiiMm?.[3] === 24,
      ),
    ).toBe(true);
  });
  test("background visibility, explicit chrome surfaces and unsupported Citrus keep existing gates", () => {
    // The portrait tower belongs to the opening page; unbounded custom text needs quiet continuation paper.
    expect(
      buildDossierDocModel(galleryFixture("cover-long")).cover.headerShapes?.find(
        (shape) => shape.xMm === 138,
      )?.repeat,
    ).toBe("first");
    for (const fixture of [edgeFixture, galleryFixture]) {
      const hidden = fixture("none");
      hidden.cv.design.bgOpacity = 0;
      expect(buildDossierDocModel(hidden).cv.headerShapes).toBeUndefined();
      const custom = fixture("continuation");
      custom.settings.chrome!.shared.headerBackgroundColor = "#123456";
      expect(
        buildDossierDocModel(custom).letter.artwork.some(
          (paint) => paint.id === "letter.artwork.header" && paint.fill.color === "123456",
        ),
      ).toBe(true);
    }
    expect(() => nextTemplate("citrus")).toThrow("has not passed migration gates");
    for (const file of [
      "renderer.ts",
      "build-model.ts",
      "template-composition.ts",
      "cover-composition.ts",
      "template-motifs.ts",
    ])
      expect(readFileSync(`src/lib/docx-next/${file}`, "utf8")).not.toMatch(
        /(?:templateId|template\.id)\s*===\s*["'](?:edge|gallery|citrus)["']/,
      );
  });
});

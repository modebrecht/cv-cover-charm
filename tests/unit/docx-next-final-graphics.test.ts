import { describe, expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { validateDossierDocModel } from "../../src/lib/docx-next/validation";
import { compositePagePaint } from "../../src/lib/docx-next/page-artwork";
import { validateDecoration } from "../../src/lib/docx-next/decoration";
import { walkBlocks, type Paragraph } from "../../src/lib/docx-next/model";
import { GRAPHIC_FIXTURES, graphicCandidateFixture } from "../fixtures/docx-next/graphic-candidate";
import { NEXT_TEMPLATES } from "../../src/lib/docx-next/templates";
import { TEMPLATES } from "../../src/components/cover/types";

describe("completed declarative graphic templates", () => {
  test("registry covers 39 active candidates and excludes retired designs", () => {
    expect(Object.keys(NEXT_TEMPLATES).sort()).toEqual(
      TEMPLATES.filter((t) => !["warm4", "warm5"].includes(t.id))
        .map((t) => t.id)
        .sort(),
    );
    expect(Object.keys(NEXT_TEMPLATES)).toHaveLength(39);
  });
  for (const template of ["neon", "verlauf"])
    test(`${template}: all shared stress models validate and survive portable restoration`, () => {
      for (const kind of [
        ...GRAPHIC_FIXTURES,
        "cover-long",
        "contact-long",
        "hero-long",
      ] as const) {
        const input = graphicCandidateFixture(template, kind);
        const model = buildDossierDocModel(input);
        expect(model.issues).toEqual([]);
        expect(model).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input))));
        validateDossierDocModel(model);
        for (const part of [model.cover, model.letter, model.cv]) {
          expect(part.pagePaintComposition).toBe("single-asset");
          for (const first of [true, false]) {
            const paint = compositePagePaint(part, first);
            if (paint) validateDecoration(paint);
          }
        }
        if (kind === "cover-long")
          expect(
            walkBlocks(model.cover.blocks)
              .flatMap((b) => (b.kind === "paragraph" ? b.runs.map((r) => r.text) : []))
              .join(""),
          ).toContain("Deckblattfortsetzung 50:");
      }
    });
  test("Neon and Verlauf retain translucent authored signatures above their underlay", () => {
    const neon = compositePagePaint(
      buildDossierDocModel(graphicCandidateFixture("neon")).cover,
      true,
    )!;
    expect(neon.layers!.filter((s) => s.id.includes("decor-blob"))).toHaveLength(3);
    expect(neon.layers![0].fill!.color).toBe("0D0B2B");
    const verlauf = compositePagePaint(
      buildDossierDocModel(graphicCandidateFixture("verlauf")).cover,
      true,
    )!;
    expect(verlauf.layers!.findIndex((s) => s.id.includes("motif"))).toBeLessThan(
      verlauf.layers!.findIndex((s) => s.id.includes("decor")),
    );
    expect(verlauf.layers!.some((s) => s.opacity === 0.1)).toBe(true);
  });
  test("saved photo geometry, semantic field styles and independent paper choices prevail", () => {
    for (const template of ["neon", "verlauf"]) {
      const input = graphicCandidateFixture(template, "images", "data:image/png;base64/test");
      input.cover.blocks.find((b) => b.id === "name")!.style.opacity = 1;
      input.settings.fieldStyles = { "cover.fullName": { font: "Arial", color: "123456" } };
      input.cv.design.paperColor = "#E8F0F4";
      input.letter.design.paperColor = "#E8F0F4";
      const model = buildDossierDocModel(input),
        blocks = walkBlocks(model.cover.blocks);
      expect(blocks.find((b) => b.id === "cover.photo")).toMatchObject({
        kind: "image",
        frame: { radiusMm: 999 },
      });
      expect(
        (blocks.find((b) => b.id === "cover.fullName") as Paragraph).runs[0].style,
      ).toMatchObject({ font: "Arial", color: "123456" });
      for (const part of [model.letter, model.cv]) {
        expect(part.artwork.find((a) => a.id.endsWith(".paper"))!.fill.color).toBe("E8F0F4");
        const card = part.headerShapes?.find((s) => s.cornerRadiiMm?.[0] === 6);
        if (card) expect(card.fill!.color).toBe("E8F0F4");
      }
    }
  });
});

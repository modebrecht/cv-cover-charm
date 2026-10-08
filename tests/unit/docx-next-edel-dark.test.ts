import { describe, expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { validateDecoration } from "../../src/lib/docx-next/decoration";
import { walkBlocks, type Paragraph } from "../../src/lib/docx-next/model";
import { EDEL, EDEL_DARK, nextTemplate } from "../../src/lib/docx-next/templates";
import { EDEL_DARK_FIXTURES, edelDarkFixture } from "../fixtures/docx-next/edel-dark";

describe("Edel Dark reuses native Edel composition with its authored sheet palette", () => {
  test("stress snapshots keep complete editable text and deterministic portable models", () => {
    for (const kind of EDEL_DARK_FIXTURES) {
      const input = edelDarkFixture(kind);
      const model = buildDossierDocModel(input);
      expect(model.issues).toEqual([]);
      expect(model).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input))));
      for (const part of [model.cover, model.letter, model.cv])
        for (const shape of part.headerShapes ?? []) validateDecoration(shape);
      if (kind === "cover-long") {
        const text = walkBlocks(model.cover.blocks)
          .flatMap((b) => (b.kind === "paragraph" ? b.runs.map((r) => r.text) : []))
          .join("");
        expect(text).toContain("Deckblattfortsetzung 50:");
      }
    }
  });
  test("dark sheet, contrast and gold frames are distinct from light Edel without new geometry", () => {
    expect(EDEL_DARK.cover).toBe(EDEL.cover);
    expect(EDEL_DARK.pageMotifs).toBe(EDEL.pageMotifs);
    const model = buildDossierDocModel(edelDarkFixture());
    for (const part of [model.cover, model.letter, model.cv])
      expect(part.artwork.find((a) => a.id.endsWith(".paper"))?.fill.color).toBe("171716");
    expect(
      (walkBlocks(model.letter.blocks).find((b) => b.id === "letter.subject") as Paragraph).runs[0]
        .style.color,
    ).toBe("F3EEE5");
    expect(
      model.cover.headerShapes!.filter((s) => !s.fill).every((s) => s.stroke.color === "C7A35A"),
    ).toBe(true);
  });
  test("saved paper and CV motif visibility remain independent of cover palette", () => {
    const input = edelDarkFixture();
    input.cv.design.paperColor = "#314159";
    input.letter.design.paperColor = "#314159";
    const model = buildDossierDocModel(input);
    for (const part of [model.letter, model.cv])
      expect(part.artwork.find((a) => a.id.endsWith(".paper"))?.fill.color).toBe("314159");
    expect(model.cover.artwork.find((a) => a.id.endsWith(".paper"))?.fill.color).toBe("171716");
    expect(buildDossierDocModel(edelDarkFixture("no-motifs")).cv.headerShapes).toBeUndefined();
  });
  test("existing photo frames, explicit field styling and rich native content survive", () => {
    const input = edelDarkFixture("images", "data:image/png;base64/test");
    input.cover.blocks.find((b) => b.id === "name")!.style.opacity = 1;
    input.settings.fieldStyles = {
      "cover.fullName": { font: "Arial", color: "123456", italic: true },
    };
    const blocks = walkBlocks(buildDossierDocModel(input).cover.blocks);
    expect(blocks.find((b) => b.id === "cover.photo")).toMatchObject({
      kind: "image",
      widthMm: 42,
      frame: { radiusMm: 999, heightRatio: 1 },
    });
    expect(
      (blocks.find((b) => b.id === "cover.fullName") as Paragraph).runs[0].style,
    ).toMatchObject({ font: "Arial", color: "123456", italic: true });
    expect(
      walkBlocks(buildDossierDocModel(edelDarkFixture("custom")).letter.blocks).some(
        (b) => b.kind === "table",
      ),
    ).toBe(true);
  });
  test("new gradient candidates explicitly opt into composed decorative paint", () => {
    for (const template of ["neon", "verlauf"])
      expect(nextTemplate(template).pagePaintComposition).toBe("single-asset");
  });
});

import { describe, expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { validateDecoration } from "../../src/lib/docx-next/decoration";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { walkBlocks, type Paragraph } from "../../src/lib/docx-next/model";
import { COLORFUL_FIXTURES, colorfulFixture } from "../fixtures/docx-next/colorful";
describe("Colorful shared geometric composition", () => {
  test("all stress models are deterministic and paint is nonsemantic", () => {
    for (const kind of COLORFUL_FIXTURES) {
      const input = colorfulFixture(kind),
        model = buildDossierDocModel(input);
      expect(model.issues).toEqual([]);
      expect(model).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input))));
      for (const part of [model.cover, model.letter, model.cv])
        for (const shape of part.headerShapes ?? []) validateDecoration(shape);
    }
  });
  test("source rectangles and native metadata cells preserve three independent palette slots", () => {
    const input = colorfulFixture("custom-colors");
    input.cover.colors.tertiary = "#AA66CC";
    const m = buildDossierDocModel(input);
    expect(m.cover.headerShapes!.find((s) => s.id === "cover.decor-middle-field")).toMatchObject({
      xMm: 70,
      yMm: 28,
      widthMm: 45,
      heightMm: 80,
      fill: { color: "AA66CC" },
    });
    expect(m.cover.headerShapes!.find((s) => s.id === "cover.decor-left-field")!.fill!.color).toBe(
      "D48B35",
    );
    expect(m.cover.blocks.find((b) => b.kind === "table" && b.id.endsWith("row:0"))).toMatchObject({
      decoration: { fillColor: "385D58" },
    });
    expect(m.cv.headerShapes!.some((s) => s.yMm === 289 && s.heightMm === 8)).toBe(true);
    expect(buildDossierDocModel(colorfulFixture("no-motifs")).cv.headerShapes).toBeUndefined();
  });
  test("native circular photo, canonical typography and rich tables stay editable", async () => {
    const input = colorfulFixture("images", "data:image/png;base64/test");
    input.settings.fieldStyles = {
      "cover.profession": { font: "Georgia", color: "123456", italic: true },
    };
    const blocks = walkBlocks(buildDossierDocModel(input).cover.blocks);
    expect(blocks.find((b) => b.id === "cover.photo")).toMatchObject({
      kind: "image",
      widthMm: 52,
      align: "right",
      frame: { heightRatio: 1, radiusMm: 999 },
    });
    expect(
      (blocks.find((b) => b.id === "cover.profession") as Paragraph).runs[0].style,
    ).toMatchObject({ font: "Georgia", color: "123456", italic: true });
    expect(
      walkBlocks(buildDossierDocModel(colorfulFixture("custom")).letter.blocks).some(
        (b) => b.kind === "table",
      ),
    ).toBe(true);
    await expect(
      renderDossierDocx(buildDossierDocModel(colorfulFixture("sidebar-blocked"))),
    ).rejects.toThrow("sidebar has not passed");
  });
});

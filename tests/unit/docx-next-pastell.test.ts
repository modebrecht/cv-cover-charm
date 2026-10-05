import { describe, expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { validateDecoration } from "../../src/lib/docx-next/decoration";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { walkBlocks, type Paragraph } from "../../src/lib/docx-next/model";
import { PASTELL_FIXTURES, pastellFixture } from "../fixtures/docx-next/pastell";
import { dossierDefaultFontKey } from "../../src/lib/dossier-theme";
import { WORD_FONTS } from "../../src/lib/docx-next/fonts";
describe("Rahmen shared framed serif composition", () => {
  test("portable stress models are deterministic with validated nonsemantic artwork", () => {
    for (const kind of PASTELL_FIXTURES) {
      const input = pastellFixture(kind),
        m = buildDossierDocModel(input);
      expect(m.issues).toEqual([]);
      expect(m).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input))));
      for (const part of [m.cover, m.letter, m.cv])
        for (const shape of part.headerShapes ?? []) validateDecoration(shape);
    }
  });
  test("secondary frame repeats on all stories without filling native writing surfaces", () => {
    const input = pastellFixture("custom-colors");
    const m = buildDossierDocModel(input);
    for (const part of [m.cover, m.letter, m.cv]) {
      const frames = part.headerShapes!.filter((s) => s.widthMm === 186 && s.heightMm === 273);
      expect(frames).toHaveLength(2);
      expect(frames[0]).toMatchObject({
        xMm: 12,
        yMm: 12,
        stroke: { color: "D48B35", widthMm: 0.4 },
        opacity: 0.35,
        paintLayer: 1,
      });
      expect(frames[0].fill).toBeUndefined();
      expect(frames[1].repeat).toBe("continuation");
    }
    expect(buildDossierDocModel(pastellFixture("no-motifs")).cv.headerShapes).toBeUndefined();
  });
  test("authored contact separator becomes editable-content flow, and explicit styles prevail", () => {
    const input = pastellFixture("images", "data:image/png;base64/test");
    input.settings.fieldStyles = { "cover.profession": { font: "Arial", color: "123456" } };
    const m = buildDossierDocModel(input),
      blocks = walkBlocks(m.cover.blocks);
    expect(m.theme.font).toBe(WORD_FONTS[dossierDefaultFontKey("pastell")].font);
    expect(blocks.find((b) => b.id === "cover.trenner")).toMatchObject({
      kind: "rule",
      strokeWidthMm: 0.265,
    });
    expect(m.cover.headerShapes!.some((s) => s.id === "cover.trenner")).toBe(false);
    expect(blocks.find((b) => b.id === "cover.photo")).toMatchObject({
      kind: "image",
      widthMm: 46,
      align: "center",
      frame: { heightRatio: 1.2, radiusMm: 0 },
    });
    expect(
      (blocks.find((b) => b.id === "cover.profession") as Paragraph).runs[0].style,
    ).toMatchObject({ font: "Arial", color: "123456" });
  });
  test("native long text and tables stay semantic; unsupported Sidebar remains explicit", async () => {
    expect(
      walkBlocks(buildDossierDocModel(pastellFixture("cover-long")).cover.blocks).some((b) =>
        b.id.startsWith("cover.continuation-text"),
      ),
    ).toBe(true);
    expect(
      walkBlocks(buildDossierDocModel(pastellFixture("custom")).letter.blocks).some(
        (b) => b.kind === "table",
      ),
    ).toBe(true);
    await expect(
      renderDossierDocx(buildDossierDocModel(pastellFixture("sidebar-blocked"))),
    ).rejects.toThrow("sidebar has not passed");
  });
});

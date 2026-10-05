import { describe, expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { validateDecoration } from "../../src/lib/docx-next/decoration";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { walkBlocks, type Paragraph } from "../../src/lib/docx-next/model";
import { MODERN_FIXTURES, modernFixture } from "../fixtures/docx-next/modern";
describe("Modern template is independent of the blocked Sidebar layout", () => {
  test("portable stress models retain native fields and valid nonsemantic paint", () => {
    for (const kind of MODERN_FIXTURES) {
      const input = modernFixture(kind),
        model = buildDossierDocModel(input);
      expect(model.issues).toEqual([]);
      expect(model).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input))));
      for (const part of [model.cover, model.letter, model.cv])
        for (const shape of part.headerShapes ?? []) validateDecoration(shape);
    }
  });
  test("authored halo stays quiet and the hero uses semantic fallback when photo/name are absent", () => {
    const input = modernFixture();
    input.cover.data.foto = null;
    input.cover.blocks.find((b) => b.id === "name")!.style.hidden = true;
    const m = buildDossierDocModel(input);
    expect(m.cover.headerShapes!.find((s) => s.id === "cover.modernAccentCircle")).toMatchObject({
      shape: "circle",
      widthMm: 74,
      opacity: 0.1,
    });
    const lead = m.cover.blocks.findIndex((b) => b.id === "cover.heroLead");
    expect(m.cover.blocks[lead]).toMatchObject({ heightMm: 86 });
    expect(m.cover.blocks[lead + 1].id).toBe("cover.profession");
    expect(buildDossierDocModel(modernFixture("no-motifs")).cv.headerShapes).toBeUndefined();
  });
  test("default decorative visibility never suppresses semantic fields or explicit saved intent", () => {
    const input = modernFixture();
    expect(
      buildDossierDocModel(input).cover.headerShapes!.some((s) => s.id === "cover.trenner"),
    ).toBe(false);
    Object.assign(input.cover.blocks.find((b) => b.id === "trenner")!, {
      userStyleKeys: ["hidden"],
    });
    expect(
      buildDossierDocModel(input).cover.headerShapes!.some((s) => s.id === "cover.trenner"),
    ).toBe(true);
    input.cover.blocks.find((b) => b.id === "trenner")!.kind = "text";
    expect(() => buildDossierDocModel(input)).toThrow(
      "decoration visibility requires an authored shape",
    );
  });
  test("compact source-owned dark footer has readable native ink; plain footer remains dark", () => {
    const compact = buildDossierDocModel(modernFixture("compact"));
    const plain = buildDossierDocModel(modernFixture());
    expect(compact.cv.chrome.footerBackground).toBe("111827");
    expect(compact.cv.footer[0].runs[0].style.color).not.toBe("111827");
    expect(plain.cv.footer[0].runs[0].style.color).toBe("18181B");
  });
  test("circle photo and explicit typography remain native, and Sidebar requests fail", async () => {
    const input = modernFixture("images", "data:image/png;base64/test");
    input.settings.fieldStyles = {
      "cover.profession": { font: "Georgia", color: "123456", italic: true },
    };
    const m = buildDossierDocModel(input),
      blocks = walkBlocks(m.cover.blocks);
    expect(blocks.find((b) => b.id === "cover.photo")).toMatchObject({
      kind: "image",
      widthMm: 52,
      align: "center",
      frame: { radiusMm: 999, heightRatio: 1 },
    });
    expect(
      (blocks.find((b) => b.id === "cover.profession") as Paragraph).runs[0].style,
    ).toMatchObject({ font: "Georgia", color: "123456", italic: true });
    await expect(
      renderDossierDocx(buildDossierDocModel(modernFixture("sidebar-blocked"))),
    ).rejects.toThrow("sidebar has not passed");
  });
});

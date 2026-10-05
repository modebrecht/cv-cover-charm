import { describe, expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { validateDecoration } from "../../src/lib/docx-next/decoration";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { paintPng } from "../../src/lib/docx-next/artwork";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { walkBlocks, type Paragraph } from "../../src/lib/docx-next/model";
import { SERIOES_FIXTURES, serioesFixture } from "../fixtures/docx-next/serioes";
describe("Serioes navy stationery and native flowing separators", () => {
  test("portable stress inputs retain deterministic native content and validated paint", () => {
    for (const kind of SERIOES_FIXTURES) {
      const input = serioesFixture(kind),
        model = buildDossierDocModel(input);
      expect(model.issues).toEqual([]);
      expect(model).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input))));
      for (const part of [model.cover, model.letter, model.cv])
        for (const shape of part.headerShapes ?? []) validateDecoration(shape);
    }
  });
  test("source separator follows the hero in native flow with authored thickness and palette", async () => {
    const input = serioesFixture();
    const source = input.cover.blocks.find((b) => b.id === "trenner")!;
    Object.assign(source.style, {
      w: 100,
      x: 35,
      strokeWidth: 0.3,
      color: "#123456",
      opacity: 0.5,
    });
    const model = buildDossierDocModel(input),
      index = model.cover.blocks.findIndex((b) => b.id === "cover.trenner");
    expect(model.cover.blocks[index]).toMatchObject({
      kind: "rule",
      lengthMm: 100,
      indentMm: 15,
      strokeWidthMm: 0.3,
      color: "899AAB",
      keepNext: true,
    });
    expect(model.cover.blocks[index + 1].id).toBe("cover.composition.row:1");
    expect(model.cover.headerShapes!.some((s) => s.id === "cover.trenner")).toBe(false);
    const bytes = await (
      await renderDossierDocx(model, {
        rasterizeDecoration: async () => ({
          bytes: paintPng({ color: "123456" }),
          widthPx: 1,
          heightPx: 1,
          contentType: "image/png",
          extension: "png",
        }),
      })
    ).arrayBuffer();
    const xml = new TextDecoder().decode(
      readZipEntries(new Uint8Array(bytes)).find((e) => e.name === "word/document.xml")!.bytes,
    );
    expect(xml).toContain('w:sz="7"');
    source.style.gradFrom = "primary";
    expect(() => buildDossierDocModel(input)).toThrow("flowing rules require solid");
  });
  test("navy source bands stay editable geometry and interior bands repeat independently", () => {
    const custom = buildDossierDocModel(serioesFixture("custom-colors"));
    expect(custom.cover.headerShapes!.find((s) => s.id === "cover.decor-top-band")).toMatchObject({
      heightMm: 6,
      fill: { color: "385D58" },
    });
    expect(
      custom.cover.headerShapes!.find((s) => s.id === "cover.decor-bottom-band"),
    ).toMatchObject({ yMm: 294, heightMm: 3, fill: { color: "385D58" } });
    for (const kind of ["normal", "none", "continuation"] as const) {
      const m = buildDossierDocModel(serioesFixture(kind));
      expect(m.letter.headerShapes).toHaveLength(6);
      expect(m.cv.headerShapes).toHaveLength(4);
      expect(m.cv.headerShapes![1]).toMatchObject({
        yMm: 294,
        heightMm: 3,
        fill: { color: "94A3B8" },
      });
      expect(m.cv.headerShapes![2].repeat).toBe("continuation");
    }
    expect(buildDossierDocModel(serioesFixture("no-motifs")).cv.headerShapes).toBeUndefined();
  });
  test("authored semantic typography, native photos and rich tables remain independent", () => {
    const input = serioesFixture("images", "data:image/png;base64/test");
    input.settings.fieldStyles = {
      "cover.profession": { font: "Georgia", color: "123456", italic: true },
    };
    const blocks = walkBlocks(buildDossierDocModel(input).cover.blocks);
    expect(
      (blocks.find((b) => b.id === "cover.profession") as Paragraph).runs[0].style,
    ).toMatchObject({ font: "Georgia", color: "123456", italic: true });
    expect(blocks.find((b) => b.id === "cover.photo")).toMatchObject({
      kind: "image",
      widthMm: 46,
      frame: { heightRatio: 1.2 },
    });
    expect(
      walkBlocks(buildDossierDocModel(serioesFixture("custom")).letter.blocks).some(
        (b) => b.kind === "table",
      ),
    ).toBe(true);
  });
  test("unsupported sidebar and out-of-range native rule widths fail explicitly", async () => {
    await expect(
      renderDossierDocx(buildDossierDocModel(serioesFixture("sidebar-blocked"))),
    ).rejects.toThrow("sidebar has not passed");
    const model = buildDossierDocModel(serioesFixture());
    const rule = model.cover.blocks.find((b) => b.kind === "rule")!;
    if (rule.kind !== "rule") throw new Error("missing rule");
    rule.strokeWidthMm = 20;
    await expect(renderDossierDocx(model)).rejects.toThrow("rule geometry");
  });
});

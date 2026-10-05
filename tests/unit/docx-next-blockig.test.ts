import { describe, expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { validateDecoration } from "../../src/lib/docx-next/decoration";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { paintPng } from "../../src/lib/docx-next/artwork";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { walkBlocks, type Paragraph } from "../../src/lib/docx-next/model";
import { BLOCKIG_FIXTURES, blockigFixture } from "../fixtures/docx-next/blockig";
describe("Blockig native modular flow and decorative rail", () => {
  test("multi-page contact uses native shaded cells and editable semantic content", async () => {
    const docx = await renderDossierDocx(buildDossierDocModel(blockigFixture("contact-long")), {
      rasterizeDecoration: async () => ({
        bytes: paintPng({ color: "123456" }),
        widthPx: 1,
        heightPx: 1,
        contentType: "image/png",
        extension: "png",
      }),
    });
    const entries = readZipEntries(new Uint8Array(await docx.arrayBuffer()));
    const xml = new TextDecoder().decode(
      entries.find((part) => part.name === "word/document.xml")!.bytes,
    );
    expect(xml).toContain('w:fill="1F2937"');
    expect(xml).toContain('w:val="cover.composition.row:2.cell:0.surface"');
    expect(xml).toContain("Kontaktzeile 60:");
    expect(xml).not.toContain("txbxContent");
  });
  test("stress models are deterministic and never request a sidebar", () => {
    for (const kind of BLOCKIG_FIXTURES) {
      const input = blockigFixture(kind),
        model = buildDossierDocModel(input);
      expect(model.issues).toEqual([]);
      expect(model.cv.layout.mode).not.toBe("sidebar");
      expect(model).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input))));
      for (const part of [model.cover, model.letter, model.cv])
        for (const shape of part.headerShapes ?? []) validateDecoration(shape);
    }
  });
  test("authored contact rectangle becomes a native cell; source color/opacity and hidden paint are honored", () => {
    const input = blockigFixture();
    const source = input.cover.blocks.find((b) => b.id === "decor-bottom-block")!;
    source.style.fill = "#123456";
    source.style.opacity = 0.5;
    const m = buildDossierDocModel(input),
      blocks = walkBlocks(m.cover.blocks);
    expect(m.cover.headerShapes!.some((s) => s.id === "cover.decor-bottom-block")).toBe(false);
    expect(blocks.find((b) => b.id === "cover.composition.row:2.cell:0.surface")).toMatchObject({
      kind: "table",
      decoration: { fillColor: "8394A4", paddingXMm: 3 },
    });
    source.style.hidden = true;
    expect(
      walkBlocks(buildDossierDocModel(input).cover.blocks).some(
        (b) => b.id.endsWith("cell:0.surface") && b.id.includes("row:2"),
      ),
    ).toBe(false);
    expect(m.letter.headerShapes![0]).toMatchObject({ xMm: 0, widthMm: 19, heightMm: 297 });
    expect(m.cv.headerShapes![1]).toMatchObject({
      yMm: 46,
      heightMm: 72,
      fill: { color: "F97316" },
    });
  });
  test("grouped hero lead follows actual photo presence and source typography stays native", () => {
    const input = blockigFixture("images", "data:image/png;base64/test");
    input.settings.fieldStyles = {
      "cover.profession": { font: "Georgia", color: "123456", italic: true },
    };
    const m = buildDossierDocModel(input),
      blocks = walkBlocks(m.cover.blocks);
    expect(m.cover.blocks.find((b) => b.id === "cover.heroLead")).toMatchObject({ heightMm: 20 });
    expect(blocks.find((b) => b.id === "cover.photo")).toMatchObject({
      widthMm: 48,
      frame: { heightRatio: 1, radiusMm: 0 },
    });
    expect(
      (blocks.find((b) => b.id === "cover.profession") as Paragraph).runs[0].style,
    ).toMatchObject({ font: "Georgia", color: "123456", italic: true });
    expect(
      buildDossierDocModel(blockigFixture()).cover.blocks.find((b) => b.id === "cover.heroLead"),
    ).toMatchObject({ heightMm: 68 });
  });
  test("unsupported native surfaces and explicit sidebar requests fail visibly", async () => {
    const input = blockigFixture(),
      source = input.cover.blocks.find((b) => b.id === "decor-bottom-block")!;
    source.style.gradFrom = "primary";
    expect(() => buildDossierDocModel(input)).toThrow("solid unbordered rectangles");
    source.style.gradFrom = undefined;
    source.shape = "circle";
    expect(() => buildDossierDocModel(input)).toThrow("solid unbordered rectangles");
    input.cover.blocks = input.cover.blocks.filter((b) => b.id !== source.id);
    expect(() => buildDossierDocModel(input)).toThrow("missing authored cover surface");
    await expect(
      renderDossierDocx(buildDossierDocModel(blockigFixture("sidebar-blocked"))),
    ).rejects.toThrow("sidebar has not passed");
  });
});

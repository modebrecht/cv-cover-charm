import { describe, expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { validateDecoration } from "../../src/lib/docx-next/decoration";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { walkBlocks, type Paragraph } from "../../src/lib/docx-next/model";
import { KLASSISCH_FIXTURES, klassischFixture } from "../fixtures/docx-next/klassisch";
describe("Editorial native hero and outline stationery", () => {
  test("portable stress inputs preserve native text and validated paint", () => {
    for (const kind of KLASSISCH_FIXTURES) {
      const input = klassischFixture(kind),
        model = buildDossierDocModel(input);
      expect(model.issues).toEqual([]);
      expect(model).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input))));
      for (const part of [model.cover, model.letter, model.cv])
        for (const shape of part.headerShapes ?? []) validateDecoration(shape);
    }
  });
  test("outlined frames repeat without filling the editable writing surface", () => {
    for (const kind of ["normal", "none", "continuation", "cover-long"] as const) {
      const model = buildDossierDocModel(klassischFixture(kind));
      for (const part of [model.cover, model.letter, model.cv]) {
        const frames = part.headerShapes!.filter((s) => s.widthMm === 190);
        expect(frames).toHaveLength(2);
        expect(frames[0]).toMatchObject({
          shape: "rect",
          xMm: 10,
          yMm: 10,
          heightMm: 277,
          paintLayer: 1,
        });
        expect(frames[0].fill).toBeUndefined();
        expect(frames[1].repeat).toBe("continuation");
      }
    }
    expect(buildDossierDocModel(klassischFixture("no-motifs")).cv.headerShapes).toBeUndefined();
  });
  test("no-photo spacing precedes the configured semantic hero, independently of name visibility", () => {
    const input = klassischFixture();
    input.cover.data.foto = null;
    input.cover.blocks.find((b) => b.id === "name")!.style.hidden = true;
    const model = buildDossierDocModel(input);
    const lead = model.cover.blocks.findIndex((b) => b.id === "cover.heroLead");
    expect(lead).toBeGreaterThanOrEqual(0);
    expect(model.cover.blocks[lead]).toMatchObject({ kind: "spacer", heightMm: 92 });
    expect(model.cover.blocks[lead + 1].id).toBe("cover.profession");
    expect(walkBlocks(model.cover.blocks).some((b) => b.id === "cover.profession")).toBe(true);
  });
  test("saved field styles, photos and rich tables stay native; unsupported sidebar fails", async () => {
    const input = klassischFixture("images", "data:image/png;base64/test");
    input.settings.fieldStyles = {
      "cover.profession": { font: "Arial", color: "123456", italic: false },
    };
    const model = buildDossierDocModel(input);
    expect(
      (walkBlocks(model.cover.blocks).find((b) => b.id === "cover.profession") as Paragraph).runs[0]
        .style,
    ).toMatchObject({ font: "Arial", color: "123456", italic: false });
    expect(walkBlocks(model.cover.blocks).some((b) => b.kind === "image")).toBe(true);
    expect(
      walkBlocks(buildDossierDocModel(klassischFixture("custom")).letter.blocks).some(
        (b) => b.kind === "table",
      ),
    ).toBe(true);
    await expect(
      renderDossierDocx(buildDossierDocModel(klassischFixture("sidebar-blocked"))),
    ).rejects.toThrow("sidebar has not passed");
  });
});

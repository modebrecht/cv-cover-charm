import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { walkBlocks, type Paragraph } from "../../src/lib/docx-next/model";
import { HORIZON_FIXTURES, horizonFixture } from "../fixtures/docx-next/horizon";
import { HORIZON } from "../../src/lib/docx-next/templates";
describe("Horizon shared gradient stationery", () => {
  test("all cases preserve portable identities and deterministic native models", () => {
    for (const kind of HORIZON_FIXTURES) {
      const input = horizonFixture(kind),
        model = buildDossierDocModel(input);
      expect(model.issues).toEqual([]);
      expect(model).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input))));
      expect(model.templateId).toBe("horizon");
    }
  });
  test("horizontal gradients retain palette roles and independent scoped ownership", () => {
    const normal = buildDossierDocModel(horizonFixture());
    expect(
      (walkBlocks(normal.cover.blocks).find((b) => b.id === "cover.fullName") as Paragraph).align,
    ).toBe("center");
    expect(normal.cover.headerShapes![0]).toMatchObject({
      cornerRadiiMm: [0, 0, 72, 0],
      fill: { color: "11233F", endColor: "2F6DFF", angleDeg: 90 },
    });
    const none = buildDossierDocModel(horizonFixture("none"));
    for (const part of [none.cv, none.letter]) {
      expect(part.headerShapes?.map((s) => s.repeat)).toEqual(["first", "continuation"]);
      expect(part.headerShapes?.every((s) => s.fill?.angleDeg === 90)).toBe(true);
    }
    const custom = buildDossierDocModel(horizonFixture("custom-colors"));
    expect(custom.cover.headerShapes![0].fill).toMatchObject({
      color: "385D58",
      endColor: "D48B35",
    });
    const hidden = horizonFixture("none");
    hidden.cv.design.bgOpacity = 0;
    expect(buildDossierDocModel(hidden).cv.headerShapes).toBeUndefined();
  });
  test("photo, letter-rich content, lists and CV date tracks remain native and field-addressable", () => {
    const photo = buildDossierDocModel(horizonFixture("images", "data:image/png;base64/test"));
    expect(photo.cover.blocks.find((b) => b.id === "cover.photo")).toMatchObject({
      kind: "image",
      align: "right",
    });
    const input = horizonFixture("custom");
    input.settings.fieldStyles = { "cover.fullName": { color: "123456", italic: true } };
    const model = buildDossierDocModel(input);
    expect(
      (walkBlocks(model.cover.blocks).find((b) => b.id === "cover.fullName") as Paragraph).runs[0]
        .style,
    ).toMatchObject({ color: "123456", italic: true });
    expect(walkBlocks(model.letter.blocks).some((b) => b.kind === "table")).toBe(true);
    expect(walkBlocks(model.letter.blocks).some((b) => b.kind === "paragraph" && b.list)).toBe(
      true,
    );
    expect(walkBlocks(model.cv.blocks).some((b) => b.kind === "entry")).toBe(true);
  });
  test("all three candidate templates remain independent of the single renderer", async () => {
    await expect(
      renderDossierDocx(buildDossierDocModel(horizonFixture("sidebar-blocked"))),
    ).rejects.toThrow("sidebar has not passed");
    for (const file of [
      "renderer.ts",
      "build-model.ts",
      "decoration.ts",
      "template-composition.ts",
      "template-motifs.ts",
      "cover-composition.ts",
    ])
      expect(readFileSync(`src/lib/docx-next/${file}`, "utf8")).not.toMatch(
        /(?:cove|glow|horizon|prism)["']/i,
      );
    expect(JSON.stringify(HORIZON)).not.toContain("<w:");
  });
});

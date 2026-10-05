import { describe, test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { validateDecoration, decorationAssetKey } from "../../src/lib/docx-next/decoration";
import { COVE_FIXTURES, coveFixture } from "../fixtures/docx-next/cove";
import { COVE } from "../../src/lib/docx-next/templates";
describe("Cove shared asymmetric stationery", () => {
  test("fixtures retain semantic identities and portable deterministic data", () => {
    for (const kind of COVE_FIXTURES) {
      const input = coveFixture(kind),
        model = buildDossierDocModel(input);
      expect(model.issues).toEqual([]);
      expect(model).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input))));
      expect(model.templateId).toBe("cove");
    }
  });
  test("independent rectangle corners survive validation and asset identity", () => {
    const model = buildDossierDocModel(coveFixture());
    expect(model.cover.headerShapes?.map((s) => s.cornerRadiiMm)).toEqual([
      [0, 0, 46, 0],
      [0, 0, 0, 48],
    ]);
    const shape = model.cover.headerShapes![1];
    validateDecoration(shape);
    expect(() => validateDecoration({ ...shape, cornerRadiiMm: [0, 0, -1, 0] })).toThrow("corners");
    expect(() => validateDecoration({ ...shape, shape: "circle" })).toThrow("corners");
    expect(decorationAssetKey(shape)).not.toBe(
      decorationAssetKey({ ...shape, cornerRadiiMm: [0, 0, 48, 0] }),
    );
  });
  test("disabled header has quiet paint, while first/contact and continuation own one bay", () => {
    const none = buildDossierDocModel(coveFixture("none"));
    expect(none.letter.headerShapes?.map((s) => s.heightMm)).toEqual([8, 18, 8, 18]);
    expect(none.letter.artwork.some((a) => a.id.includes(".band."))).toBe(false);
    const hidden = coveFixture("none");
    hidden.cv.design.bgOpacity = 0;
    expect(buildDossierDocModel(hidden).cv.headerShapes).toBeUndefined();
    const continued = buildDossierDocModel(coveFixture("continuation"));
    for (const part of [continued.letter, continued.cv]) {
      expect(part.headerShapes?.map((s) => s.repeat)).toEqual(["first", "continuation"]);
      expect(new Set(part.headerShapes?.map((s) => s.id)).size).toBe(part.headerShapes?.length);
      expect(part.headerShapes?.every((s) => s.fill?.color === "E36D5A")).toBe(true);
      expect(part.headerShapes?.[0].heightMm).toBeGreaterThan(part.headerShapes?.[1].heightMm ?? 0);
    }
  });
  test("sidebar is explicit and template descriptors cannot inject renderer code", async () => {
    await expect(
      renderDossierDocx(buildDossierDocModel(coveFixture("sidebar-blocked"))),
    ).rejects.toThrow("sidebar has not passed");
    for (const file of [
      "renderer.ts",
      "build-model.ts",
      "template-composition.ts",
      "decoration.ts",
    ])
      expect(readFileSync(`src/lib/docx-next/${file}`, "utf8")).not.toMatch(
        /(?:cove|glow|horizon)["']/i,
      );
    expect(JSON.stringify(COVE)).not.toContain("<w:");
  });
});

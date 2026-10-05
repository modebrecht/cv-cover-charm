import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import {
  decorationPathSegments,
  shapePathPoints,
  validateDecoration,
} from "../../src/lib/docx-next/decoration";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { walkBlocks } from "../../src/lib/docx-next/model";
import { SUNRISE_FIXTURES, sunriseFixture } from "../fixtures/docx-next/sunrise";

describe("shared cubic contours and Sunrise candidate", () => {
  test("bounded absolute cubic geometry fails explicitly for unsupported or malformed paths", () => {
    expect(decorationPathSegments("M0 20 C20 0 80 0 100 20 L100 100 L0 100")).toHaveLength(4);
    expect(decorationPathSegments("M0 0 L100 100")).toEqual([
      { command: "M", coordinates: [0, 0] },
      { command: "L", coordinates: [100, 100] },
    ]);
    for (const path of [
      "C0 0 50 50 100 100",
      "M0 0 C1 2 3 4",
      "M0 0 C1 2 3 4 101 5",
      "M0 0 C1 2 3 4 5 6 Z",
      "M0 0 C1 2 3 4 5 6 M0 0",
      "M0 0 Q50 50 100 0",
      "M0 0 CNaN 2 3 4 5 6",
      "<text>User name</text>",
    ])
      expect(() => decorationPathSegments(path)).toThrow("invalid decorative path");
    // The app's freehand point grammar stays unchanged.
    expect(() => shapePathPoints("M0 0 C1 2 3 4 5 6")).toThrow("invalid decorative path");
  });
  test("all portable stress scenarios preserve native semantic identities and deterministic models", () => {
    for (const kind of SUNRISE_FIXTURES) {
      const input = sunriseFixture(kind),
        model = buildDossierDocModel(input);
      expect(model.issues).toEqual([]);
      expect(model).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input))));
      for (const shape of model.cover.headerShapes ?? []) validateDecoration(shape);
    }
  });
  test("both broad fields use generic palette-bound curves while native user content remains editable", () => {
    const model = buildDossierDocModel(sunriseFixture("custom-colors"));
    expect(model.cover.headerShapes?.[0]).toMatchObject({
      shape: "path",
      fill: { color: "385D58", endColor: "D48B35" },
      semanticText: false,
    });
    expect(model.cover.headerShapes?.[2]).toMatchObject({
      shape: "path",
      yMm: 236,
      heightMm: 82,
      opacity: 0.92,
    });
    expect(
      walkBlocks(model.cover.blocks).some(
        (b) => b.id === "cover.fullName" && b.kind === "paragraph",
      ),
    ).toBe(true);
    const custom = buildDossierDocModel(sunriseFixture("custom"));
    expect(walkBlocks(custom.letter.blocks).some((b) => b.kind === "table")).toBe(true);
    expect(buildDossierDocModel(sunriseFixture("none")).letter.headerShapes).toHaveLength(6);
    const hidden = sunriseFixture("none");
    hidden.cv.design.bgOpacity = 0;
    expect(buildDossierDocModel(hidden).cv.headerShapes).toBeUndefined();
  });
  test("authored custom contact surfaces take precedence and sidebar remains explicitly blocked", async () => {
    const input = sunriseFixture("continuation");
    input.settings.chrome!.shared.headerBackgroundColor = "#123456";
    expect(buildDossierDocModel(input).letter.headerShapes).toBeUndefined();
    await expect(
      renderDossierDocx(buildDossierDocModel(sunriseFixture("sidebar-blocked"))),
    ).rejects.toThrow("sidebar has not passed");
    for (const file of [
      "renderer.ts",
      "build-model.ts",
      "decoration.ts",
      "template-composition.ts",
      "cover-composition.ts",
      "template-motifs.ts",
    ])
      expect(readFileSync(`src/lib/docx-next/${file}`, "utf8")).not.toMatch(
        /(?:sunrise|forestFlow|violetPulse)["']/,
      );
  });
});

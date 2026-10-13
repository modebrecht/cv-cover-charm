import { describe, expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { NEXT_TEMPLATES } from "../../src/lib/docx-next/templates";
import { walkBlocks } from "../../src/lib/docx-next/model";
import { createFontResolver, fontDefinition, WORD_FONTS } from "../../src/lib/docx-next/fonts";
import {
  fontMatrixFixture,
  MATRIX_ALTERNATIVES,
  MATRIX_CASES,
} from "../fixtures/docx-next/font-matrix";

describe("39-template DOCX Next font acceptance", () => {
  for (const template of Object.keys(NEXT_TEMPLATES))
    test(`${template}: default, supplied, fallback, rich/chrome/long/sidebar ownership and immutable JSON`, () => {
      for (const scenario of MATRIX_CASES) {
        const input = fontMatrixFixture(template, scenario);
        const before = JSON.stringify(input);
        const model = buildDossierDocModel(input);
        expect(JSON.stringify(input)).toBe(before);
        expect(buildDossierDocModel(JSON.parse(before))).toEqual(model);
        expect(model.fonts.embedding).toBe("disabled");
        const supplied = scenario.startsWith("fallback-") || scenario.endsWith("-fallback");
        const runs = [model.cover, model.letter, model.cv].flatMap((part) =>
          walkBlocks([
            ...part.blocks,
            ...part.header,
            ...(part.firstHeader ?? []),
            ...part.footer,
          ]).flatMap((b) => (b.kind === "paragraph" ? b.runs : [])),
        );
        for (const run of runs) {
          expect(fontDefinition(run.style.font).name).toBe(run.style.font);
          if (supplied) expect(MATRIX_ALTERNATIVES).toContain(run.style.font);
        }
        if (scenario.startsWith("mixed")) {
          for (const [key, value] of Object.entries(WORD_FONTS)) {
            const title = runs.find((r) => r.fieldId === `cv.entry.schule:font-${key}.title`)!;
            expect(title.style.font).toBe(supplied ? value.fallback : value.font);
            expect(title.style.bold).toBe(true);
            expect(title.style.italic).toBe(true);
          }
          const body = runs.filter((r) => r.id.startsWith("letter.body."));
          expect(body.length).toBeGreaterThan(0);
          expect(
            body.every((r) => r.style.font === (supplied ? "Liberation Serif" : "Times New Roman")),
          ).toBe(true);
          expect(body.some((r) => r.style.bold && r.style.italic)).toBe(true);
          expect(runs.find((r) => r.fieldId === "letter.header.title")?.style.font).toBe(
            supplied ? "Liberation Serif" : "Georgia",
          );
          expect(runs.find((r) => r.fieldId === "cv.footer.title")?.style.font).toBe(
            supplied ? "Liberation Mono" : "Courier New",
          );
        }
      }
    });
  test("unknown target availability never selects an assumed installed alternative", () => {
    const resolver = createFontResolver();
    for (const value of Object.values(WORD_FONTS))
      expect(resolver.resolve(value.font)).toBe(value.font);
    expect(resolver.result().availability).toBe("target-application");
    expect(resolver.result().selections.every((s) => s.reason === "requested")).toBe(true);
  });
  test("case-insensitive supplied inventory, absent primary+alternative, and fallback metadata are explicit", () => {
    expect(
      createFontResolver({ availableFonts: ["  liberation sans  "] }).resolve("Trebuchet MS"),
    ).toBe("Liberation Sans");
    for (const value of Object.values(WORD_FONTS))
      expect(() => createFontResolver({ availableFonts: [] }).resolve(value.font)).toThrow(
        "no available font",
      );
    expect(fontDefinition("DejaVu Sans")).toMatchObject({ family: "swiss", pitch: "variable" });
    expect(fontDefinition("Liberation Mono")).toMatchObject({ family: "modern", pitch: "fixed" });
    expect(fontDefinition("Liberation Serif")).toMatchObject({
      family: "roman",
      pitch: "variable",
    });
  });
});

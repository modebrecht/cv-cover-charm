import { describe, expect, test } from "bun:test";
import "../../src/components/cover/fresh-templates";
import { TEMPLATES, type TemplateId } from "../../src/components/cover/types";
import { cvFrameFor } from "../../src/components/cv/archetype";
import { cvPalette, readable } from "../../src/components/cv/palette";
import { familyForTemplate } from "../../src/lib/dossier-family";

const colorsFor = (id: string) => {
  const template = TEMPLATES.find(({ id: candidate }) => (candidate as string) === id);
  if (!template) throw new Error(`Missing template ${id}`);
  return Object.fromEntries(template.slots.map((slot) => [slot.key, slot.default]));
};

describe("Edel light/dark dossier contract", () => {
  test("registers Edel Dark after the established template catalogue", () => {
    const dark = TEMPLATES.find(({ id }) => (id as string) === "edelDark");
    expect(dark?.name).toBe("Edel Dark");
    expect(TEMPLATES.at(-1)?.id as string).toBe("edelDark");
  });

  test("makes Edel the warm-white counterpart to the true dark variant", () => {
    expect(colorsFor("edel")).toEqual({
      bg: "#fcfbf8",
      ink: "#181817",
      accent: "#8d6b2d",
    });
    expect(colorsFor("edelDark")).toEqual({
      bg: "#171716",
      sheet: "#171716",
      ink: "#f3eee5",
      accent: "#c7a35a",
    });

    const light = cvPalette(colorsFor("edel"));
    const dark = cvPalette(colorsFor("edelDark"));
    expect(light.paper).toBe("#ffffff");
    expect(dark.paper).toBe("#171716");
    expect(readable(colorsFor("edel").ink, colorsFor("edel").bg, 7)).toBe(true);
    expect(readable(colorsFor("edel").accent, colorsFor("edel").bg, 4.5)).toBe(true);
    expect(readable(dark.ink, dark.paper, 7)).toBe(true);
    expect(readable(dark.accent, dark.paper, 4.5)).toBe(true);
  });

  test("shares Edel geometry and executive typography family", () => {
    const dark = "edelDark" as TemplateId;
    expect(cvFrameFor(dark)).toEqual(cvFrameFor("edel"));
    expect(cvFrameFor(dark).borderDouble).toBe(true);
    expect(familyForTemplate(dark)).toBe("executive");
  });
});

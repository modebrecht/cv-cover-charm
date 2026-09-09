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

describe("Edel Dark dossier contract", () => {
  test("is registered after the established template catalogue", () => {
    const dark = TEMPLATES.find(({ id }) => (id as string) === "edelDark");
    expect(dark?.name).toBe("Edel Dark");
    expect(TEMPLATES.at(-1)?.id as string).toBe("edelDark");
  });

  test("keeps Edel light inside while Edel Dark owns a true dark writing surface", () => {
    const edel = cvPalette(colorsFor("edel"));
    const dark = cvPalette(colorsFor("edelDark"));

    expect(edel.paper).toBe("#ffffff");
    expect(dark.paper).toBe("#171716");
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

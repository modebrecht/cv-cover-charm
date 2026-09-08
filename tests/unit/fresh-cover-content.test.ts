import { describe, expect, test } from "bun:test";
import { buildBlocks } from "../../src/components/cover/layouts";
import { FRESH_TEMPLATE_IDS } from "../../src/components/cover/fresh-template-registry";
import { DEMO_DATA, TEMPLATES, lineText, type TemplateId } from "../../src/components/cover/types";

function slotsFor(template: TemplateId) {
  const definition = TEMPLATES.find(({ id }) => id === template);
  if (!definition) throw new Error(`Missing template definition for ${template}`);
  return definition.slots;
}

const candidateData = {
  ...DEMO_DATA,
  eyebrow: "Hallo, schön Sie kennenzulernen",
  kicker: "Bewerbung um eine Lehrstelle als",
};

describe("Fresh cover content contract", () => {
  test("all templates 21-38 use a stable cover label instead of leaking legacy eyebrow copy", () => {
    for (const id of FRESH_TEMPLATE_IDS) {
      const template = id as TemplateId;
      const blocks = buildBlocks(template, candidateData, [], {}, slotsFor(template));
      const eyebrow = blocks.find((block) => block.id === "eyebrow");

      expect(eyebrow?.lines.map(lineText)).toEqual(["Bewerbung"]);
      expect(eyebrow?.lines.map(lineText).join(" ")).not.toContain("kennenzulernen");
    }
  });

  test("all templates 21-38 keep application kicker and profession on separate logical lines", () => {
    for (const id of FRESH_TEMPLATE_IDS) {
      const template = id as TemplateId;
      const blocks = buildBlocks(template, candidateData, [], {}, slotsFor(template));
      const profession = blocks.find((block) => block.id === "beruf");

      expect(profession?.lines).toHaveLength(2);
      expect(profession?.lines.map(lineText)).toEqual([
        "Bewerbung um eine Lehrstelle als",
        "Informatiker/in EFZ",
      ]);
      expect(profession?.style.maxLines).toBeGreaterThanOrEqual(3);
    }
  });

  test("legacy templates retain their editable eyebrow and established Warm profession line", () => {
    const blocks = buildBlocks("freundlich", candidateData, [], {}, slotsFor("freundlich"));
    const eyebrow = blocks.find((block) => block.id === "eyebrow");
    const profession = blocks.find((block) => block.id === "beruf");

    expect(eyebrow?.lines.map(lineText)).toEqual(["Hallo, schön Sie kennenzulernen"]);
    expect(profession?.lines).toHaveLength(1);
    expect(profession?.lines.map(lineText)).toEqual([
      "Bewerbung um eine Lehrstelle als Informatiker/in EFZ",
    ]);
  });
});

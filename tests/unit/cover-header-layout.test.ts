import { describe, expect, test } from "bun:test";
import { buildBlocks } from "../../src/components/cover/layouts";
import { DEMO_DATA, TEMPLATES } from "../../src/components/cover/types";

function templateFor(id: string) {
  const template = TEMPLATES.find((candidate) => candidate.id === id);
  if (!template) throw new Error(`Missing cover template: ${id}`);
  return template;
}

function eyebrowX(id: string, xOverride?: number) {
  const template = templateFor(id);
  const blocks = buildBlocks(
    template.id,
    DEMO_DATA,
    [],
    xOverride === undefined ? {} : { eyebrow: { x: xOverride } },
    template.slots,
  );
  const eyebrow = blocks.find((block) => block.id === "eyebrow");
  if (!eyebrow) throw new Error(`Missing eyebrow block: ${id}`);
  return eyebrow.style.x;
}

describe("cover header geometry", () => {
  test("Brief and Modern share the corrected 20mm application-label margin", () => {
    expect(eyebrowX("modern")).toBe(20);
    expect(eyebrowX("brief")).toBe(20);
  });

  test("manual application-label positioning still wins", () => {
    expect(eyebrowX("modern", 37)).toBe(37);
    expect(eyebrowX("brief", 37)).toBe(37);
  });

  test("every registered template keeps its header block inside the A4 page width", () => {
    for (const template of TEMPLATES) {
      const blocks = buildBlocks(template.id, DEMO_DATA, [], {}, template.slots);
      const eyebrow = blocks.find((block) => block.id === "eyebrow");
      expect(eyebrow, template.name).toBeDefined();
      expect(eyebrow!.style.x, template.name).toBeGreaterThanOrEqual(0);
      expect(eyebrow!.style.x + eyebrow!.style.w, template.name).toBeLessThanOrEqual(210);
    }
  });
});

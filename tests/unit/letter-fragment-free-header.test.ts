import { describe, expect, test } from "bun:test";
import "../../src/components/cover/fresh-templates";
import { letterPageGeometry } from "../../src/components/letter/layout-system";
import {
  DEMO_LETTER,
  defaultLetterColors,
  emptyLetterDesign,
  type LetterTemplateId,
} from "../../src/components/letter/types";

function compactGeometry(template: LetterTemplateId) {
  return letterPageGeometry(DEMO_LETTER, {
    ...emptyLetterDesign(),
    template,
    colors: defaultLetterColors(template),
    headerMode: "compact",
    footerMode: "compact",
  });
}

describe("fragment-free compact letter headers", () => {
  test("gallery designs 00-03 never render detached compact header fragments", () => {
    for (const template of ["brief", "klassisch", "modern"] as const) {
      const geometry = compactGeometry(template);
      expect(geometry.header.compactAccent.width).toBe(0);
      expect(geometry.header.compactAccent.height).toBe(0);
      expect(geometry.header.compactLineTop).toBe(0);
      expect(geometry.header.compactPill).toBeNull();
    }
  });

  test("the fix stays scoped and does not flatten unrelated compact header families", () => {
    const warm = compactGeometry("freundlich");
    expect(warm.header.compactTopBandHeight).toBeGreaterThan(0);
    expect(warm.header.compactAccent.width).toBeGreaterThan(0);

    const edel = compactGeometry("edel");
    expect(edel.header.compactPill).not.toBeNull();
    expect(edel.header.compactAccent.width).toBeGreaterThan(0);
  });
});

import { describe, expect, test } from "bun:test";
import "../../src/components/cover/fresh-templates";
import { TEMPLATES } from "../../src/components/cover/types";
import { letterPageGeometry } from "../../src/components/letter/layout-system";
import {
  DEMO_LETTER,
  defaultLetterColors,
  emptyLetterDesign,
  type LetterTemplateId,
} from "../../src/components/letter/types";

const ALL_LETTER_TEMPLATES = Array.from(
  new Set<LetterTemplateId>([
    "brief",
    ...TEMPLATES.map((template) => template.id as LetterTemplateId),
  ]),
);

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
  test("every selectable design globally forbids detached compact header fragments", () => {
    expect(ALL_LETTER_TEMPLATES.length).toBeGreaterThan(30);

    for (const template of ALL_LETTER_TEMPLATES) {
      const geometry = compactGeometry(template);
      expect(geometry.header.compactAccent.width).toBe(0);
      expect(geometry.header.compactAccent.height).toBe(0);
      expect(geometry.header.compactLineTop).toBe(0);
      expect(geometry.header.compactPill).toBeNull();
    }
  });

  test("compact mode keeps only coherent edge-anchored structural chrome", () => {
    let sawSidebar = false;
    let sawBand = false;

    for (const template of ALL_LETTER_TEMPLATES) {
      const geometry = compactGeometry(template);

      if (geometry.archetype === "sidebar") {
        sawSidebar = true;
        expect(geometry.header.sidebarWidth).toBeGreaterThan(0);
      } else {
        expect(geometry.header.sidebarWidth).toBe(0);
      }

      if (geometry.archetype === "band") {
        sawBand = true;
        expect(geometry.header.compactTopBandHeight).toBeGreaterThan(0);
      } else {
        expect(geometry.header.compactTopBandHeight).toBe(0);
      }
    }

    expect(sawSidebar).toBe(true);
    expect(sawBand).toBe(true);
  });
});

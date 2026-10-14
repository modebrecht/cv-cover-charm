import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TEMPLATES } from "../../src/components/cover/types";
import { LetterCanvas } from "../../src/components/letter/LetterCanvas";
import {
  resolveLetterPalette,
  resolveLetterPaperColor,
} from "../../src/components/letter/letter-paper";
import {
  DEMO_LETTER,
  defaultLetterColors,
  emptyLetterDesign,
  normalizeLetterDesign,
  type LetterTemplateId,
} from "../../src/components/letter/types";
import { readable } from "../../src/components/cv/palette";

const CUSTOM_PAPER = "#dcefff";

describe("template-independent motivation-letter paper color", () => {
  test("renders the chosen paper color for every selectable template", () => {
    for (const { id } of TEMPLATES) {
      const template = id as LetterTemplateId;
      const design = {
        ...emptyLetterDesign(),
        template,
        colors: defaultLetterColors(template),
        paperColor: CUSTOM_PAPER,
      };
      const markup = renderToStaticMarkup(
        createElement(LetterCanvas, { data: DEMO_LETTER, design }),
      );

      expect(markup).toContain(`data-letter-paper-color="${CUSTOM_PAPER}"`);
      expect(markup).toContain(`data-letter-paper-override="${CUSTOM_PAPER}"`);
      expect(markup).toContain(`background-color:${CUSTOM_PAPER}`);
    }
  });

  test("automatically keeps body text readable on a dark custom paper", () => {
    const design = {
      ...emptyLetterDesign(),
      paperColor: "#171716",
    };
    const palette = resolveLetterPalette(design);

    expect(resolveLetterPaperColor(design)).toBe("#171716");
    expect(readable(palette.ink, palette.paper, 7)).toBe(true);
  });

  test("automatic Letter ink ignores CV-only overrides on the authored writing surface", () => {
    const design = {
      ...emptyLetterDesign(),
      template: "modern" as const,
      colors: {
        sheet: "#171716",
        ink: "#111111",
        cvInk: "#111111",
        cvMuted: "#171716",
        cvHeading: "#111111",
      },
    };
    const palette = resolveLetterPalette(design);
    expect(palette.paper).toBe(resolveLetterPaperColor(design));
    expect(readable(palette.ink, palette.paper, 7)).toBe(true);
    expect(readable(palette.muted, palette.paper)).toBe(true);
    expect(resolveLetterPalette({ ...design, textColor: "#bcdfff" }).ink).toBe("#bcdfff");
    expect(design.colors.cvInk).toBe("#111111");
  });

  test("lets a custom text color override the automatic body color", () => {
    const design = {
      ...emptyLetterDesign(),
      paperColor: "#fff4cc",
      textColor: "#5b214e",
    };
    const palette = resolveLetterPalette(design);
    const markup = renderToStaticMarkup(createElement(LetterCanvas, { data: DEMO_LETTER, design }));

    expect(palette.ink).toBe("#5b214e");
    expect(markup).toContain('data-letter-text-color="#5b214e"');
    expect(markup).toContain("color:#5b214e");
  });

  test("old saves keep their template paper until the user chooses an override", () => {
    const legacy = normalizeLetterDesign({
      template: "freundlich",
      colors: defaultLetterColors("freundlich"),
      font: "freundlich",
    });

    expect(legacy.paperColor).toBeNull();
    expect(legacy.textColor).toBeNull();
    expect(resolveLetterPaperColor(legacy)).toBe("#fff9ef");
  });
});

import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import "../../src/components/cover/fresh-templates";
import { TEMPLATES } from "../../src/components/cover/types";
import { LetterCanvas } from "../../src/components/letter/LetterCanvas";
import {
  DEMO_LETTER,
  defaultLetterColors,
  emptyLetterDesign,
  normalizeLetterDesign,
  type LetterHeaderMode,
  type LetterTemplateId,
} from "../../src/components/letter/types";

function markupFor(template: LetterTemplateId, headerMode: LetterHeaderMode) {
  const design = {
    ...emptyLetterDesign(),
    template,
    colors: defaultLetterColors(template),
    headerMode,
  };
  return renderToStaticMarkup(createElement(LetterCanvas, { data: DEMO_LETTER, design }));
}

describe("compact letter presentation", () => {
  test("every registered dossier template renders on neutral white letter paper", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(37);
    for (const template of TEMPLATES) {
      const markup = markupFor(template.id, "compact");
      expect(markup).toContain('data-letter-header-mode="compact"');
      expect(markup).toContain('data-letter-footer="compact"');
      expect(markup).toContain("background-color:#ffffff");
      expect(markup).not.toContain("data-dossier-sheet-background");
    }
  });

  test("all header modes work for every registered template", () => {
    for (const template of TEMPLATES) {
      const compact = markupFor(template.id, "compact");
      const contact = markupFor(template.id, "contact");
      const none = markupFor(template.id, "none");

      expect(compact).toContain('data-letter-header-mode="compact"');
      expect(compact).toContain('data-letter-section="sender"');

      expect(contact).toContain('data-letter-header-mode="contact"');
      expect(contact).toContain("data-letter-integrated-contact");
      expect(contact).not.toContain('data-letter-section="sender"');
      expect(contact).toContain("top:27mm");

      expect(none).toContain('data-letter-header-mode="none"');
      expect(none).not.toContain("data-letter-integrated-contact");
      expect(none).toContain('data-letter-section="sender"');
      expect(none).toContain("top:18mm");
    }
  });

  test("contact header fields and defaults survive design normalization", () => {
    const normalized = normalizeLetterDesign({
      template: "modern",
      colors: defaultLetterColors("modern"),
      font: "freundlich",
      headerMode: "contact",
      headerShowName: false,
      headerShowAddress: true,
      headerShowPhone: false,
      headerShowEmail: true,
    });
    expect(normalized.headerMode).toBe("contact");
    expect(normalized.headerShowName).toBe(false);
    expect(normalized.headerShowAddress).toBe(true);
    expect(normalized.headerShowPhone).toBe(false);
    expect(normalized.headerShowEmail).toBe(true);

    const legacy = normalizeLetterDesign({
      template: "modern",
      colors: defaultLetterColors("modern"),
      font: "freundlich",
    });
    expect(legacy.headerMode).toBe("compact");
    expect(legacy.headerShowName).toBe(true);
    expect(legacy.headerShowAddress).toBe(true);
    expect(legacy.headerShowPhone).toBe(true);
    expect(legacy.headerShowEmail).toBe(true);
  });

  test("contact header uses automatic readable contrast on a light header color", () => {
    const design = {
      ...emptyLetterDesign(),
      template: "modern" as const,
      colors: { ...defaultLetterColors("modern"), primary: "#ffffff", accent: "#ffffff" },
      headerMode: "contact" as const,
    };
    const markup = renderToStaticMarkup(createElement(LetterCanvas, { data: DEMO_LETTER, design }));
    expect(markup).toContain('data-letter-integrated-contact');
    expect(markup).toContain("color:#18181b");
  });
});

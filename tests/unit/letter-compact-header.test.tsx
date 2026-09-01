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
  type LetterData,
  type LetterFooterMode,
  type LetterHeaderMode,
  type LetterTemplateId,
} from "../../src/components/letter/types";

function markupFor(
  template: LetterTemplateId,
  headerMode: LetterHeaderMode,
  footerMode: LetterFooterMode = "compact",
  data: LetterData = DEMO_LETTER,
) {
  const design = {
    ...emptyLetterDesign(),
    template,
    colors: defaultLetterColors(template),
    headerMode,
    footerMode,
  };
  return renderToStaticMarkup(createElement(LetterCanvas, { data, design }));
}

function footerHeight(markup: string): number {
  const value = markup.match(/data-letter-footer-height-mm="([^"]+)"/)?.[1];
  return value ? Number(value) : 0;
}

describe("compact letter presentation", () => {
  test("every registered dossier template renders on neutral white letter paper", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(37);
    for (const template of TEMPLATES) {
      const markup = markupFor(template.id, "compact");
      expect(markup).toContain('data-letter-header-mode="compact"');
      expect(markup).toContain('data-letter-footer="compact"');
      expect(markup).toContain('data-letter-footer-mode="compact"');
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

  test("all footer modes work for every registered template without duplicating attachments", () => {
    for (const template of TEMPLATES) {
      const compact = markupFor(template.id, "compact", "compact");
      const attachments = markupFor(template.id, "compact", "attachments");
      const none = markupFor(template.id, "compact", "none");

      expect(compact).toContain('data-letter-footer-mode="compact"');
      expect(compact).toContain('data-letter-footer="compact"');
      expect(compact).toContain('data-letter-pdf-text="attachments-heading"');

      expect(attachments).toContain('data-letter-footer-mode="attachments"');
      expect(attachments).toContain('data-letter-footer="attachments"');
      expect(attachments).toContain("data-letter-footer-attachments");
      expect(attachments.match(/data-letter-pdf-text="attachments-heading"/g)?.length).toBe(1);

      expect(none).toContain('data-letter-footer-mode="none"');
      expect(none).not.toContain("data-letter-footer=");
      expect(none).toContain("bottom:10mm");
      expect(none).toContain('data-letter-pdf-text="attachments-heading"');
    }
  });

  test("attachments footer grows with its editable attachment content", () => {
    const shortMarkup = markupFor("modern", "compact", "attachments");
    const longMarkup = markupFor("modern", "compact", "attachments", {
      ...DEMO_LETTER,
      beilagen: ["Lebenslauf", "Zeugnis", "Schnupperbericht", "Kursbestätigung"],
    });

    expect(footerHeight(shortMarkup)).toBeGreaterThan(0);
    expect(footerHeight(longMarkup)).toBeGreaterThan(footerHeight(shortMarkup));
    expect(longMarkup).toContain("Schnupperbericht");
    expect(longMarkup).toContain("Kursbestätigung");
  });

  test("header and footer settings survive design normalization", () => {
    const normalized = normalizeLetterDesign({
      template: "modern",
      colors: defaultLetterColors("modern"),
      font: "freundlich",
      headerMode: "contact",
      headerShowName: false,
      headerShowAddress: true,
      headerShowPhone: false,
      headerShowEmail: true,
      footerMode: "attachments",
    });
    expect(normalized.headerMode).toBe("contact");
    expect(normalized.headerShowName).toBe(false);
    expect(normalized.headerShowAddress).toBe(true);
    expect(normalized.headerShowPhone).toBe(false);
    expect(normalized.headerShowEmail).toBe(true);
    expect(normalized.footerMode).toBe("attachments");

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
    expect(legacy.footerMode).toBe("compact");
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

import { describe, expect, test } from "bun:test";
import "../../src/components/cover/fresh-templates";
import { FRESH_TEMPLATE_IDS } from "../../src/components/cover/fresh-templates";
import { TEMPLATES } from "../../src/components/cover/types";
import {
  LETTER_PAGE_MM,
  letterArchetypeFor,
  letterPageGeometry,
  type LetterArchetype,
} from "../../src/components/letter/layout-system";
import {
  DEMO_LETTER,
  defaultLetterColors,
  emptyLetterDesign,
  type LetterFooterMode,
  type LetterHeaderMode,
  type LetterTemplateId,
} from "../../src/components/letter/types";

const headerModes: LetterHeaderMode[] = ["compact", "contact", "none"];
const footerModes: LetterFooterMode[] = ["compact", "attachments", "none"];

function designFor(
  template: LetterTemplateId,
  headerMode: LetterHeaderMode,
  footerMode: LetterFooterMode,
) {
  return {
    ...emptyLetterDesign(),
    template,
    colors: defaultLetterColors(template),
    headerMode,
    footerMode,
  };
}

describe("central motivation-letter layout system", () => {
  test("every registered template and every header/footer mode yields one usable content box", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(37);

    for (const template of TEMPLATES) {
      for (const headerMode of headerModes) {
        for (const footerMode of footerModes) {
          const geometry = letterPageGeometry(
            DEMO_LETTER,
            designFor(template.id, headerMode, footerMode),
          );

          expect(geometry.content.left).toBeGreaterThanOrEqual(20);
          expect(geometry.content.right).toBeGreaterThanOrEqual(20);
          expect(geometry.content.top).toBeGreaterThanOrEqual(16);
          expect(geometry.content.bottom).toBeGreaterThanOrEqual(10);
          expect(geometry.content.width).toBeGreaterThan(140);
          expect(geometry.content.height).toBeGreaterThan(240);
          expect(geometry.content.left + geometry.content.width + geometry.content.right).toBe(
            LETTER_PAGE_MM.width,
          );
          expect(geometry.content.top + geometry.content.height + geometry.content.bottom).toBe(
            LETTER_PAGE_MM.height,
          );
        }
      }
    }
  });

  test("letter geometry is archetype-based instead of copying per-template CV dimensions", () => {
    const groups = new Map<LetterArchetype, Set<string>>();

    for (const template of TEMPLATES) {
      const archetype = letterArchetypeFor(template.id);
      const geometry = letterPageGeometry(
        DEMO_LETTER,
        designFor(template.id, "compact", "compact"),
      );
      const signature = `${geometry.content.left}/${geometry.content.right}/${geometry.content.top}/${geometry.content.bottom}`;
      const signatures = groups.get(archetype) ?? new Set<string>();
      signatures.add(signature);
      groups.set(archetype, signatures);
    }

    expect(groups.size).toBeGreaterThanOrEqual(4);
    for (const signatures of groups.values()) expect(signatures.size).toBe(1);
  });

  test("band, sidebar, frame, quiet and fresh references are all represented", () => {
    const archetypes = new Set(TEMPLATES.map((template) => letterArchetypeFor(template.id)));

    expect(archetypes.has("band")).toBe(true);
    expect(archetypes.has("sidebar")).toBe(true);
    expect(archetypes.has("frame")).toBe(true);
    expect(archetypes.has("quiet")).toBe(true);
    expect(archetypes.has("fresh")).toBe(true);

    for (const id of FRESH_TEMPLATE_IDS) {
      const geometry = letterPageGeometry(
        DEMO_LETTER,
        designFor(id as LetterTemplateId, "compact", "compact"),
      );
      expect(geometry.freshTemplate).toBe(true);
    }
  });

  test("a zero-height CV band remains a quiet letter reference", () => {
    expect(letterArchetypeFor("modern")).toBe("quiet");
  });

  test("no-footer and attachment-footer reserve only their functional bottom space", () => {
    const compact = letterPageGeometry(
      DEMO_LETTER,
      designFor("modern", "compact", "compact"),
    );
    const attachments = letterPageGeometry(
      { ...DEMO_LETTER, beilagen: ["Lebenslauf", "Zeugnis", "Schnupperbericht"] },
      designFor("modern", "compact", "attachments"),
    );
    const none = letterPageGeometry(DEMO_LETTER, designFor("modern", "compact", "none"));

    expect(none.footer.height).toBe(0);
    expect(none.content.bottom).toBe(10);
    expect(none.content.height).toBeGreaterThan(compact.content.height);
    expect(attachments.footer.height).toBeGreaterThan(compact.footer.height);
    expect(attachments.content.bottom).toBe(attachments.footer.height + 7);
  });

  test("multi-page context keeps contact details on page one and attachments on the final page", () => {
    const design = designFor("modern", "contact", "attachments");
    const firstOfTwo = letterPageGeometry(DEMO_LETTER, design, {
      pageIndex: 0,
      finalPage: false,
    });
    const finalContinuation = letterPageGeometry(DEMO_LETTER, design, {
      pageIndex: 1,
      finalPage: true,
    });

    expect(firstOfTwo.firstPage).toBe(true);
    expect(firstOfTwo.effectiveHeaderMode).toBe("contact");
    expect(firstOfTwo.effectiveFooterMode).toBe("compact");
    expect(firstOfTwo.footer.showAttachments).toBe(false);

    expect(finalContinuation.firstPage).toBe(false);
    expect(finalContinuation.effectiveHeaderMode).toBe("compact");
    expect(finalContinuation.effectiveFooterMode).toBe("attachments");
    expect(finalContinuation.footer.showAttachments).toBe(true);
    expect(finalContinuation.content.top).toBeLessThan(firstOfTwo.content.top);
  });
});

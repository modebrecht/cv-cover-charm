import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  FRESH_TEMPLATE_IDS,
  FRESH_TEMPLATE_REGISTRY,
} from "../../src/components/cover/fresh-template-registry";
import {
  FRESH_LETTER_SPECS,
  motifIntersectsReadingBox,
} from "../../src/components/letter/fresh-letter-system";
import { LetterSheetBackground } from "../../src/components/letter/LetterSheetBackground";

function colorsFor(template: (typeof FRESH_TEMPLATE_IDS)[number]) {
  const definition = FRESH_TEMPLATE_REGISTRY.find(({ id }) => id === template);
  if (!definition) throw new Error(`Missing Fresh registry entry for ${template}`);
  return Object.fromEntries(definition.slots.map(({ key, default: value }) => [key, value]));
}

describe("M14 Fresh renderer boundaries", () => {
  test("every Fresh letter renders its dedicated semantic motif contract", () => {
    for (const template of FRESH_TEMPLATE_IDS) {
      const markup = renderToStaticMarkup(
        createElement(LetterSheetBackground, {
          template,
          colors: colorsFor(template),
        }),
      );
      const spec = FRESH_LETTER_SPECS[template];

      expect(markup).toContain('data-letter-background-variant="fresh"');
      expect(markup).toContain(`data-letter-fresh-template="${template}"`);
      expect(markup.match(/data-letter-motif=/g)?.length).toBe(spec.motifs.length);

      for (const motif of spec.motifs) {
        expect(markup).toContain(`data-letter-motif="${motif.id}"`);
        expect(markup).toContain(`data-letter-motif-role="${motif.color}"`);
        expect(motifIntersectsReadingBox(motif, spec), `${template}/${motif.id}`).toBe(false);
      }
    }
  });

  test("legacy Blockig letter rail exposes its intentional semantic motifs only", () => {
    const markup = renderToStaticMarkup(
      createElement(LetterSheetBackground, {
        template: "blockig",
        colors: {
          bg: "#ffffff",
          primary: "#223344",
          secondary: "#556677",
          accent: "#cc8844",
          ink: "#111111",
        },
      }),
    );

    expect(markup).toContain('data-letter-background-variant="quiet-column"');
    expect(markup).toContain('data-letter-safe-rail="true"');
    expect(markup).toContain('data-letter-motif="rail"');
    expect(markup).toContain('data-letter-motif="accent-edge"');
    expect(markup).not.toContain('data-letter-motif="rail-rule"');
  });
});

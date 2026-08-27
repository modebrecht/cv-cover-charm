import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CoverBackground } from "../../src/components/cover/CoverBackground";
import { templateDecorations } from "../../src/components/cover/template-decorations";
import { TEMPLATES, type TemplateId } from "../../src/components/cover/types";

const COLORS = {
  bg: "#ffffff",
  ink: "#111827",
  primary: "#334155",
  secondary: "#c08457",
  tertiary: "#e2e8f0",
  accent: "#d97706",
};

function backgroundChildCount(template: TemplateId) {
  const markup = renderToStaticMarkup(createElement(CoverBackground, { template, colors: COLORS }));
  const divCount = markup.match(/<div\b/g)?.length ?? 0;
  return Math.max(0, divCount - 1); // minus the page-surface wrapper
}

function decoration(template: TemplateId, id: string) {
  const found = templateDecorations(template, {}).find((block) => block.id === id);
  expect(found).toBeDefined();
  return found!;
}

function shapeBottom(template: TemplateId, id: string) {
  const block = decoration(template, id);
  return block.style.y + block.style.w * (block.style.ratio ?? 1);
}

describe("cover decoration single source", () => {
  test("CoverBackground contains structural artwork only", () => {
    const structuralChildren: Partial<Record<TemplateId, number>> = {
      klassisch: 1,
      edel: 2,
      sonnig: 2,
      aurora: 1,
      citrus: 1,
      pastell: 1,
    };

    for (const { id } of TEMPLATES) {
      expect(backgroundChildCount(id)).toBe(structuralChildren[id] ?? 0);
    }
  });

  test("editable decoration ids are unique within every template", () => {
    for (const { id } of TEMPLATES) {
      const ids = templateDecorations(id, {}).map((block) => block.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  test("edge-bound editable blocks reset exactly onto the A4 edges", () => {
    const fullWidth = [
      ["colorful", "decor-top-band"],
      ["colorful", "decor-bottom-band"],
      ["edelBlockig", "decor-top-band"],
      ["edelBlockig", "decor-bottom-field"],
      ["serioes", "decor-top-band"],
      ["serioes", "decor-bottom-band"],
      ["welle", "decor-bottom-field"],
      ["sonne", "decor-top-field"],
      ["aurora", "decor-bottom-band"],
      ["pastell", "decor-top-band"],
      ["freundlich", "decor-top-field"],
    ] as const satisfies ReadonlyArray<readonly [TemplateId, string]>;

    for (const [template, id] of fullWidth) {
      const block = decoration(template, id);
      expect(block.style.x).toBe(0);
      expect(block.style.x + block.style.w).toBeCloseTo(210, 6);
    }

    const bottomBound = [
      ["colorful", "decor-bottom-band"],
      ["edelBlockig", "decor-bottom-field"],
      ["serioes", "decor-bottom-band"],
      ["welle", "decor-bottom-field"],
      ["terracotta", "decor-side-column"],
      ["studio", "decor-side-column"],
      ["studio", "decor-bottom-band"],
      ["aurora", "decor-bottom-band"],
    ] as const satisfies ReadonlyArray<readonly [TemplateId, string]>;

    for (const [template, id] of bottomBound) {
      expect(shapeBottom(template, id)).toBeCloseTo(297, 6);
    }

    const topBound = [
      ["colorful", "decor-top-band"],
      ["blockig", "decor-top-block"],
      ["edelBlockig", "decor-top-band"],
      ["serioes", "decor-top-band"],
      ["terracotta", "decor-side-column"],
      ["sonne", "decor-top-field"],
      ["studio", "decor-side-column"],
      ["pastell", "decor-top-band"],
      ["freundlich", "decor-top-field"],
    ] as const satisfies ReadonlyArray<readonly [TemplateId, string]>;

    for (const [template, id] of topBound) {
      expect(decoration(template, id).style.y).toBe(0);
    }
  });
});

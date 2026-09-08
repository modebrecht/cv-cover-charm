import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CoverBackground } from "../../src/components/cover/CoverBackground";
import {
  FRESH_TEMPLATE_IDS,
  type FreshTemplateId,
} from "../../src/components/cover/fresh-templates";
import { TEMPLATES, type TemplateId } from "../../src/components/cover/types";

const EXPECTED_21_TO_38 = [
  "edge",
  "glow",
  "frame",
  "monoLuxe",
  "horizon",
  "sunrise",
  "forestFlow",
  "violetPulse",
  "studio2",
  "studio3",
  "warm2",
  "warm3",
  "ledger",
  "prism",
  "gallery",
  "orbit",
  "ribbon",
  "cove",
] as const satisfies readonly FreshTemplateId[];

function defaultColors(template: TemplateId) {
  const definition = TEMPLATES.find(({ id }) => id === template);
  if (!definition) throw new Error(`Missing template definition for ${template}`);
  return Object.fromEntries(definition.slots.map(({ key, default: value }) => [key, value]));
}

describe("Fresh title-page background contract", () => {
  test("Fresh template registry is exactly dossier templates 21 through 38", () => {
    expect(FRESH_TEMPLATE_IDS).toEqual(EXPECTED_21_TO_38);
  });

  test("every Fresh template renders the shared three-field structural scaffold", () => {
    for (const template of EXPECTED_21_TO_38) {
      const colors = defaultColors(template as TemplateId);
      const markup = renderToStaticMarkup(
        createElement(CoverBackground, {
          template: template as TemplateId,
          colors,
        }),
      );

      expect(markup).toContain(`data-fresh-cover-background="${template}"`);
      expect(markup).toContain('data-fresh-cover-field="primary"');
      expect(markup).toContain('data-fresh-cover-field="secondary"');
      expect(markup).toContain('data-fresh-cover-field="accent"');
      expect(markup.match(/data-fresh-cover-field=/g)?.length).toBe(3);

      const definition = TEMPLATES.find(({ id }) => id === template);
      const primary = definition?.slots.find(({ key }) => key === "primary")?.default;
      const secondary = definition?.slots.find(({ key }) => key === "secondary")?.default;
      const accent = definition?.slots.find(({ key }) => key === "accent")?.default;
      if (primary) expect(markup).toContain(`background-color:${primary}`);
      if (secondary) expect(markup).toContain(`background-color:${secondary}`);
      if (accent) expect(markup).toContain(`background-color:${accent}`);
    }
  });

  test("legacy title-page templates do not receive the Fresh scaffold", () => {
    const markup = renderToStaticMarkup(
      createElement(CoverBackground, {
        template: "modern",
        colors: defaultColors("modern"),
      }),
    );

    expect(markup).not.toContain("data-fresh-cover-background");
    expect(markup).not.toContain("data-fresh-cover-field");
  });
});

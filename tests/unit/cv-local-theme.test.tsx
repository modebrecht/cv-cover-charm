import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CvCanvas } from "../../src/components/cv/CvCanvas";
import { emptyCv } from "../../src/components/cv/types";
import { FONT_STACKS, type TemplateId } from "../../src/components/cover/types";
import { DOSSIER_FAMILIES } from "../../src/lib/dossier-family";
import {
  applyDossierTheme,
  dossierThemeCssVariables,
  dossierThemeFor,
} from "../../src/lib/dossier-theme";

describe("CV local theme contract", () => {
  test("serializes every semantic theme role and preserves legacy global values", () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, "document");
    try {
      for (const family of DOSSIER_FAMILIES) {
        const template = family.coverTemplate;
        const theme = dossierThemeFor(template);
        const variables = dossierThemeCssVariables(template);
        expect(Object.keys(variables)).toHaveLength(28);
        expect(variables["--dossier-font"]).toBe(theme.typography.fontStack);
        expect(variables["--dossier-name-weight"]).toBe(String(theme.typography.nameWeight));
        expect(variables["--dossier-heading-tracking"]).toBe(`${theme.headingStyle.trackingEm}em`);
        expect(variables["--dossier-heading-transform"]).toBe(
          theme.headingStyle.uppercase ? "uppercase" : "none",
        );
        expect(variables["--dossier-section-gap"]).toBe(`${4 * theme.spacingDensity}mm`);
        expect(variables["--dossier-photo-saturation"]).toBe(
          String(theme.photoTreatment.saturation),
        );
        const written: Record<string, string> = {};
        Object.defineProperty(globalThis, "document", {
          configurable: true,
          value: {
            documentElement: {
              dataset: {},
              style: {
                setProperty: (key: string, value: string) => {
                  written[key] = value;
                },
              },
            },
          },
        });
        applyDossierTheme(template);
        expect(written).toEqual(variables);
      }
    } finally {
      if (original) Object.defineProperty(globalThis, "document", original);
      else Reflect.deleteProperty(globalThis, "document");
    }
  });

  test("hidden CV includes the complete theme in its initial markup without writing global theme variables", () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, "document");
    try {
      Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: {
          documentElement: {
            dataset: {},
            style: {
              setProperty: (key: string) => {
                if (key.startsWith("--dossier-"))
                  throw new Error("CV must not write global theme variables");
              },
              removeProperty: () => {},
            },
          },
        },
      });
      const design = {
        colors: {},
        bgOpacity: 0.25,
        useElements: false,
        template: "studio3" as TemplateId,
        font: "serif" as const,
      };
      const markup = renderToStaticMarkup(
        <CvCanvas
          data={emptyCv}
          design={design}
          elements={[]}
          exportMode
          manageGlobalTemplateScope={false}
        />,
      );
      for (const [key, value] of Object.entries(
        dossierThemeCssVariables(design.template, design.font),
      )) {
        expect(markup.replaceAll("&#x27;", "'").replaceAll("&quot;", '"')).toContain(
          `${key}:${value}`,
        );
      }
      expect(markup).toContain("data-cv-measure-page");
    } finally {
      if (original) Object.defineProperty(globalThis, "document", original);
      else Reflect.deleteProperty(globalThis, "document");
    }
  });

  test("explicit fonts override family fonts while other theme roles remain unchanged", () => {
    for (const font of Object.keys(FONT_STACKS) as Array<keyof typeof FONT_STACKS>) {
      const variables = dossierThemeCssVariables("freundlich", font);
      expect(variables).toEqual({
        ...dossierThemeCssVariables("freundlich"),
        "--dossier-font": FONT_STACKS[font],
      });
    }
  });
});

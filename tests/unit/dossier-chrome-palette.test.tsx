import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DossierHeaderFooterChrome } from "../../src/components/dossier/DossierHeaderFooterChrome";
import {
  DEFAULT_DOSSIER_CHROME_STATE,
  normalizeDossierChromeState,
} from "../../src/lib/dossier-chrome";
import { resolveDossierChromePalette } from "../../src/lib/dossier-chrome-palette";
import { resolveTemplateChromeOptions } from "../../src/lib/template-chrome";

const templates = ["brief", "modern", "freundlich", "verlauf", "neon"];
const letterColors = { primary: "#15364a", accent: "#92562b", secondary: "#326782" };
const cvColors = { primary: "#492345", accent: "#683249", secondary: "#a56427" };
const contact = {
  name: "Ada Muster",
  address: "Weg 1",
  place: "8000 Zürich",
  phone: "044 123 45 67",
  email: "ada@example.org",
};

test("five families share first/continuation palette without changing modes, geometry or saved designs", () => {
  for (const template of templates) {
    for (const mode of ["compact", "contact", "none"] as const) {
      const state = structuredClone(DEFAULT_DOSSIER_CHROME_STATE);
      Object.assign(state.shared, {
        headerMode: mode,
        headerDifferentFirstPage: true,
        headerContinuationMode: "contact",
      });
      const designs = {
        letter: { template, colors: letterColors },
        cv: { template, colors: cvColors },
      };
      const saved = JSON.stringify({ designs, state });
      const letter = resolveDossierChromePalette(designs, state, "letter");
      const cv = resolveDossierChromePalette(designs, state, "cv");
      expect(cv).toEqual(letter);
      expect(cv.headerMode).toBe(mode);
      expect(cv.headerHeightMm).toBe(state.shared.headerHeightMm);
      expect(cv.headerContinuationMode).toBe("contact");
      for (const pageIndex of [0, 1]) {
        const html = (scope: "letter" | "cv") =>
          renderToStaticMarkup(
            createElement(DossierHeaderFooterChrome, {
              scope,
              template,
              colors: designs[scope].colors,
              options: scope === "cv" ? cv : letter,
              contact,
              pageIndex,
            }),
          );
        // Ignore scope markers; actual paints and CSS palette variables must agree.
        const paints = (value: string) =>
          [...value.matchAll(/(?:background|--chrome-[\w-]+|border-color):([^;"}]+)/g)].map(
            (m) => m[0],
          );
        if (!(template === "freundlich" && mode === "compact" && pageIndex === 0))
          expect(paints(html("cv"))).toEqual(paints(html("letter")));
        expect(html("cv")).toMatch(/data-dossier-footer="compact"[^>]*opacity:1/);
      }
      expect(JSON.stringify({ designs, state })).toBe(saved);
      expect(
        normalizeDossierChromeState({ ...state, shared: cv }).shared.resolvedPalette,
      ).toBeUndefined();
    }
  }
});

test("explicit shared and independent colours/gradients survive repeated template resolution", () => {
  const state = structuredClone(DEFAULT_DOSSIER_CHROME_STATE);
  Object.assign(state.shared, {
    headerBackgroundColor: "#124578",
    footerBackgroundColor: "#ab7234",
    headerGradientColor: "#778899",
    footerGradientColor: "#eeccaa",
    borderColor: "#8899aa",
    headerTextColor: "#ffffff",
    footerTextColor: "#112233",
  });
  for (const template of templates) {
    const designs = {
      letter: { template, colors: letterColors },
      cv: { template, colors: cvColors },
    };
    for (const sync of [true, false]) {
      state.sync = sync;
      state.letter = { ...state.shared, headerBackgroundColor: "#442211" };
      state.cv = { ...state.shared, headerBackgroundColor: "#116644" };
      for (const scope of ["letter", "cv"] as const) {
        const resolved = resolveDossierChromePalette(designs, state, scope);
        const repeated = resolveTemplateChromeOptions(template, designs[scope].colors, resolved);
        expect(repeated).toEqual(resolved);
        const authored = sync ? state.shared : state[scope];
        for (const field of [
          "headerBackgroundColor",
          "footerBackgroundColor",
          "headerGradientColor",
          "footerGradientColor",
          "borderColor",
          "headerTextColor",
          "footerTextColor",
        ] as const)
          expect(repeated[field]).toBe(authored[field]);
      }
    }
  }
});

test("standalone CV has a deterministic local authority, while sync off uses each automatic palette", () => {
  const state = structuredClone(DEFAULT_DOSSIER_CHROME_STATE);
  const designs = {
    letter: { template: "modern", colors: letterColors },
    cv: { template: "modern", colors: cvColors },
  };
  expect(resolveDossierChromePalette({ cv: designs.cv }, state, "cv").headerBackgroundColor).toBe(
    cvColors.primary,
  );
  state.sync = false;
  expect(resolveDossierChromePalette(designs, state, "cv").headerBackgroundColor).toBe(
    cvColors.primary,
  );
  expect(resolveDossierChromePalette(designs, state, "letter").headerBackgroundColor).toBe(
    letterColors.primary,
  );
});

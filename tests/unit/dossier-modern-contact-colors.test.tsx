import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DossierHeaderFooterChrome } from "../../src/components/dossier/DossierHeaderFooterChrome";
import { normalizeDossierChromeState } from "../../src/lib/dossier-chrome";
import { resolveDossierChromeSnapshot } from "../../src/lib/dossier-resolved-chrome";
import savedSource from "../fixtures/docx-next/modern-header-snapshot.json";
import type { DossierAppSnapshot } from "../../src/lib/docx-next/source";

const input = () => structuredClone(savedSource) as unknown as DossierAppSnapshot;
const markup = (source: ReturnType<typeof input>, scope: "letter" | "cv", pageIndex = 0) => {
  const resolved = resolveDossierChromeSnapshot(source, source.settings.chrome!)[scope];
  return renderToStaticMarkup(
    createElement(DossierHeaderFooterChrome, {
      scope,
      template: "modern",
      colors: source[scope].design.colors,
      options: resolved.options,
      contact: resolved.contact,
      pageIndex,
    }),
  );
};

test("Modern contact sync uses one actual header/footer/border palette despite differing document colours", () => {
  const source = input();
  const saved = JSON.stringify(source);
  expect(source.letter.design.colors.primary).not.toBe(source.cv.design.colors.primary);
  const resolved = resolveDossierChromeSnapshot(source, source.settings.chrome!);
  expect(resolved.cv.options).toEqual(resolved.letter.options);
  expect(resolved.cv.options.resolvedPalette?.colors.primary).toBe(
    source.letter.design.colors.primary,
  );
  expect(resolved.cv.options.resolvedPalette?.colors.accent).toBe(
    source.letter.design.colors.accent,
  );
  for (const scope of ["letter", "cv"] as const)
    for (const page of [0, 1]) {
      const html = markup(source, scope, page);
      expect(html).toContain(`background:${source.letter.design.colors.primary}`);
      expect(html).toContain(`background:${source.letter.design.colors.accent}`);
      expect(html).toMatch(/data-dossier-footer="compact"[^>]*opacity:1/);
      expect(html).not.toContain("<svg");
      for (const value of Object.values(resolved[scope].contact)) expect(html).toContain(value);
    }
  expect(JSON.stringify(source)).toBe(saved);
});

test("explicit shared surface/text/gradient/border colours survive sync and JSON restore", () => {
  const source = input();
  Object.assign(source.settings.chrome!.shared, {
    headerBackgroundColor: "#243647",
    footerBackgroundColor: "#aabbcc",
    headerGradientColor: "#123456",
    footerGradientColor: "#abcdef",
    headerTextColor: "#ffffff",
    footerTextColor: "#111111",
    borderColor: "#998877",
  });
  const restored = JSON.parse(JSON.stringify(source));
  const resolved = resolveDossierChromeSnapshot(restored, restored.settings.chrome);
  for (const scope of ["letter", "cv"] as const) {
    for (const key of [
      "headerBackgroundColor",
      "footerBackgroundColor",
      "headerGradientColor",
      "footerGradientColor",
      "headerTextColor",
      "footerTextColor",
      "borderColor",
    ] as const)
      expect(resolved[scope].options[key]).toBe(source.settings.chrome!.shared[key]);
  }
});

test("sync off retains independent colours; compact and mixed templates share the Letter palette", () => {
  const source = input();
  const state = source.settings.chrome!;
  state.sync = false;
  state.cv = { ...state.shared, headerBackgroundColor: "#448899" };
  state.letter = { ...state.shared, headerBackgroundColor: "#221133" };
  const resolved = resolveDossierChromeSnapshot(source, state);
  expect(resolved.cv.options.headerBackgroundColor).toBe("#448899");
  expect(resolved.letter.options.headerBackgroundColor).toBe("#221133");
  state.sync = true;
  state.shared.headerMode = "compact";
  const compact = resolveDossierChromeSnapshot(source, state);
  expect(compact.cv.options).toEqual(compact.letter.options);
  expect(compact.cv.options.headerBackgroundColor).toBe(source.letter.design.colors.primary);
  source.cv.design.template = "brief";
  state.shared.headerMode = "contact";
  const other = resolveDossierChromeSnapshot(source, state);
  expect(other.cv.options.resolvedPalette).toEqual(other.letter.options.resolvedPalette);
});

test("restoring a legacy icon selection removes icons in all stored branches before export", () => {
  const state = normalizeDossierChromeState({
    shared: { headerInlineSeparator: "icons" },
    letter: { headerInlineSeparator: "icons" },
    cv: { headerInlineSeparator: "icons" },
  });
  for (const scope of ["shared", "letter", "cv"] as const)
    expect(state[scope].headerInlineSeparator).toBe("dot");
});

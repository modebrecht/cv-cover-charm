import { afterEach, expect, test } from "bun:test";
import {
  dossierContinuationContentTopMm,
  normalizeDossierContinuationTopMm,
} from "../../src/lib/dossier-reading-settings";
import { cvContentBox, cvFrameFor, cvDefaultPageMargins } from "../../src/components/cv/archetype";
import { cvReadingDefaults } from "../../src/components/cv/reading-defaults";
import { letterPageGeometry } from "../../src/components/letter/layout-system";
import {
  DEMO_LETTER,
  emptyLetterDesign,
  normalizeLetterDesign,
} from "../../src/components/letter/types";
import { DEFAULT_DOSSIER_CHROME_OPTIONS } from "../../src/lib/dossier-chrome";
import { clearDossierPageMargins, setDossierPageMargins } from "../../src/lib/dossier-page-margins";
import { captureDossierDocxNextSnapshot } from "../../src/lib/docx-next/snapshot";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { walkBlocks } from "../../src/lib/docx-next/model";
import { briefFixture } from "../fixtures/docx-next/brief";

afterEach(clearDossierPageMargins);
const templates = ["brief", "modern", "freundlich", "verlauf", "neon"] as const;

test("shared content starts clear contact chrome and retain structural floors and authored zero", () => {
  expect(dossierContinuationContentTopMm(20, 26)).toBe(30);
  expect(dossierContinuationContentTopMm(20, 32)).toBe(36);
  expect(dossierContinuationContentTopMm(0, 0)).toBe(0);
  expect(dossierContinuationContentTopMm(0, 0, 23)).toBe(23);
  expect(dossierContinuationContentTopMm(20, 31.1)).toBe(35.5);
  for (const value of [undefined, null, "", " ", "bad", NaN, Infinity, false, {}])
    expect(normalizeDossierContinuationTopMm(value)).toBeUndefined();
  expect(normalizeDossierContinuationTopMm("10")).toBe(10);
  expect(normalizeDossierContinuationTopMm(0)).toBe(0);
});

test("enabling the CV's resolved physical defaults does not add header reserve twice", () => {
  for (const template of templates)
    for (const headerMode of ["none", "compact", "contact"] as const) {
      const chrome = { ...DEFAULT_DOSSIER_CHROME_OPTIONS, headerMode };
      const frame = cvFrameFor(template);
      const defaults = cvDefaultPageMargins(frame, 0, "classic", undefined, chrome);
      const presentation = { pageMargins: null, continuationTopMarginMm: 20 };
      const before = cvContentBox(frame, 0, "classic", undefined, chrome, presentation);
      const after = cvContentBox(frame, 0, "classic", undefined, chrome, {
        ...presentation,
        pageMargins: defaults,
      });
      expect(after).toEqual(before);
    }
});

test("five template families use the same CV and Letter continuation policy across chrome modes", () => {
  for (const template of templates)
    for (const headerMode of ["none", "compact", "contact"] as const) {
      const chrome = {
        ...DEFAULT_DOSSIER_CHROME_OPTIONS,
        headerMode,
        headerDifferentFirstPage: false,
      };
      const cv = cvContentBox(cvFrameFor(template), 1, "classic", undefined, chrome, {
        pageMargins: null,
        continuationTopMarginMm: 20,
      });
      const letter = letterPageGeometry(
        DEMO_LETTER,
        { ...emptyLetterDesign(), template },
        { pageIndex: 1, chromeOptions: chrome, pageMargins: null },
      );
      expect(cv.top).toBe(
        headerMode === "contact" ? 36 : ["verlauf", "neon"].includes(template) ? 23 : 20,
      );
      expect(letter.content.top).toBe(headerMode === "contact" ? 36 : 20);
      expect(cvReadingDefaults(template, "classic").sectionTitleFontSizePx).toBe(14);
    }
});

test("existing Letter margins keep their reserved meaning; explicit continuation and reset survive normalization", () => {
  const design = { ...emptyLetterDesign(), template: "brief" as const };
  const chrome = { ...DEFAULT_DOSSIER_CHROME_OPTIONS, headerMode: "contact" as const };
  const margins = { top: 12, right: 23, bottom: 1, left: 24 };
  const context = { pageIndex: 1, chromeOptions: chrome, pageMargins: margins };
  expect(letterPageGeometry(DEMO_LETTER, design, context).content.top).toBe(56);
  const authored = normalizeLetterDesign({ ...design, continuationTopMarginMm: 38 });
  expect(letterPageGeometry(DEMO_LETTER, authored, context).content.top).toBe(38);
  const reset = normalizeLetterDesign(
    JSON.parse(JSON.stringify({ ...authored, continuationTopMarginMm: null })),
  );
  expect(reset.continuationTopMarginMm).toBeNull();
  expect(letterPageGeometry(DEMO_LETTER, reset, context).content.top).toBe(36);
  expect(letterPageGeometry(DEMO_LETTER, reset, { ...context, pageIndex: 0 }).content.top).toBe(56);
});

test("detached snapshot geometry and native flowing sections share starts without importing browser state", () => {
  const input = briefFixture();
  // No live store is needed for detached geometry. The capture's default chrome is compact.
  const snapshot = captureDossierDocxNextSnapshot(input.cover, input.letter, input.cv);
  const before = JSON.stringify(snapshot);
  const model = buildDossierDocModel(snapshot);
  for (const scope of ["letter", "cv"] as const) {
    const top = snapshot.settings.flowPageTops![scope]!;
    expect(model[scope].page.margins.top).toBe(top.continuationMm);
    expect(model[scope].layout.pagination!.firstPageLeadMm + model[scope].page.margins.top).toBe(
      top.firstMm,
    );
  }
  expect(JSON.stringify(snapshot)).toBe(before);
  const semantic = (part: typeof model.letter) =>
    walkBlocks(part.blocks)
      .filter((b) => b.kind === "paragraph")
      .map((b) => ({ id: b.id, runs: b.runs }));
  const legacy = structuredClone(snapshot);
  delete legacy.settings.flowPageTops;
  const prior = buildDossierDocModel(legacy);
  expect(semantic(model.letter)).toEqual(semantic(prior.letter));
  expect(semantic(model.cv)).toEqual(semantic(prior.cv));
});

test("unsupported first/continuation relationships fail explicitly before any package is rendered", () => {
  const input = briefFixture();
  input.settings.flowPageTops = { letter: { firstMm: 18, continuationMm: 20 } };
  expect(() => buildDossierDocModel(input)).toThrow("kleineren Rand");
  input.settings.flowPageTops = { cv: { firstMm: 30, continuationMm: NaN } };
  expect(() => buildDossierDocModel(input)).toThrow("Ungültige Seitengeometrie");
  input.settings.cvLayout = "sidebar";
  input.settings.flowPageTops = { cv: { firstMm: 30, continuationMm: 20 } };
  expect(() => buildDossierDocModel(input)).toThrow("eingefroren");
});

test("a captured Letter margin is detached from later live changes", () => {
  const input = briefFixture();
  setDossierPageMargins("letter", { top: 12, right: 23, bottom: 1, left: 24 });
  const snapshot = captureDossierDocxNextSnapshot(input.cover, input.letter, input.cv);
  const before = buildDossierDocModel(snapshot);
  setDossierPageMargins("letter", { top: 30, right: 23, bottom: 1, left: 24 });
  expect(buildDossierDocModel(snapshot)).toEqual(before);
});

test("capturing shared settings cannot change the frozen Sidebar CV model", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  try {
    for (const layout of ["modern", "executive"]) {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: {
          localStorage: {
            getItem: (key: string) => (key === "lebenslauf:layout:v1" ? layout : null),
          },
        },
      });
      const input = briefFixture();
      const snapshot = captureDossierDocxNextSnapshot(input.cover, input.letter, input.cv);
      expect(snapshot.settings.flowPageTops?.cv).toBeUndefined();
      expect(snapshot.settings.cvContinuationTopMarginMm).toBe(10);
      expect(snapshot.cv.design.sectionTitleFontSizePx).toBeUndefined();
      const legacy = structuredClone(snapshot);
      delete legacy.settings.flowPageTops;
      expect(buildDossierDocModel(snapshot).cv).toEqual(buildDossierDocModel(legacy).cv);
    }
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

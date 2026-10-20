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
      // CV above deliberately authors 20 mm; Letter is automatic.
      expect(letter.content.top).toBe(
        headerMode === "contact" ? 52 : headerMode === "compact" ? 24 : 20,
      );
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
  expect(letterPageGeometry(DEMO_LETTER, reset, context).content.top).toBe(56);
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

test("all selectable styles and flowing CV layouts inherit one header clearance on pages 1, 2 and 3", async () => {
  await import("../../src/components/cover/fresh-templates");
  const { TEMPLATES } = await import("../../src/components/cover/types");
  const { dossierHeaderVisualHeightMmForOptions } = await import("../../src/lib/dossier-chrome");
  for (const { id } of TEMPLATES) {
    for (const headerMode of ["compact", "contact"] as const) {
      for (const reduced of [false, true]) {
        const chrome = {
          ...DEFAULT_DOSSIER_CHROME_OPTIONS,
          headerMode,
          headerDifferentFirstPage: reduced,
        };
        for (const pageIndex of [0, 1, 2]) {
          const height = dossierHeaderVisualHeightMmForOptions(chrome, pageIndex);
          for (const layout of ["classic", "modern"] as const) {
            const cv = cvContentBox(cvFrameFor(id), pageIndex, layout, undefined, chrome, {
              pageMargins: null,
              continuationTopMarginMm: null,
            });
            expect(cv.top - height).toBe(20);
          }
          const letter = letterPageGeometry(
            DEMO_LETTER,
            { ...emptyLetterDesign(), template: id },
            { pageIndex, chromeOptions: chrome, pageMargins: null },
          );
          // Warm retains its real first-page masthead (also 20 mm clearance).
          const letterHeight =
            id === "freundlich" && headerMode === "compact" && pageIndex === 0 ? 52 : height;
          expect(letter.content.top - letterHeight).toBe(20);
        }
      }
    }
  }
});

test("authored CV/Letter margins and explicit continuation values win; reset rejoins inheritance", () => {
  const chrome = {
    ...DEFAULT_DOSSIER_CHROME_OPTIONS,
    headerMode: "contact" as const,
    headerDifferentFirstPage: false,
    headerGapMm: 7,
  };
  const pageMargins = { top: 28, right: 24, bottom: 1, left: 24 };
  const design = { ...emptyLetterDesign(), template: "modern" as const };
  for (const pageIndex of [0, 1, 2]) {
    const cv = cvContentBox(cvFrameFor("modern"), pageIndex, "classic", undefined, chrome, {
      pageMargins,
      continuationTopMarginMm: null,
    });
    const letter = letterPageGeometry(DEMO_LETTER, design, {
      pageIndex,
      chromeOptions: chrome,
      pageMargins,
    });
    expect(cv.top).toBe(67); // 28 authored + 32 header + 7 authored extra gap.
    expect(letter.content.top).toBe(67);
  }
  expect(
    cvContentBox(cvFrameFor("modern"), 1, "classic", undefined, chrome, {
      pageMargins,
      continuationTopMarginMm: 45,
    }).top,
  ).toBe(45);
  expect(
    letterPageGeometry(
      DEMO_LETTER,
      { ...design, continuationTopMarginMm: 45 },
      { pageIndex: 1, chromeOptions: chrome, pageMargins },
    ).content.top,
  ).toBe(45);
  expect(
    letterPageGeometry(
      DEMO_LETTER,
      { ...design, continuationTopMarginMm: null },
      { pageIndex: 1, chromeOptions: chrome, pageMargins },
    ).content.top,
  ).toBe(67);
});

test("automatic CV margins remain absent through save; new and legacy authored values survive, reset removes both", async () => {
  const {
    getCvContinuationTopMarginOverrideMm,
    setCvContinuationTopMarginMm,
    CV_CONTINUATION_TOP_MARGIN_STORAGE_KEY: current,
    CV_CONTINUATION_GAP_STORAGE_KEY: legacy,
  } = await import("../../src/components/cv/layout");
  const { readPortableCvState } = await import("../../src/components/cv/portable-state");
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  const values = new Map<string, string>([["lebenslauf:layout:v1", "classic"]]);
  try {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: (k: string) => values.get(k) ?? null,
          setItem: (k: string, v: string) => values.set(k, v),
          removeItem: (k: string) => values.delete(k),
        },
        dispatchEvent: () => true,
      },
    });
    expect(getCvContinuationTopMarginOverrideMm()).toBeNull();
    expect(readPortableCvState()?.continuationTopMarginMm).toBeUndefined();
    values.set(legacy, "17");
    expect(getCvContinuationTopMarginOverrideMm()).toBe(17);
    setCvContinuationTopMarginMm(52);
    expect(readPortableCvState()?.continuationTopMarginMm).toBe(52);
    expect(values.has(legacy)).toBe(false);
    setCvContinuationTopMarginMm(null);
    expect(values.has(current)).toBe(false);
    expect(getCvContinuationTopMarginOverrideMm()).toBeNull();
    expect(readPortableCvState()?.continuationTopMarginMm).toBeUndefined();
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("captured contact-page starts have no second template lead before the first native Letter text", () => {
  const input = briefFixture();
  input.settings.chrome = {
    sync: true,
    shared: {
      ...DEFAULT_DOSSIER_CHROME_OPTIONS,
      headerMode: "contact",
      headerDifferentFirstPage: false,
    },
    cv: {},
    letter: {},
  };
  input.settings.flowPageTops = { letter: { firstMm: 52, continuationMm: 52 } };
  const model = buildDossierDocModel(input);
  expect(model.letter.blocks[0].id).toBe("letter.recipient.company");
  expect(model.letter.blocks.some((b) => b.id === "letter.recipient.gap")).toBe(false);
  expect(model.letter.layout.pagination?.firstPageLeadMm).toBe(0);
  expect(model.letter.page.margins.top).toBe(52);
  input.settings.chrome.shared.letterRecipientOffsetYMm = 3;
  const authored = buildDossierDocModel(input).letter.blocks.find(
    (b) => b.id === "letter.recipient.gap",
  );
  expect(authored?.kind === "spacer" && authored.heightMm).toBe(15);
});

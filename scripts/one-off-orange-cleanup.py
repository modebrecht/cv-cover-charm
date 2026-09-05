from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, got {count}")
    return text.replace(old, new, 1)

# Pure dossier chrome geometry helpers.
p = Path("src/lib/dossier-chrome.ts")
s = p.read_text()
old = '''export function effectiveDossierHeaderMode(
  scope: DossierChromeScope,
  pageIndex = 0,
): DossierHeaderMode {
  const requested = getDossierChromeOptions(scope).headerMode;
  if (pageIndex === 0) return requested;
  return requested === "none" ? "none" : "compact";
}

export function dossierHeaderContentTopMm(scope: DossierChromeScope, pageIndex = 0): number {
  const mode = effectiveDossierHeaderMode(scope, pageIndex);
  if (pageIndex > 0) return mode === "none" ? 16 : 18;
  if (mode === "contact") return 31;
  if (mode === "none") return 18;
  return 21;
}

export function dossierHeaderVisualHeightMm(scope: DossierChromeScope, pageIndex = 0): number {
  const mode = effectiveDossierHeaderMode(scope, pageIndex);
  if (mode === "contact") return 22;
  if (mode === "compact") return 3;
  return 0;
}

export function dossierFooterContentBottomMm(scope: DossierChromeScope): number {
  const mode = getDossierChromeOptions(scope).footerMode;
  if (mode === "none") return 10;
  return mode === "details" ? 20 : 17;
}

export function dossierFooterVisualHeightMm(scope: DossierChromeScope): number {
  const mode = getDossierChromeOptions(scope).footerMode;
  if (mode === "none") return 0;
  return mode === "details" ? 10 : 2.4;
}
'''
new = '''export function effectiveDossierHeaderModeForOptions(
  options: DossierChromeOptions,
  pageIndex = 0,
): DossierHeaderMode {
  const requested = options.headerMode;
  if (pageIndex === 0) return requested;
  return requested === "none" ? "none" : "compact";
}

export function dossierHeaderContentTopMmForOptions(
  options: DossierChromeOptions,
  pageIndex = 0,
): number {
  const mode = effectiveDossierHeaderModeForOptions(options, pageIndex);
  if (pageIndex > 0) return mode === "none" ? 16 : 18;
  if (mode === "contact") return 31;
  if (mode === "none") return 18;
  return 21;
}

export function dossierHeaderVisualHeightMmForOptions(
  options: DossierChromeOptions,
  pageIndex = 0,
): number {
  const mode = effectiveDossierHeaderModeForOptions(options, pageIndex);
  if (mode === "contact") return 22;
  if (mode === "compact") return 3;
  return 0;
}

export function dossierFooterContentBottomMmForOptions(options: DossierChromeOptions): number {
  if (options.footerMode === "none") return 10;
  return options.footerMode === "details" ? 20 : 17;
}

export function dossierFooterVisualHeightMmForOptions(options: DossierChromeOptions): number {
  if (options.footerMode === "none") return 0;
  return options.footerMode === "details" ? 10 : 2.4;
}

// Compatibility wrappers for callers that intentionally read the live store.
// Layout engines should use the pure option-based helpers above.
export function effectiveDossierHeaderMode(
  scope: DossierChromeScope,
  pageIndex = 0,
): DossierHeaderMode {
  return effectiveDossierHeaderModeForOptions(getDossierChromeOptions(scope), pageIndex);
}

export function dossierHeaderContentTopMm(scope: DossierChromeScope, pageIndex = 0): number {
  return dossierHeaderContentTopMmForOptions(getDossierChromeOptions(scope), pageIndex);
}

export function dossierHeaderVisualHeightMm(scope: DossierChromeScope, pageIndex = 0): number {
  return dossierHeaderVisualHeightMmForOptions(getDossierChromeOptions(scope), pageIndex);
}

export function dossierFooterContentBottomMm(scope: DossierChromeScope): number {
  return dossierFooterContentBottomMmForOptions(getDossierChromeOptions(scope));
}

export function dossierFooterVisualHeightMm(scope: DossierChromeScope): number {
  return dossierFooterVisualHeightMmForOptions(getDossierChromeOptions(scope));
}
'''
s = replace_once(s, old, new, "chrome geometry")
p.write_text(s)

# CV geometry takes explicit chrome options.
p = Path("src/components/cv/archetype.ts")
s = p.read_text()
s = replace_once(s, '''import {
  dossierFooterContentBottomMm,
  dossierFooterVisualHeightMm,
  dossierHeaderContentTopMm,
  dossierHeaderVisualHeightMm,
} from "@/lib/dossier-chrome";
''', '''import {
  DEFAULT_DOSSIER_CHROME_OPTIONS,
  dossierFooterContentBottomMmForOptions,
  dossierFooterVisualHeightMmForOptions,
  dossierHeaderContentTopMmForOptions,
  dossierHeaderVisualHeightMmForOptions,
  type DossierChromeOptions,
} from "@/lib/dossier-chrome";
''', "archetype import")
s = replace_once(s, '''  sidebarPct?: number,
): CvContentBox {
  const header = dossierHeaderVisualHeightMm("cv", pageIndex);
  const footer = dossierFooterVisualHeightMm("cv");''', '''  sidebarPct?: number,
  chrome: DossierChromeOptions = DEFAULT_DOSSIER_CHROME_OPTIONS,
): CvContentBox {
  const header = dossierHeaderVisualHeightMmForOptions(chrome, pageIndex);
  const footer = dossierFooterVisualHeightMmForOptions(chrome);''', "surface signature")
s = replace_once(s, "  const box = cvContentBox(frame, pageIndex, layout, sidebarPct);", "  const box = cvContentBox(frame, pageIndex, layout, sidebarPct, chrome);", "surface box")
s = replace_once(s, '''  sidebarPct?: number,
): CvContentBox {
  const top = dossierHeaderContentTopMm("cv", pageIndex);
  const bottom = dossierFooterContentBottomMm("cv");''', '''  sidebarPct?: number,
  chrome: DossierChromeOptions = DEFAULT_DOSSIER_CHROME_OPTIONS,
): CvContentBox {
  const top = dossierHeaderContentTopMmForOptions(chrome, pageIndex);
  const bottom = dossierFooterContentBottomMmForOptions(chrome);''', "content signature")
p.write_text(s)

# CvCanvas subscribes once and passes one snapshot to geometry and chrome rendering.
p = Path("src/components/cv/CvCanvas.tsx")
s = p.read_text()
s = replace_once(s, 'import { dossierThemeFor } from "@/lib/dossier-theme";\n', '''import { dossierThemeFor } from "@/lib/dossier-theme";
import {
  DEFAULT_DOSSIER_CHROME_STATE,
  getDossierChromeState,
  subscribeDossierChrome,
} from "@/lib/dossier-chrome";
''', "canvas import")
s = replace_once(s, '''  const frame = useMemo(() => cvFrameFor(design.template), [design.template]);
  // Die Auswahl im Aufbau-Picker gilt.''', '''  const frame = useMemo(() => cvFrameFor(design.template), [design.template]);
  const chromeState = useSyncExternalStore(
    subscribeDossierChrome,
    getDossierChromeState,
    () => DEFAULT_DOSSIER_CHROME_STATE,
  );
  const chromeOptions = chromeState.sync ? chromeState.shared : chromeState.cv;
  // Die Auswahl im Aufbau-Picker gilt.''', "canvas state")
for old_call, new_call in [
    ("cvContentBox(frame, 0, layout, sidebarPct)", "cvContentBox(frame, 0, layout, sidebarPct, chromeOptions)"),
    ("cvContentBox(frame, pageIndex, layout, sidebarPct)", "cvContentBox(frame, pageIndex, layout, sidebarPct, chromeOptions)"),
    ("cvSurface(frame, pageIndex, layout, sidebarPct)", "cvSurface(frame, pageIndex, layout, sidebarPct, chromeOptions)"),
]:
    if old_call not in s:
        raise SystemExit(f"missing canvas call: {old_call}")
    s = s.replace(old_call, new_call)
s = replace_once(s, '''  const shape = `${layoutChoice}|${layout}|${frame.id}|${design.font ?? "template"}|${placementShape}|${sectionLayoutShape}|${rows''', '''  const chromeShape = `${chromeOptions.headerMode}|${chromeOptions.footerMode}|${chromeOptions.headerShowName ? 1 : 0}|${chromeOptions.headerShowAddress ? 1 : 0}|${chromeOptions.headerShowPhone ? 1 : 0}|${chromeOptions.headerShowEmail ? 1 : 0}`;
  const shape = `${chromeShape}|${layoutChoice}|${layout}|${frame.id}|${design.font ?? "template"}|${placementShape}|${sectionLayoutShape}|${rows''', "shape")
s = replace_once(s, '''              template={design.template}
              colors={design.colors}
              contact={{''', '''              template={design.template}
              colors={design.colors}
              optionsOverride={chromeOptions}
              contact={{''', "chrome override")
p.write_text(s)

# Persist chrome with letter autosave/history while keeping v1 backward-compatible.
p = Path("src/components/letter/types.ts")
s = p.read_text()
s = replace_once(s, 'import { LETTER_STORAGE_KEY } from "@/lib/dossier-project";\n', 'import { LETTER_STORAGE_KEY } from "@/lib/dossier-project";\nimport type { DossierChromeState } from "@/lib/dossier-chrome";\n', "types import")
s = replace_once(s, '  /** Eigener, kompakter Kopf für das Anschreiben. Alte Saves fallen auf `compact` zurück. */\n  headerMode?: LetterHeaderMode;', '  /** @deprecated Legacy-/SSR-Kompatibilität. Live ist DossierChromeState kanonisch. */\n  headerMode?: LetterHeaderMode;', "header legacy")
s = replace_once(s, '  /** Briefspezifischer Fussbereich. Alte Saves behalten das kompakte Footerband. */\n  footerMode?: LetterFooterMode;', '  /** @deprecated Legacy-/SSR-Kompatibilität. Live ist DossierChromeState kanonisch. */\n  footerMode?: LetterFooterMode;', "footer legacy")
s = replace_once(s, '''export type SavedLetter = {
  version: 1;
  data: LetterData;
  design: LetterDesign;
};''', '''export type SavedLetter = {
  version: 1;
  data: LetterData;
  design: LetterDesign;
  /** Optional so existing v1 saves remain valid. */
  chrome?: DossierChromeState;
};''', "saved chrome")
p.write_text(s)

# Letter route subscribes to chrome; autosave/history snapshot and restore it atomically.
p = Path("src/routes/anschreiben.tsx")
s = p.read_text()
s = replace_once(s, 'import { useCallback, useEffect, useMemo, useRef, useState } from "react";\n', 'import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";\n', "react import")
s = replace_once(s, 'import { readPhoto } from "@/lib/image";\n', '''import { readPhoto } from "@/lib/image";
import {
  DEFAULT_DOSSIER_CHROME_STATE,
  applyPortableDossierChromeState,
  getDossierChromeState,
  subscribeDossierChrome,
} from "@/lib/dossier-chrome";
''', "route import")
s = replace_once(s, '''  const [design, setDesign] = useState<LetterDesign>(emptyLetterDesign);
  const [hydrated, setHydrated] = useState(false);''', '''  const [design, setDesign] = useState<LetterDesign>(emptyLetterDesign);
  const chromeState = useSyncExternalStore(
    subscribeDossierChrome,
    getDossierChromeState,
    () => DEFAULT_DOSSIER_CHROME_STATE,
  );
  const [hydrated, setHydrated] = useState(false);''', "route subscription")
needle = '        if (parsed.design) nextDesign = normalizeLetterDesign(parsed.design);\n'
s = replace_once(s, needle, needle + '        if (parsed.chrome) applyPortableDossierChromeState(parsed.chrome);\n', "initial restore")
needle = '      if (parsed.design) setDesign(normalizeLetterDesign(parsed.design));\n'
s = replace_once(s, needle, needle + '      if (parsed.chrome) applyPortableDossierChromeState(parsed.chrome);\n', "foreign restore")
s = replace_once(s, '''  const snapshotPayload = useCallback(
    (): SavedLetter => ({ version: 1, data, design }),
    [data, design],
  );''', '''  const snapshotPayload = useCallback(
    (): SavedLetter => ({ version: 1, data, design, chrome: chromeState }),
    [data, design, chromeState],
  );''', "snapshot")
s = replace_once(s, '    if (saved.design) setDesign(normalizeLetterDesign(saved.design));\n    setMenuOpen(false);', '    if (saved.design) setDesign(normalizeLetterDesign(saved.design));\n    if (saved.chrome) applyPortableDossierChromeState(saved.chrome);\n    setMenuOpen(false);', "history restore")
p.write_text(s)

# Make the legacy fallback explicit in LetterCanvas.
p = Path("src/components/letter/LetterCanvas.tsx")
s = p.read_text()
s = replace_once(s, 'function chromeFromDesign(design: LetterDesign): DossierChromeOptions {', '/** Legacy/SSR adapter only. Live DossierChromeState is the single source of truth. */\nfunction legacyChromeFromDesign(design: LetterDesign): DossierChromeOptions {', "legacy adapter")
s = s.replace("chromeFromDesign(design)", "legacyChromeFromDesign(design)")
p.write_text(s)

# Focused deterministic geometry guard.
Path("tests/unit/dossier-chrome-geometry.test.ts").write_text('''import { describe, expect, test } from "bun:test";
import { cvContentBox, cvFrameFor, cvSurface } from "../../src/components/cv/archetype";
import {
  DEFAULT_DOSSIER_CHROME_OPTIONS,
  dossierFooterContentBottomMmForOptions,
  dossierHeaderContentTopMmForOptions,
  type DossierChromeOptions,
} from "../../src/lib/dossier-chrome";

const contact: DossierChromeOptions = {
  ...DEFAULT_DOSSIER_CHROME_OPTIONS,
  headerMode: "contact",
  footerMode: "details",
};
const none: DossierChromeOptions = {
  ...DEFAULT_DOSSIER_CHROME_OPTIONS,
  headerMode: "none",
  footerMode: "none",
};

describe("pure dossier chrome geometry", () => {
  test("option helpers need no browser/store state", () => {
    expect(dossierHeaderContentTopMmForOptions(contact, 0)).toBe(31);
    expect(dossierHeaderContentTopMmForOptions(none, 0)).toBe(18);
    expect(dossierFooterContentBottomMmForOptions(contact)).toBe(20);
    expect(dossierFooterContentBottomMmForOptions(none)).toBe(10);
  });

  test("CV geometry follows the explicit chrome snapshot", () => {
    const frame = cvFrameFor("modern");
    expect(cvContentBox(frame, 0, "classic", 0.3, contact)).toMatchObject({ top: 31, bottom: 20 });
    expect(cvContentBox(frame, 0, "classic", 0.3, none)).toMatchObject({ top: 18, bottom: 10 });
    expect(cvSurface(frame, 0, "classic", 0.3, contact)).toMatchObject({ top: 22, bottom: 10 });
    expect(cvSurface(frame, 0, "classic", 0.3, none)).toMatchObject({ top: 0, bottom: 0 });
  });
});
''')

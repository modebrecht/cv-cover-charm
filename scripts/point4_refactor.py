from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text()


def write(path: str, text: str) -> None:
    Path(path).write_text(text)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"expected exactly one {label}, found {count}")
    return text.replace(old, new, 1)


def replace_range(
    text: str,
    start: str,
    end: str,
    replacement: str,
    label: str,
    *,
    keep_end: bool = False,
) -> str:
    a = text.find(start)
    if a < 0:
        raise SystemExit(f"missing start marker: {label}")
    b = text.find(end, a + len(start))
    if b < 0:
        raise SystemExit(f"missing end marker: {label}")
    if keep_end:
        return text[:a] + replacement + text[b:]
    return text[:a] + replacement + text[b + len(end) :]


chrome_import = '''import {
  DEFAULT_DOSSIER_CHROME_STATE,
  getDossierChromeState,
  subscribeDossierChrome,
} from "@/lib/dossier-chrome";
'''

# 1) Shared visual chrome becomes a pure presentational component.
path = "src/components/dossier/DossierHeaderFooterChrome.tsx"
s = read(path)
marker = "export function DossierHeaderFooterChrome("
idx = s.find(marker)
if idx < 0:
    raise SystemExit("missing shared chrome component")
s = '''import { cvPalette, onColorRoles } from "@/components/cv/palette";
import type {
  DossierChromeContact,
  DossierChromeOptions,
  DossierChromeScope,
} from "@/lib/dossier-chrome";

''' + s[idx:]
s = replace_once(s, "  optionsOverride,\n", "  options,\n", "chrome options destructure")
s = replace_once(
    s,
    "  optionsOverride?: DossierChromeOptions;\n",
    "  options: DossierChromeOptions;\n",
    "chrome options prop",
)
s = replace_range(
    s,
    "  const state = useSyncExternalStore(",
    "  const headerMode =",
    "  const resolvedContact = contact;\n",
    "chrome store subscription",
    keep_end=True,
)
s = replace_range(
    s,
    "  const resolvedFooterLeft =",
    "\n\n  return (",
    "  const resolvedFooterLeft = footerLeft;",
    "chrome footer context",
    keep_end=True,
)
write(path, s)

# 2) Letter canvas consumes an explicit snapshot; design is the static legacy fallback.
path = "src/components/letter/LetterCanvas.tsx"
s = read(path)
s = replace_once(
    s,
    'import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";',
    'import { useEffect, useMemo, useRef } from "react";',
    "letter react import",
)
s = replace_range(
    s,
    "import {\n  DEFAULT_DOSSIER_CHROME_STATE,",
    '} from "@/lib/dossier-chrome";\n',
    'import type { DossierChromeOptions } from "@/lib/dossier-chrome";\n',
    "letter chrome import",
)
s = replace_once(
    s,
    "  exportMode = false,\n",
    "  exportMode = false,\n  chromeOptions,\n",
    "letter chrome destructure",
)
s = replace_once(
    s,
    "  exportMode?: boolean;\n",
    "  exportMode?: boolean;\n  chromeOptions?: DossierChromeOptions;\n",
    "letter chrome prop",
)
s = replace_range(
    s,
    "  const chromeState = useSyncExternalStore(",
    "  const effectiveDesign =",
    "  const chrome = chromeOptions ?? legacyChromeFromDesign(design);\n",
    "letter live chrome subscription",
    keep_end=True,
)
s = replace_once(
    s,
    "        optionsOverride={chrome}\n",
    "        options={chrome}\n",
    "letter visual chrome prop",
)
write(path, s)

# 3) CV public canvas becomes a pure snapshot adapter.
write(
    "src/components/cv/CvCanvas.tsx",
    '''import { useMemo, type ComponentProps } from "react";
import {
  DEFAULT_DOSSIER_CHROME_OPTIONS,
  type DossierChromeContact,
  type DossierChromeOptions,
} from "@/lib/dossier-chrome";
import { CvCanvas as BaseCvCanvas } from "./CvCanvasBase";
import type { CvData } from "./types";

export type { CvLayoutWarning } from "./CvCanvasBase";

type BaseProps = ComponentProps<typeof BaseCvCanvas>;
type Props = Omit<BaseProps, "chromeOptions" | "chromeContact"> & {
  chromeOptions?: DossierChromeOptions;
};

function contactFromCv(data: CvData): DossierChromeContact {
  const person = data.person;
  return {
    name: [person.vorname, person.nachname].filter(Boolean).join(" "),
    address: person.adresse ?? "",
    place: person.plzOrt ?? "",
    phone: person.telefon ?? "",
    email: person.email ?? "",
  };
}

function cvBodyData(data: CvData, options: DossierChromeOptions): CvData {
  if (options.headerMode !== "contact") return data;
  const person = data.person;
  const hasName = !!(person.vorname?.trim() || person.nachname?.trim());
  return {
    ...data,
    person: {
      ...person,
      ...(options.headerShowName && hasName ? { vorname: "\\u200b", nachname: "" } : {}),
      ...(options.headerShowAddress ? { adresse: "", plzOrt: "" } : {}),
      ...(options.headerShowPhone ? { telefon: "" } : {}),
      ...(options.headerShowEmail ? { email: "" } : {}),
    },
  };
}

/** Pure snapshot adapter: no dossier-chrome store reads happen below the route/editor boundary. */
export function CvCanvas({
  chromeOptions = DEFAULT_DOSSIER_CHROME_OPTIONS,
  ...props
}: Props) {
  const contact = useMemo(() => contactFromCv(props.data), [props.data]);
  const data = useMemo(() => cvBodyData(props.data, chromeOptions), [props.data, chromeOptions]);

  return (
    <BaseCvCanvas
      {...props}
      data={data}
      chromeOptions={chromeOptions}
      chromeContact={contact}
    />
  );
}
''',
)

# 4) CV base gets one explicit snapshot for geometry and visual chrome.
path = "src/components/cv/CvCanvasBase.tsx"
s = read(path)
s = replace_range(
    s,
    "import {\n  DEFAULT_DOSSIER_CHROME_STATE,",
    '} from "@/lib/dossier-chrome";\n',
    'import type { DossierChromeContact, DossierChromeOptions } from "@/lib/dossier-chrome";\n',
    "cv base chrome import",
)
s = replace_once(
    s,
    "  elements: CustomField[];\n",
    "  elements: CustomField[];\n  chromeOptions: DossierChromeOptions;\n  chromeContact: DossierChromeContact;\n",
    "cv base chrome props",
)
s = replace_once(
    s,
    "  elements,\n  exportMode = false,\n",
    "  elements,\n  chromeOptions,\n  chromeContact,\n  exportMode = false,\n",
    "cv base chrome destructure",
)
s = replace_range(
    s,
    "  const chromeState = useSyncExternalStore(",
    "  // Die Auswahl im Aufbau-Picker gilt.",
    "",
    "cv base live chrome subscription",
    keep_end=True,
)
s = replace_once(
    s,
    "        const box = cvContentBox(frame, i, layout, sidebarPct);\n",
    "        const box = cvContentBox(frame, i, layout, sidebarPct, chromeOptions);\n",
    "cv page explicit geometry",
)
s = replace_once(
    s,
    "              optionsOverride={chromeOptions}\n",
    "              options={chromeOptions}\n",
    "cv visual chrome prop",
)
s = replace_range(
    s,
    "              contact={{\n",
    "              pageIndex={i}\n",
    "              contact={chromeContact}\n",
    "cv explicit contact",
    keep_end=True,
)
s = replace_once(
    s,
    '              footerLeft={name || "Lebenslauf"}\n',
    '              footerLeft={chromeContact.name || "Lebenslauf"}\n',
    "cv footer contact",
)
write(path, s)

# 5) Combined PDF renderer is snapshot-only.
write(
    "src/components/dossier/DossierPdfCanvas.tsx",
    '''import { forwardRef } from "react";
import "@/components/cover/fresh-templates";
import { CoverCanvas } from "@/components/cover/CoverCanvas";
import { CvCanvas } from "@/components/cv/CvCanvas";
import type { CvLayoutWarning } from "@/components/cv/CvCanvas";
import { LetterCanvas } from "@/components/letter/LetterCanvas";
import {
  letterPdfDocumentFromSaved,
  type CoverPdfDocument,
  type CvPdfDocument,
  type LetterPdfDocument,
} from "@/lib/dossier-pdf-document";
import { LETTER_STORAGE_KEY, readStoredDossierPart } from "@/lib/dossier-project";
import {
  DEFAULT_DOSSIER_CHROME_STATE,
  type DossierChromeState,
} from "@/lib/dossier-chrome";

const ignoreSelection = () => {};
const ignoreMove = () => {};

/** Unsichtbarer 1:1-Drucksatz: Titelblatt, Anschreiben, danach sämtliche CV-Seiten. */
export const DossierPdfCanvas = forwardRef<
  HTMLDivElement,
  {
    cover: CoverPdfDocument | null;
    /** Optional explizit übergeben; bestehende Editoren lesen sonst den gespeicherten Brief. */
    letter?: LetterPdfDocument | null;
    cv: CvPdfDocument | null;
    chromeState?: DossierChromeState;
    onCvLayoutWarnings?: (warnings: CvLayoutWarning[]) => void;
    onCvPageCount?: (count: number) => void;
  }
>(function DossierPdfCanvas(
  {
    cover,
    letter,
    cv,
    chromeState = DEFAULT_DOSSIER_CHROME_STATE,
    onCvLayoutWarnings,
    onCvPageCount,
  },
  ref,
) {
  const letterChromeOptions = chromeState.sync ? chromeState.shared : chromeState.letter;
  const cvChromeOptions = chromeState.sync ? chromeState.shared : chromeState.cv;
  const storedLetter =
    letter === undefined
      ? letterPdfDocumentFromSaved(readStoredDossierPart(LETTER_STORAGE_KEY))
      : letter;

  return (
    <div ref={ref}>
      {cover ? (
        <CoverCanvas
          template={cover.template}
          data={cover.data}
          colors={cover.colors}
          blocks={cover.blocks}
          selected={null}
          onSelect={ignoreSelection}
          onMove={ignoreMove}
          fontScale={cover.fontScale}
          editable={false}
        />
      ) : null}
      {storedLetter ? (
        <div data-dossier-document="letter">
          <LetterCanvas
            data={storedLetter.data}
            design={storedLetter.design}
            chromeOptions={letterChromeOptions}
            exportMode
          />
        </div>
      ) : null}
      {cv ? (
        <CvCanvas
          data={cv.data}
          design={cv.design}
          chromeOptions={cvChromeOptions}
          elements={cv.elements}
          elementStyles={cv.elementStyles}
          exportMode
          onLayoutWarnings={onCvLayoutWarnings}
          onPageCount={onCvPageCount}
        />
      ) : null}
    </div>
  );
});
''',
)

# 6) Letter route already owns the subscription; pass its scoped snapshot down.
path = "src/routes/anschreiben.tsx"
s = read(path)
state_block = '''  const chromeState = useSyncExternalStore(
    subscribeDossierChrome,
    getDossierChromeState,
    () => DEFAULT_DOSSIER_CHROME_STATE,
  );
'''
s = replace_once(
    s,
    state_block,
    state_block + "  const chromeOptions = chromeState.sync ? chromeState.shared : chromeState.letter;\n",
    "letter route snapshot",
)
s = replace_once(
    s,
    "                design={design}\n                onOverflowChange=",
    "                design={design}\n                chromeOptions={chromeOptions}\n                onOverflowChange=",
    "letter preview snapshot",
)
s = replace_once(
    s,
    "            design={design}\n            exportMode\n",
    "            design={design}\n            chromeOptions={chromeOptions}\n            exportMode\n",
    "letter export snapshot",
)
write(path, s)

# 7) CV route owns one snapshot for preview, standalone export and combined PDF.
path = "src/routes/lebenslauf.tsx"
s = read(path)
s = replace_once(
    s,
    'import { useCallback, useEffect, useMemo, useRef, useState } from "react";',
    'import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";',
    "cv route react import",
)
anchor = 'import { SIDEBAR_PCT_MAX, SIDEBAR_PCT_MIN } from "@/components/cv/archetype";\n'
s = replace_once(s, anchor, anchor + chrome_import, "cv route chrome import")
s = replace_once(
    s,
    "function Lebenslauf() {\n",
    '''function Lebenslauf() {
  const chromeState = useSyncExternalStore(
    subscribeDossierChrome,
    getDossierChromeState,
    () => DEFAULT_DOSSIER_CHROME_STATE,
  );
  const chromeOptions = chromeState.sync ? chromeState.shared : chromeState.cv;
''',
    "cv route snapshot",
)
s = replace_once(
    s,
    "      design={design}\n      elements={elements}\n",
    "      design={design}\n      chromeOptions={chromeOptions}\n      elements={elements}\n",
    "cv preview snapshot",
)
s = replace_once(
    s,
    "          design={design}\n          elements={elements}\n          elementStyles={elementStyles}\n          exportMode\n",
    "          design={design}\n          chromeOptions={chromeOptions}\n          elements={elements}\n          elementStyles={elementStyles}\n          exportMode\n",
    "cv standalone snapshot",
)
s = replace_once(
    s,
    "            cv={currentCvDocument}\n",
    "            cv={currentCvDocument}\n            chromeState={chromeState}\n",
    "cv dossier snapshot",
)
write(path, s)

# 8) Title-page dossier export owns its snapshot.
path = "src/routes/titelblatt.tsx"
s = read(path)
s = replace_once(
    s,
    'import { useCallback, useEffect, useMemo, useRef, useState } from "react";',
    'import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";',
    "cover route react import",
)
anchor = 'import { DEFAULTS, FONT, PAGE, PDF, PREVIEW, SHAPE } from "@/default-config";\n'
s = replace_once(s, anchor, anchor + chrome_import, "cover route chrome import")
s = replace_once(
    s,
    "function Titelblatt() {\n",
    '''function Titelblatt() {
  const chromeState = useSyncExternalStore(
    subscribeDossierChrome,
    getDossierChromeState,
    () => DEFAULT_DOSSIER_CHROME_STATE,
  );
''',
    "cover route snapshot",
)
s = replace_once(
    s,
    "            cv={storedCvDocument}\n",
    "            cv={storedCvDocument}\n            chromeState={chromeState}\n",
    "cover dossier snapshot",
)
write(path, s)

# 9) Start-page dossier export owns its snapshot.
path = "src/routes/index.tsx"
s = read(path)
s = replace_once(
    s,
    'import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";',
    'import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";',
    "index react import",
)
anchor = '''import {
  COVER_STORAGE_KEY,
  CV_STORAGE_KEY,
  LETTER_STORAGE_KEY,
  readStoredDossierPart,
} from "@/lib/dossier-project";
'''
s = replace_once(s, anchor, anchor + chrome_import, "index chrome import")
s = replace_once(
    s,
    "function Start() {\n",
    '''function Start() {
  const chromeState = useSyncExternalStore(
    subscribeDossierChrome,
    getDossierChromeState,
    () => DEFAULT_DOSSIER_CHROME_STATE,
  );
''',
    "index snapshot",
)
s = replace_once(
    s,
    "            cv={documents.cv}\n",
    "            cv={documents.cv}\n            chromeState={chromeState}\n",
    "index dossier snapshot",
)
write(path, s)

# 10) Lock the architecture boundary in a regression test.
write(
    "tests/unit/dossier-chrome-renderer-boundary.test.ts",
    '''import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

const read = (path: string) => readFileSync(path, "utf8");

describe("dossier chrome renderer boundary", () => {
  test("renderers consume explicit snapshots and never subscribe to the global chrome store", () => {
    const renderers = [
      "src/components/dossier/DossierHeaderFooterChrome.tsx",
      "src/components/dossier/DossierPdfCanvas.tsx",
      "src/components/letter/LetterCanvas.tsx",
      "src/components/cv/CvCanvas.tsx",
      "src/components/cv/CvCanvasBase.tsx",
    ];
    for (const path of renderers) {
      const source = read(path);
      expect(source).not.toContain("subscribeDossierChrome");
      expect(source).not.toContain("getDossierChromeState");
    }
  });

  test("shared chrome is presentational and receives options explicitly", () => {
    const source = read("src/components/dossier/DossierHeaderFooterChrome.tsx");
    expect(source).toContain("options: DossierChromeOptions");
    expect(source).not.toContain("optionsOverride");
    expect(source).not.toContain("useSyncExternalStore");
  });

  test("CV geometry and visual chrome use the same explicit snapshot", () => {
    const source = read("src/components/cv/CvCanvasBase.tsx");
    expect(source).toContain("chromeOptions: DossierChromeOptions");
    expect(source).toContain("cvContentBox(frame, i, layout, sidebarPct, chromeOptions)");
    expect(source).toContain("options={chromeOptions}");
  });
});
''',
)

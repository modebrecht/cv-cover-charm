from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match for {old!r}, found {count}")
    file.write_text(text.replace(old, new, 1))


def replace_count(path: str, old: str, new: str, expected: int) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != expected:
        raise SystemExit(f"{path}: expected {expected} matches for {old!r}, found {count}")
    file.write_text(text.replace(old, new))


path = "src/lib/dossier-chrome.ts"
replace_once(path, "  headerGapMm: 6,", "  headerGapMm: 12,")
replace_once(path, "?? fallback.headerGapMm ?? 6", "?? fallback.headerGapMm ?? 12")
replace_once(
    path,
    "design.headerGapMm === (options.headerGapMm ?? 6)",
    "design.headerGapMm === (options.headerGapMm ?? 12)",
)
replace_once(
    path,
    "headerGapMm: options.headerGapMm ?? 6,",
    "headerGapMm: options.headerGapMm ?? 12,",
)
replace_once(path, "options.headerGapMm ?? 6", "options.headerGapMm ?? 12")

path = "src/components/letter/LetterCanvas.tsx"
replace_once(path, "    headerGapMm: 6,", "    headerGapMm: 12,")
replace_once(path, "chrome.headerGapMm ?? 6", "chrome.headerGapMm ?? 12")

path = "src/components/dossier/DossierChromeControls.tsx"
replace_once(
    path,
    "  const headerGap = options.headerGapMm ?? 6;",
    "  const headerGap = options.headerGapMm ?? 12;",
)
replace_once(
    path,
    "                  <span>Abstand nach Header</span>",
    "                  <span>Freiraum unter dem Header</span>",
)
replace_once(path, "                {headerGap !== 6 ? (", "                {headerGap !== 12 ? (")
replace_once(
    path,
    "                    onClick={() => patchOptions({ headerGapMm: 6 })}",
    "                    onClick={() => patchOptions({ headerGapMm: 12 })}",
)
replace_once(
    path,
    "                    Standardabstand",
    "                    Standardabstand (12 mm)",
)

controls = Path(path)
text = controls.read_text()
marker = '''                <input
                  data-dossier-header-gap-control
                  type="range"
                  min={0}
                  max={40}
                  step={1}
                  value={Math.min(40, Math.max(0, headerGap))}
                  onChange={(event) => patchOptions({ headerGapMm: Number(event.target.value) })}
                  className="w-full accent-primary"
                />
'''
helper = '''                <span className="text-[11px] leading-relaxed text-muted-foreground">
                  Abstand zwischen Header-Ende und dem ersten Inhalt.
                </span>
'''
if text.count(marker) != 1:
    raise SystemExit("header gap slider marker missing")
controls.write_text(text.replace(marker, marker + helper, 1))

path = "tests/unit/dossier-header-gap.test.ts"
replace_once(
    path,
    "defaults to 6 mm and clamps persisted values to 0–40 mm",
    "defaults to 12 mm and clamps persisted values to 0–40 mm",
)
replace_once(
    path,
    "expect(DEFAULT_DOSSIER_CHROME_OPTIONS.headerGapMm).toBe(6);",
    "expect(DEFAULT_DOSSIER_CHROME_OPTIONS.headerGapMm).toBe(12);",
)
replace_once(
    path,
    "expect(legacy.shared.headerGapMm).toBe(6);",
    "expect(legacy.shared.headerGapMm).toBe(12);",
)
replace_once(
    path,
    'expect(controls).toContain("<span>Abstand nach Header</span>");',
    'expect(controls).toContain("<span>Freiraum unter dem Header</span>");',
)
replace_once(
    path,
    'expect(controls).toContain("headerGapMm: 6");',
    'expect(controls).toContain("headerGapMm: 12");',
)
replace_once(
    path,
    'expect(letterCanvas).toContain("chrome.headerGapMm ?? 6");',
    'expect(letterCanvas).toContain("chrome.headerGapMm ?? 12");',
)

path = "tests/unit/dossier-chrome-geometry.test.ts"
replace_once(
    path,
    "expect(dossierHeaderContentTopMmForOptions(contact, 0)).toBe(37);",
    "expect(dossierHeaderContentTopMmForOptions(contact, 0)).toBe(43);",
)
replace_once(
    path,
    "toMatchObject({ top: 37, bottom: 20 })",
    "toMatchObject({ top: 43, bottom: 20 })",
)

path = "tests/unit/dossier-sheet-background.test.tsx"
replace_once(
    path,
    "// common chrome plus the default 6 mm post-header gap owns the text top.",
    "// common chrome plus the default 12 mm post-header gap owns the text top.",
)
replace_once(
    path,
    'expect(letterLayoutFor("modern").top).toBe(27);',
    'expect(letterLayoutFor("modern").top).toBe(33);',
)
replace_once(
    path,
    'expect(letterLayoutFor("freundlich").top).toBe(27);',
    'expect(letterLayoutFor("freundlich").top).toBe(33);',
)

path = "tests/unit/dossier-chrome-customization.test.tsx"
replace_once(
    path,
    "expect(dossierHeaderContentTopMmForOptions(options)).toBe(45);",
    "expect(dossierHeaderContentTopMmForOptions(options)).toBe(51);",
)

path = "tests/unit/letter-compact-header.test.tsx"
replace_count(path, 'expect(contact).toContain("top:37mm");', 'expect(contact).toContain("top:43mm");', 1)
replace_count(path, 'expect(markup).toContain("top:37mm");', 'expect(markup).toContain("top:43mm");', 1)

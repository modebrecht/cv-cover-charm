from pathlib import Path

# 1) Persisted LetterDesign setting + normalization.
path = Path('src/components/letter/types.ts')
text = path.read_text()
old = '''export const LETTER_ROLE_FONT_SIZE_MIN = 7;\nexport const LETTER_ROLE_FONT_SIZE_MAX = 30;'''
new = '''export const LETTER_ROLE_FONT_SIZE_MIN = 7;\nexport const LETTER_ROLE_FONT_SIZE_MAX = 30;\nexport const LETTER_BODY_FONT_SIZE_MIN = 8;\nexport const LETTER_BODY_FONT_SIZE_MAX = 16;\nexport const DEFAULT_LETTER_BODY_FONT_SIZE_PT = 10.5;'''
assert old in text, 'letter font constants insertion point changed'
text = text.replace(old, new, 1)
old = '''  /** Eigene Typografie für den Betreff; fehlt = wie Vorlage. */\n  subjectTypography?: LetterRoleTypography;\n  /** @deprecated Legacy-/SSR-Kompatibilität. Live ist DossierChromeState kanonisch. */'''
new = '''  /** Eigene Typografie für den Betreff; fehlt = wie Vorlage. */\n  subjectTypography?: LetterRoleTypography;\n  /** Globale Schriftgrösse des eigentlichen Brief-Fliesstexts; fehlt = Vorlagengrösse. */\n  bodyFontSizePt?: number;\n  /** @deprecated Legacy-/SSR-Kompatibilität. Live ist DossierChromeState kanonisch. */'''
assert old in text, 'LetterDesign insertion point changed'
text = text.replace(old, new, 1)
old = '''export function normalizeLetterRoleTypography(value: unknown): LetterRoleTypography | undefined {'''
new = '''export function normalizeLetterBodyFontSizePt(value: unknown): number | undefined {\n  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;\n  const stepped = Math.round(value * 2) / 2;\n  return Math.min(LETTER_BODY_FONT_SIZE_MAX, Math.max(LETTER_BODY_FONT_SIZE_MIN, stepped));\n}\n\nexport function normalizeLetterRoleTypography(value: unknown): LetterRoleTypography | undefined {'''
assert old in text, 'body size normalizer insertion point changed'
text = text.replace(old, new, 1)
old = '''    subjectTypography: normalizeLetterRoleTypography(incoming.subjectTypography),\n    headerMode,'''
new = '''    subjectTypography: normalizeLetterRoleTypography(incoming.subjectTypography),\n    bodyFontSizePt: normalizeLetterBodyFontSizePt(incoming.bodyFontSizePt),\n    headerMode,'''
assert old in text, 'normalizeLetterDesign insertion point changed'
text = text.replace(old, new, 1)
path.write_text(text)

# 2) Compact control next to existing letter typography controls.
path = Path('src/components/letter/LetterLayoutControls.tsx')
text = path.read_text()
old = '''  LETTER_ROLE_FONT_SIZE_MAX,\n  LETTER_ROLE_FONT_SIZE_MIN,'''
new = '''  DEFAULT_LETTER_BODY_FONT_SIZE_PT,\n  LETTER_BODY_FONT_SIZE_MAX,\n  LETTER_BODY_FONT_SIZE_MIN,\n  LETTER_ROLE_FONT_SIZE_MAX,\n  LETTER_ROLE_FONT_SIZE_MIN,'''
assert old in text, 'LetterLayoutControls import insertion point changed'
text = text.replace(old, new, 1)
marker = '''export function LetterLayoutControls({'''
control = '''function BodyFontSizeControl({\n  value,\n  onChange,\n}: {\n  value?: number;\n  onChange: (value: number | undefined) => void;\n}) {\n  const size = Math.max(\n    LETTER_BODY_FONT_SIZE_MIN,\n    Math.min(LETTER_BODY_FONT_SIZE_MAX, value ?? DEFAULT_LETTER_BODY_FONT_SIZE_PT),\n  );\n\n  return (\n    <div\n      data-letter-body-font-size-control\n      className="grid gap-2 rounded-md border bg-muted/20 p-2.5"\n    >\n      <div className="flex items-start justify-between gap-2">\n        <div>\n          <div className="text-xs font-semibold">Fliesstext – Schriftgrösse</div>\n          <div className="text-[11px] text-muted-foreground">\n            Gilt für den eigentlichen Text des Motivationsschreibens.\n          </div>\n        </div>\n        {value !== undefined ? (\n          <button type="button" className={smallButtonClass} onClick={() => onChange(undefined)}>\n            Vorlage\n          </button>\n        ) : null}\n      </div>\n\n      <label className="grid gap-1 text-xs">\n        <span className="flex items-center justify-between gap-2 text-muted-foreground">\n          <span>Schriftgrösse</span>\n          <span>{size.toFixed(size % 1 ? 1 : 0)} pt</span>\n        </span>\n        <input\n          type="range"\n          min={LETTER_BODY_FONT_SIZE_MIN}\n          max={LETTER_BODY_FONT_SIZE_MAX}\n          step={0.5}\n          value={size}\n          onChange={(event) => onChange(Number(event.target.value))}\n          className="w-full accent-primary"\n          aria-label="Fliesstext Schriftgrösse"\n        />\n        {value === undefined ? (\n          <span className="text-[11px] text-muted-foreground">Vorlagengrösse</span>\n        ) : null}\n      </label>\n    </div>\n  );\n}\n\n'''
assert marker in text, 'LetterLayoutControls component marker changed'
text = text.replace(marker, control + marker, 1)
old = '''        <TypographyRoleControl\n          label="Betreff"\n          value={design.subjectTypography}\n          fallbackSize={12}\n          fallbackBold={true}\n          onChange={(subjectTypography) => onChange({ subjectTypography })}\n        />\n\n        <div className="grid gap-2 rounded-md border p-2.5">'''
new = '''        <TypographyRoleControl\n          label="Betreff"\n          value={design.subjectTypography}\n          fallbackSize={12}\n          fallbackBold={true}\n          onChange={(subjectTypography) => onChange({ subjectTypography })}\n        />\n        <BodyFontSizeControl\n          value={design.bodyFontSizePt}\n          onChange={(bodyFontSizePt) => onChange({ bodyFontSizePt })}\n        />\n\n        <div className="grid gap-2 rounded-md border p-2.5">'''
assert old in text, 'body font control render insertion point changed'
text = text.replace(old, new, 1)
path.write_text(text)

# 3) Renderer + explicit user-owned CSS override. Pagination already remeasures on design changes.
path = Path('src/components/letter/LetterCanvas.tsx')
text = path.read_text()
old = '''  DEFAULT_LETTER_CLOSING_GAP_MM,\n  DEFAULT_LETTER_SIGNATURE_GAP_MM,\n  LETTER_ROLE_FONT_SIZE_MAX,'''
new = '''  DEFAULT_LETTER_CLOSING_GAP_MM,\n  DEFAULT_LETTER_SIGNATURE_GAP_MM,\n  LETTER_BODY_FONT_SIZE_MAX,\n  LETTER_BODY_FONT_SIZE_MIN,\n  LETTER_ROLE_FONT_SIZE_MAX,'''
assert old in text, 'LetterCanvas import insertion point changed'
text = text.replace(old, new, 1)
old = '''  const subjectSize = roleSize(subjectTypography);\n  const senderColor = roleColor(senderTypography);'''
new = '''  const subjectSize = roleSize(subjectTypography);\n  const bodySize =\n    typeof design.bodyFontSizePt === "number" && Number.isFinite(design.bodyFontSizePt)\n      ? Math.max(\n          LETTER_BODY_FONT_SIZE_MIN,\n          Math.min(LETTER_BODY_FONT_SIZE_MAX, design.bodyFontSizePt),\n        )\n      : undefined;\n  const senderColor = roleColor(senderTypography);'''
assert old in text, 'LetterCanvas body size insertion point changed'
text = text.replace(old, new, 1)
old = '''      data-letter-user-subject-decoration={\n        subjectTypography?.underline === undefined ? undefined : "true"\n      }\n      className="relative h-[1123px] w-[794px] overflow-hidden bg-white shadow-xl"'''
new = '''      data-letter-user-subject-decoration={\n        subjectTypography?.underline === undefined ? undefined : "true"\n      }\n      data-letter-user-body-size={bodySize !== undefined ? "true" : undefined}\n      className="relative h-[1123px] w-[794px] overflow-hidden bg-white shadow-xl"'''
assert old in text, 'LetterCanvas body data attribute insertion point changed'
text = text.replace(old, new, 1)
old = '''          "--letter-user-subject-decoration":\n            subjectTypography?.underline === undefined\n              ? undefined\n              : subjectTypography.underline\n                ? "underline"\n                : "none",\n        } as React.CSSProperties'''
new = '''          "--letter-user-subject-decoration":\n            subjectTypography?.underline === undefined\n              ? undefined\n              : subjectTypography.underline\n                ? "underline"\n                : "none",\n          "--letter-user-body-size": bodySize !== undefined ? `${bodySize}pt` : undefined,\n        } as React.CSSProperties'''
assert old in text, 'LetterCanvas CSS variable insertion point changed'
text = text.replace(old, new, 1)
path.write_text(text)

path = Path('src/components/letter/letter-user-typography.css')
text = path.read_text()
addition = '''\n\n/* Global body size is deliberately narrower than the role controls and user-owned. */\n[data-letter-page][data-letter-user-body-size="true"] [data-letter-pdf-richtext="body"],\n[data-letter-page][data-letter-user-body-size="true"] [data-letter-pdf-richtext="body"] * {\n  font-size: var(--letter-user-body-size) !important;\n}\n'''
assert 'data-letter-user-body-size' not in text, 'body-size CSS already exists'
path.write_text(text.rstrip() + addition)

# 4) Regression coverage.
path = Path('tests/unit/letter-body-font-size.test.ts')
path.write_text('''import { describe, expect, test } from "bun:test";\nimport { readFileSync } from "node:fs";\nimport {\n  DEFAULT_LETTER_BODY_FONT_SIZE_PT,\n  LETTER_BODY_FONT_SIZE_MAX,\n  LETTER_BODY_FONT_SIZE_MIN,\n  emptyLetterDesign,\n  normalizeLetterDesign,\n} from "../../src/components/letter/types";\n\nconst controls = readFileSync(\n  new URL("../../src/components/letter/LetterLayoutControls.tsx", import.meta.url),\n  "utf8",\n);\nconst canvas = readFileSync(\n  new URL("../../src/components/letter/LetterCanvas.tsx", import.meta.url),\n  "utf8",\n);\nconst css = readFileSync(\n  new URL("../../src/components/letter/letter-user-typography.css", import.meta.url),\n  "utf8",\n);\n\ndescribe("letter body font size", () => {\n  test("keeps template size as the default and normalizes explicit overrides", () => {\n    expect(emptyLetterDesign().bodyFontSizePt).toBeUndefined();\n    expect(DEFAULT_LETTER_BODY_FONT_SIZE_PT).toBe(10.5);\n    expect(LETTER_BODY_FONT_SIZE_MIN).toBe(8);\n    expect(LETTER_BODY_FONT_SIZE_MAX).toBe(16);\n\n    expect(normalizeLetterDesign({ ...emptyLetterDesign(), bodyFontSizePt: 7 }).bodyFontSizePt).toBe(8);\n    expect(normalizeLetterDesign({ ...emptyLetterDesign(), bodyFontSizePt: 17 }).bodyFontSizePt).toBe(16);\n    expect(normalizeLetterDesign({ ...emptyLetterDesign(), bodyFontSizePt: 11.24 }).bodyFontSizePt).toBe(11);\n    expect(normalizeLetterDesign({ ...emptyLetterDesign(), bodyFontSizePt: 11.26 }).bodyFontSizePt).toBe(11.5);\n  });\n\n  test("offers the requested compact 8–16 pt control with half-point steps", () => {\n    expect(controls).toContain("data-letter-body-font-size-control");\n    expect(controls).toContain("Fliesstext – Schriftgrösse");\n    expect(controls).toContain("min={LETTER_BODY_FONT_SIZE_MIN}");\n    expect(controls).toContain("max={LETTER_BODY_FONT_SIZE_MAX}");\n    expect(controls).toContain("step={0.5}");\n    expect(controls).toContain("Vorlagengrösse");\n  });\n\n  test("applies an explicit body-size override to preview, measurement and PDF markup", () => {\n    expect(canvas).toContain("data-letter-user-body-size");\n    expect(canvas).toContain('"--letter-user-body-size"');\n    expect(css).toContain('[data-letter-user-body-size="true"] [data-letter-pdf-richtext="body"]');\n    expect(css).toContain("font-size: var(--letter-user-body-size) !important;");\n  });\n});\n''')

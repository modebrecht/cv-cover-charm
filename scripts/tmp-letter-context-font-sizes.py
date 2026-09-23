from pathlib import Path
import re


def replace_once(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing anchor in {path}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))

# ---------------------------------------------------------------------------
# Design model: add contextual content-role sizes while preserving old saves.
# ---------------------------------------------------------------------------
replace_once(
    "src/components/letter/types.ts",
    '''  /** Eigene Typografie für den Betreff; fehlt = wie Vorlage. */\n  subjectTypography?: LetterRoleTypography;\n  /** Globale Schriftgrösse des eigentlichen Brief-Fliesstexts; fehlt = Vorlagengrösse. */\n  bodyFontSizePt?: number;''',
    '''  /** Schriftgrösse für Ort & Datum; fehlt = Vorlagengrösse. */\n  dateFontSizePt?: number;\n  /** Eigene Typografie für den Betreff; fehlt = wie Vorlage. */\n  subjectTypography?: LetterRoleTypography;\n  /** Schriftgrösse für die Anrede; fehlt = Vorlagengrösse. */\n  salutationFontSizePt?: number;\n  /** Globale Schriftgrösse des eigentlichen Brief-Fliesstexts; fehlt = Vorlagengrösse. */\n  bodyFontSizePt?: number;\n  /** Schriftgrösse für die Grussformel; fehlt = Vorlagengrösse. */\n  closingFontSizePt?: number;\n  /** Schriftgrösse für den gedruckten Namen / die Unterschrift; fehlt = Vorlagengrösse. */\n  signatureFontSizePt?: number;\n  /** Schriftgrösse für Beilagen im Briefinhalt; fehlt = Vorlagengrösse. */\n  attachmentsFontSizePt?: number;''',
)

replace_once(
    "src/components/letter/types.ts",
    '''export function normalizeLetterRoleTypography(value: unknown): LetterRoleTypography | undefined {''',
    '''export function withLetterRoleFontSize(\n  value: LetterRoleTypography | undefined,\n  fontSizePt: number | undefined,\n): LetterRoleTypography | undefined {\n  const next: LetterRoleTypography = { ...(value ?? {}) };\n  if (fontSizePt === undefined) delete next.fontSizePt;\n  else next.fontSizePt = normalizeLetterBodyFontSizePt(fontSizePt);\n  return Object.keys(next).length ? next : undefined;\n}\n\nexport function normalizeLetterRoleTypography(value: unknown): LetterRoleTypography | undefined {''',
)

replace_once(
    "src/components/letter/types.ts",
    '''    senderTypography: normalizeLetterRoleTypography(incoming.senderTypography),\n    recipientTypography: normalizeLetterRoleTypography(incoming.recipientTypography),\n    subjectTypography: normalizeLetterRoleTypography(incoming.subjectTypography),\n    bodyFontSizePt: normalizeLetterBodyFontSizePt(incoming.bodyFontSizePt),''',
    '''    senderTypography: normalizeLetterRoleTypography(incoming.senderTypography),\n    recipientTypography: normalizeLetterRoleTypography(incoming.recipientTypography),\n    dateFontSizePt: normalizeLetterBodyFontSizePt(incoming.dateFontSizePt),\n    subjectTypography: normalizeLetterRoleTypography(incoming.subjectTypography),\n    salutationFontSizePt: normalizeLetterBodyFontSizePt(incoming.salutationFontSizePt),\n    bodyFontSizePt: normalizeLetterBodyFontSizePt(incoming.bodyFontSizePt),\n    closingFontSizePt: normalizeLetterBodyFontSizePt(incoming.closingFontSizePt),\n    signatureFontSizePt: normalizeLetterBodyFontSizePt(incoming.signatureFontSizePt),\n    attachmentsFontSizePt: normalizeLetterBodyFontSizePt(incoming.attachmentsFontSizePt),''',
)

# ---------------------------------------------------------------------------
# One reusable compact control for all contextual form sections.
# ---------------------------------------------------------------------------
Path("src/components/letter/LetterFontSizeControl.tsx").write_text('''import {\n  LETTER_BODY_FONT_SIZE_MAX,\n  LETTER_BODY_FONT_SIZE_MIN,\n} from "@/components/letter/types";\n\nexport function LetterFontSizeControl({\n  label,\n  value,\n  fallbackSize,\n  min = LETTER_BODY_FONT_SIZE_MIN,\n  max = LETTER_BODY_FONT_SIZE_MAX,\n  hint,\n  onChange,\n}: {\n  label: string;\n  value?: number;\n  fallbackSize: number;\n  min?: number;\n  max?: number;\n  hint?: string;\n  onChange: (value: number | undefined) => void;\n}) {\n  const rawSize = value ?? fallbackSize;\n  const effectiveMin = Math.min(min, rawSize);\n  const effectiveMax = Math.max(max, rawSize);\n  const size = Math.min(effectiveMax, Math.max(effectiveMin, rawSize));\n\n  return (\n    <div\n      data-letter-context-font-size={label}\n      className="grid gap-1.5 rounded-md border bg-background/75 px-2.5 py-2"\n    >\n      <div className="flex items-start justify-between gap-3">\n        <div className="min-w-0">\n          <div className="text-xs font-medium">{label}</div>\n          <div className="text-[10px] leading-snug text-muted-foreground">\n            {hint ?? (value === undefined ? "Vorlagengrösse" : "Eigene Grösse")}\n          </div>\n        </div>\n        <span className="shrink-0 text-xs font-medium tabular-nums">\n          {size.toFixed(size % 1 ? 1 : 0)} pt\n        </span>\n      </div>\n      <input\n        type="range"\n        min={effectiveMin}\n        max={effectiveMax}\n        step={0.5}\n        value={size}\n        onChange={(event) => onChange(Number(event.target.value))}\n        className="w-full accent-primary"\n        aria-label={`${label} Schriftgrösse`}\n      />\n      {value !== undefined ? (\n        <button\n          type="button"\n          className="justify-self-start text-[10px] font-medium text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"\n          onClick={() => onChange(undefined)}\n        >\n          Vorlagengrösse\n        </button>\n      ) : null}\n    </div>\n  );\n}\n''')

# ---------------------------------------------------------------------------
# Layout: keep advanced typography, but remove duplicate font-size controls.
# ---------------------------------------------------------------------------
p = Path("src/components/letter/LetterLayoutControls.tsx")
text = p.read_text()
text = text.replace('''  DEFAULT_LETTER_BODY_FONT_SIZE_PT,\n  LETTER_BODY_FONT_SIZE_MAX,\n  LETTER_BODY_FONT_SIZE_MIN,\n  LETTER_ROLE_FONT_SIZE_MAX,\n  LETTER_ROLE_FONT_SIZE_MIN,\n''', '')
text = text.replace('''  fallbackSize,\n  fallbackBold,\n''', '''  fallbackBold,\n''')
text = text.replace('''  fallbackSize: number;\n  fallbackBold: boolean;\n''', '''  fallbackBold: boolean;\n''')
text = re.sub(
    r'''\n  const size = Math\.max\(\n    LETTER_ROLE_FONT_SIZE_MIN,\n    Math\.min\(LETTER_ROLE_FONT_SIZE_MAX, current\.fontSizePt \?\? fallbackSize\),\n  \);\n''',
    '\n',
    text,
    count=1,
)
size_block = '''\n      <label className="grid gap-1 text-xs">\n        <span className="flex items-center justify-between gap-2 text-muted-foreground">\n          <span>Schriftgrösse</span>\n          <span>{size.toFixed(size % 1 ? 1 : 0)} pt</span>\n        </span>\n        <input\n          type="range"\n          min={LETTER_ROLE_FONT_SIZE_MIN}\n          max={LETTER_ROLE_FONT_SIZE_MAX}\n          step={0.5}\n          value={size}\n          onChange={(event) => patch({ fontSizePt: Number(event.target.value) })}\n          className="w-full accent-primary"\n          aria-label={`${label} Schriftgrösse`}\n        />\n        {current.fontSizePt !== undefined ? (\n          <button\n            type="button"\n            className={`${smallButtonClass} justify-self-start`}\n            onClick={() => patch({ fontSizePt: undefined })}\n          >\n            Vorlagengrösse\n          </button>\n        ) : null}\n      </label>\n'''
if size_block not in text:
    raise SystemExit("missing role size block")
text = text.replace(size_block, '\n', 1)
text = re.sub(
    r'''\nfunction BodyFontSizeControl\(\{.*?\n\}\n\nexport function LetterLayoutControls''',
    '\nexport function LetterLayoutControls',
    text,
    count=1,
    flags=re.S,
)
text = text.replace('''          fallbackSize={9.5}\n''', '')
text = text.replace('''          fallbackSize={10}\n''', '', 1)
text = text.replace('''          fallbackSize={12}\n''', '')
text = re.sub(
    r'''\n        <BodyFontSizeControl\n          value=\{design\.bodyFontSizePt\}\n          onChange=\{\(bodyFontSizePt\) => onChange\(\{ bodyFontSizePt \}\)\}\n        />''',
    '',
    text,
    count=1,
)
text = text.replace(
    '''            Diese Einstellungen gelten nur fürs Motivationsschreiben. Header und Footer findest du\n            im eigenen Bereich „Header & Footer“.''',
    '''            Diese Einstellungen gelten nur fürs Motivationsschreiben. Schriftgrössen stellst du\n            direkt bei den passenden Formularbereichen ein; Header und Footer bleiben im eigenen Bereich.''',
)
p.write_text(text)

# ---------------------------------------------------------------------------
# Contextual controls in the form accordions.
# ---------------------------------------------------------------------------
p = Path("src/routes/anschreiben.tsx")
text = p.read_text()
text = text.replace(
    '''import { LetterRichTextEditor } from "@/components/letter/LetterRichTextEditor";''',
    '''import { LetterRichTextEditor } from "@/components/letter/LetterRichTextEditor";\nimport { LetterFontSizeControl } from "@/components/letter/LetterFontSizeControl";''',
    1,
)
text = text.replace(
    '''  getDossierChromeState,\n  subscribeDossierChrome,''',
    '''  getDossierChromeState,\n  patchDossierChrome,\n  subscribeDossierChrome,''',
    1,
)
text = text.replace(
    '''  normalizeLetterDesign,\n  withLetterFontSelection,''',
    '''  normalizeLetterDesign,\n  withLetterFontSelection,\n  withLetterRoleFontSize,''',
    1,
)

brief_anchor = '''            <Section title="Briefinhalt" open={open.brief} onToggle={() => toggle("brief")}>\n              <div className="grid gap-3">'''
brief_controls = '''            <Section title="Briefinhalt" open={open.brief} onToggle={() => toggle("brief")}>\n              <div className="grid gap-3">\n                <div\n                  data-letter-context-font-sizes="brief"\n                  className="grid gap-2 rounded-md border bg-muted/20 p-2.5"\n                >\n                  <div>\n                    <div className="text-xs font-semibold">Schriftgrössen</div>\n                    <div className="text-[11px] text-muted-foreground">\n                      Jede Textrolle bleibt standardmässig bei der Vorlagengrösse.\n                    </div>\n                  </div>\n                  <LetterFontSizeControl\n                    label="Ort & Datum"\n                    value={design.dateFontSizePt}\n                    fallbackSize={9.5}\n                    onChange={(dateFontSizePt) =>\n                      setDesign((current) => ({ ...current, dateFontSizePt }))\n                    }\n                  />\n                  <LetterFontSizeControl\n                    label="Titel / Betreff"\n                    value={design.subjectTypography?.fontSizePt}\n                    fallbackSize={12}\n                    onChange={(fontSizePt) =>\n                      setDesign((current) => ({\n                        ...current,\n                        subjectTypography: withLetterRoleFontSize(\n                          current.subjectTypography,\n                          fontSizePt,\n                        ),\n                      }))\n                    }\n                  />\n                  <LetterFontSizeControl\n                    label="Anrede"\n                    value={design.salutationFontSizePt}\n                    fallbackSize={10.5}\n                    onChange={(salutationFontSizePt) =>\n                      setDesign((current) => ({ ...current, salutationFontSizePt }))\n                    }\n                  />\n                  <LetterFontSizeControl\n                    label="Fliesstext"\n                    value={design.bodyFontSizePt}\n                    fallbackSize={10.5}\n                    onChange={(bodyFontSizePt) =>\n                      setDesign((current) => ({ ...current, bodyFontSizePt }))\n                    }\n                  />\n                  <LetterFontSizeControl\n                    label="Grussformel"\n                    value={design.closingFontSizePt}\n                    fallbackSize={10.5}\n                    onChange={(closingFontSizePt) =>\n                      setDesign((current) => ({ ...current, closingFontSizePt }))\n                    }\n                  />\n                  <LetterFontSizeControl\n                    label="Unterschrift / Name"\n                    value={design.signatureFontSizePt}\n                    fallbackSize={10.5}\n                    onChange={(signatureFontSizePt) =>\n                      setDesign((current) => ({ ...current, signatureFontSizePt }))\n                    }\n                  />\n                </div>'''
if brief_anchor not in text:
    raise SystemExit("missing brief section anchor")
text = text.replace(brief_anchor, brief_controls, 1)

sender_anchor = '''            <Section\n              title="Meine Kontaktdaten"\n              open={open.absender}\n              onToggle={() => toggle("absender")}\n            >\n              <div className="grid gap-3">'''
sender_controls = '''            <Section\n              title="Meine Kontaktdaten"\n              open={open.absender}\n              onToggle={() => toggle("absender")}\n            >\n              <div className="grid gap-3">\n                <LetterFontSizeControl\n                  label="Kontaktdaten"\n                  value={\n                    chromeOptions.headerMode === "contact"\n                      ? (chromeOptions.headerFontSizePt ?? undefined)\n                      : design.senderTypography?.fontSizePt\n                  }\n                  fallbackSize={chromeOptions.headerMode === "contact" ? 14 : 9.5}\n                  min={chromeOptions.headerMode === "contact" ? 6 : undefined}\n                  max={chromeOptions.headerMode === "contact" ? 30 : undefined}\n                  hint={\n                    chromeOptions.headerMode === "contact"\n                      ? chromeState.sync\n                        ? "Kontakt-Header · mit CV synchron"\n                        : "Kontakt-Header"\n                      : undefined\n                  }\n                  onChange={(fontSizePt) => {\n                    if (chromeOptions.headerMode === "contact") {\n                      patchDossierChrome("letter", { headerFontSizePt: fontSizePt ?? null });\n                      return;\n                    }\n                    setDesign((current) => ({\n                      ...current,\n                      senderTypography: withLetterRoleFontSize(\n                        current.senderTypography,\n                        fontSizePt,\n                      ),\n                    }));\n                  }}\n                />'''
if sender_anchor not in text:
    raise SystemExit("missing sender section anchor")
text = text.replace(sender_anchor, sender_controls, 1)

recipient_anchor = '''            <Section\n              title="Firma / Lehrbetrieb"\n              open={open.empfaenger}\n              onToggle={() => toggle("empfaenger")}\n            >\n              <div className="grid gap-3">'''
recipient_controls = '''            <Section\n              title="Firma / Lehrbetrieb"\n              open={open.empfaenger}\n              onToggle={() => toggle("empfaenger")}\n            >\n              <div className="grid gap-3">\n                <LetterFontSizeControl\n                  label="Empfängeranschrift"\n                  value={design.recipientTypography?.fontSizePt}\n                  fallbackSize={10}\n                  onChange={(fontSizePt) =>\n                    setDesign((current) => ({\n                      ...current,\n                      recipientTypography: withLetterRoleFontSize(\n                        current.recipientTypography,\n                        fontSizePt,\n                      ),\n                    }))\n                  }\n                />'''
if recipient_anchor not in text:
    raise SystemExit("missing recipient section anchor")
text = text.replace(recipient_anchor, recipient_controls, 1)

attachments_anchor = '''            <Section\n              title="Beilagen"\n              open={open.beilagen}\n              onToggle={() => toggle("beilagen")}\n              hint={data.showBeilagen !== false ? "angezeigt" : "ausgeblendet"}\n            >\n              <div className="flex flex-col gap-3">'''
attachments_controls = '''            <Section\n              title="Beilagen"\n              open={open.beilagen}\n              onToggle={() => toggle("beilagen")}\n              hint={data.showBeilagen !== false ? "angezeigt" : "ausgeblendet"}\n            >\n              <div className="flex flex-col gap-3">\n                <LetterFontSizeControl\n                  label="Beilagen"\n                  value={\n                    chromeOptions.footerMode === "details"\n                      ? (chromeOptions.footerFontSizePt ?? undefined)\n                      : design.attachmentsFontSizePt\n                  }\n                  fallbackSize={chromeOptions.footerMode === "details" ? 8.5 : 10}\n                  min={chromeOptions.footerMode === "details" ? 6 : undefined}\n                  max={chromeOptions.footerMode === "details" ? 30 : undefined}\n                  hint={\n                    chromeOptions.footerMode === "details"\n                      ? chromeState.sync\n                        ? "Beilagen im Footer · mit CV synchron"\n                        : "Beilagen im Footer"\n                      : undefined\n                  }\n                  onChange={(fontSizePt) => {\n                    if (chromeOptions.footerMode === "details") {\n                      patchDossierChrome("letter", { footerFontSizePt: fontSizePt ?? null });\n                      return;\n                    }\n                    setDesign((current) => ({\n                      ...current,\n                      attachmentsFontSizePt: fontSizePt,\n                    }));\n                  }}\n                />'''
if attachments_anchor not in text:
    raise SystemExit("missing attachments section anchor")
text = text.replace(attachments_anchor, attachments_controls, 1)
p.write_text(text)

# ---------------------------------------------------------------------------
# Renderer: apply all new role sizes to preview, pagination probes and PDF DOM.
# ---------------------------------------------------------------------------
p = Path("src/components/letter/LetterCanvas.tsx")
text = p.read_text()
text = text.replace(
    '''          style={{ color: palette.muted, textAlign: dateAlign }}''',
    '''          style={{\n            color: palette.muted,\n            textAlign: dateAlign,\n            fontSize:\n              design.dateFontSizePt !== undefined ? `${design.dateFontSizePt}pt` : undefined,\n          }}''',
    1,
)
text = text.replace(
    '''            <p data-letter-pdf-text="salutation" className="mb-[5mm]">''',
    '''            <p\n              data-letter-pdf-text="salutation"\n              className="mb-[5mm]"\n              style={{\n                fontSize:\n                  design.salutationFontSizePt !== undefined\n                    ? `${design.salutationFontSizePt}pt`\n                    : undefined,\n              }}\n            >''',
    1,
)
text = text.replace(
    '''              <div data-letter-pdf-text="closing">\n                {data.gruss || (exportMode ? "" : "Freundliche Grüsse")}\n              </div>''',
    '''              <div\n                data-letter-pdf-text="closing"\n                style={{\n                  fontSize:\n                    design.closingFontSizePt !== undefined\n                      ? `${design.closingFontSizePt}pt`\n                      : undefined,\n                }}\n              >\n                {data.gruss || (exportMode ? "" : "Freundliche Grüsse")}\n              </div>''',
    1,
)
text = text.replace(
    '''                style={{ marginTop: `${signatureGapMm}mm` }}''',
    '''                style={{\n                  marginTop: `${signatureGapMm}mm`,\n                  fontSize:\n                    design.signatureFontSizePt !== undefined\n                      ? `${design.signatureFontSizePt}pt`\n                      : undefined,\n                }}''',
    1,
)
text = text.replace(
    '''              <div className="mt-[9mm] text-[10pt] leading-[1.45]">''',
    '''              <div\n                className="mt-[9mm] text-[10pt] leading-[1.45]"\n                style={{\n                  fontSize:\n                    design.attachmentsFontSizePt !== undefined\n                      ? `${design.attachmentsFontSizePt}pt`\n                      : undefined,\n                }}\n              >''',
    1,
)
p.write_text(text)

# ---------------------------------------------------------------------------
# Tests: move body control assertion to contextual form + cover all roles.
# ---------------------------------------------------------------------------
p = Path("tests/unit/letter-body-font-size.test.ts")
text = p.read_text()
text = text.replace(
    '''const controls = readFileSync(\n  new URL("../../src/components/letter/LetterLayoutControls.tsx", import.meta.url),\n  "utf8",\n);''',
    '''const control = readFileSync(\n  new URL("../../src/components/letter/LetterFontSizeControl.tsx", import.meta.url),\n  "utf8",\n);\nconst route = readFileSync(\n  new URL("../../src/routes/anschreiben.tsx", import.meta.url),\n  "utf8",\n);''',
    1,
)
text = text.replace(
    '''    expect(controls).toContain("data-letter-body-font-size-control");\n    expect(controls).toContain("Fliesstext – Schriftgrösse");\n    expect(controls).toContain("min={LETTER_BODY_FONT_SIZE_MIN}");\n    expect(controls).toContain("max={LETTER_BODY_FONT_SIZE_MAX}");\n    expect(controls).toContain("step={0.5}");\n    expect(controls).toContain("Vorlagengrösse");''',
    '''    expect(route).toContain('label="Fliesstext"');\n    expect(route).toContain("value={design.bodyFontSizePt}");\n    expect(control).toContain("LETTER_BODY_FONT_SIZE_MIN");\n    expect(control).toContain("LETTER_BODY_FONT_SIZE_MAX");\n    expect(control).toContain("step={0.5}");\n    expect(control).toContain("Vorlagengrösse");''',
    1,
)
p.write_text(text)

Path("tests/unit/letter-context-font-sizes.test.ts").write_text('''import { describe, expect, test } from "bun:test";\nimport { readFileSync } from "node:fs";\nimport { emptyLetterDesign, normalizeLetterDesign } from "../../src/components/letter/types";\n\nconst route = readFileSync(new URL("../../src/routes/anschreiben.tsx", import.meta.url), "utf8");\nconst layout = readFileSync(\n  new URL("../../src/components/letter/LetterLayoutControls.tsx", import.meta.url),\n  "utf8",\n);\nconst canvas = readFileSync(\n  new URL("../../src/components/letter/LetterCanvas.tsx", import.meta.url),\n  "utf8",\n);\n\ndescribe("contextual letter font sizes", () => {\n  test("keeps all new role sizes optional and normalizes explicit values", () => {\n    const defaults = emptyLetterDesign();\n    expect(defaults.dateFontSizePt).toBeUndefined();\n    expect(defaults.salutationFontSizePt).toBeUndefined();\n    expect(defaults.closingFontSizePt).toBeUndefined();\n    expect(defaults.signatureFontSizePt).toBeUndefined();\n    expect(defaults.attachmentsFontSizePt).toBeUndefined();\n\n    const normalized = normalizeLetterDesign({\n      ...defaults,\n      dateFontSizePt: 7,\n      salutationFontSizePt: 9.24,\n      closingFontSizePt: 11.26,\n      signatureFontSizePt: 20,\n      attachmentsFontSizePt: 10.5,\n    });\n    expect(normalized.dateFontSizePt).toBe(8);\n    expect(normalized.salutationFontSizePt).toBe(9);\n    expect(normalized.closingFontSizePt).toBe(11.5);\n    expect(normalized.signatureFontSizePt).toBe(16);\n    expect(normalized.attachmentsFontSizePt).toBe(10.5);\n  });\n\n  test("places size controls in the matching form accordions", () => {\n    expect(route).toContain('data-letter-context-font-sizes="brief"');\n    for (const label of [\n      "Ort & Datum",\n      "Titel / Betreff",\n      "Anrede",\n      "Fliesstext",\n      "Grussformel",\n      "Unterschrift / Name",\n      "Kontaktdaten",\n      "Empfängeranschrift",\n      "Beilagen",\n    ]) {\n      expect(route).toContain(`label="${label}"`);\n    }\n    expect(route).toContain('patchDossierChrome("letter", { headerFontSizePt: fontSizePt ?? null })');\n    expect(route).toContain('patchDossierChrome("letter", { footerFontSizePt: fontSizePt ?? null })');\n  });\n\n  test("removes duplicate size sliders from Layout", () => {\n    expect(layout).not.toContain("BodyFontSizeControl");\n    expect(layout).not.toContain("aria-label={`${label} Schriftgrösse`}");\n    expect(layout).toContain("Schriftgrössen stellst du");\n  });\n\n  test("renders the new role sizes in the shared canvas used by preview, pagination and PDF", () => {\n    expect(canvas).toContain("design.dateFontSizePt");\n    expect(canvas).toContain("design.salutationFontSizePt");\n    expect(canvas).toContain("design.closingFontSizePt");\n    expect(canvas).toContain("design.signatureFontSizePt");\n    expect(canvas).toContain("design.attachmentsFontSizePt");\n  });\n});\n''')

print("contextual font-size patch applied")

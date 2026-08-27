from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"missing patch anchor: {label}")
    if text.count(old) != 1:
        raise SystemExit(f"ambiguous patch anchor: {label} ({text.count(old)})")
    return text.replace(old, new, 1)


# ---------------------------------------------------------------------------
# Titelblatt data model + defaults
# ---------------------------------------------------------------------------
path = Path("src/components/cover/types.ts")
text = path.read_text()
text = replace_once(
    text,
    "  betriebAdresse: string;\n  ort: string;",
    "  betriebAdresse: string;\n  /** Firma bleibt gespeichert, kann auf dem Titelblatt aber ausgeblendet werden. */\n  showBetriebOnCover?: boolean;\n  /** Native Beilagenrubrik auf dem Titelblatt. */\n  showBeilagenOnCover?: boolean;\n  beilagen?: string[];\n  ort: string;",
    "cover optional visibility fields",
)
text = replace_once(
    text,
    'export const EMPTY_META: PdfMeta = { title: "", author: "", subject: "", keywords: "" };\n',
    'export const EMPTY_META: PdfMeta = { title: "", author: "", subject: "", keywords: "" };\n\nexport const DEFAULT_COVER_BEILAGEN = [\n  "Motivationsschreiben",\n  "Lebenslauf",\n  "Zeugnis",\n] as const;\n',
    "cover attachments defaults",
)
path.write_text(text)


# ---------------------------------------------------------------------------
# Titelblatt form controls
# ---------------------------------------------------------------------------
path = Path("src/components/cover/CoverForm.tsx")
text = path.read_text()
text = replace_once(
    text,
    'import { LEHRBERUFE } from "./types";',
    'import { DEFAULT_COVER_BEILAGEN, LEHRBERUFE } from "./types";',
    "cover form constants import",
)
old_betrieb = '''export function FormBetrieb({ data, onChange }: Props) {\n  return (\n    <div className="flex flex-col gap-3">\n      <Field label="Firma">'''
new_betrieb = '''export function FormBetrieb({ data, onChange }: Props) {\n  return (\n    <div className="flex flex-col gap-3">\n      <label className="flex items-center gap-2 text-sm">\n        <input\n          type="checkbox"\n          checked={data.showBetriebOnCover === true}\n          onChange={(event) => onChange({ showBetriebOnCover: event.target.checked })}\n        />\n        <span>Auf Titelblatt anzeigen</span>\n      </label>\n      <Field label="Firma">'''
text = replace_once(text, old_betrieb, new_betrieb, "company visibility checkbox")
anchor = '''export function FormOrtDatum({ data, onChange }: Props) {'''
beilagen_form = '''export function FormBeilagen({ data, onChange }: Props) {\n  const values = DEFAULT_COVER_BEILAGEN.map(\n    (fallback, index) => data.beilagen?.[index] ?? fallback,\n  );\n\n  const changeEntry = (index: number, value: string) => {\n    const next = [...values];\n    next[index] = value;\n    onChange({ beilagen: next });\n  };\n\n  return (\n    <div className="flex flex-col gap-3">\n      <label className="flex items-center gap-2 text-sm">\n        <input\n          type="checkbox"\n          checked={data.showBeilagenOnCover !== false}\n          onChange={(event) => onChange({ showBeilagenOnCover: event.target.checked })}\n        />\n        <span>Auf Titelblatt anzeigen</span>\n      </label>\n      {values.map((value, index) => (\n        <Field key={index} label={`Beilage ${index + 1}`}>\n          <input\n            className={inputCls}\n            value={value}\n            onChange={(event) => changeEntry(index, event.target.value)}\n          />\n        </Field>\n      ))}\n    </div>\n  );\n}\n\n'''
text = replace_once(text, anchor, beilagen_form + anchor, "cover attachments form")
path.write_text(text)


# ---------------------------------------------------------------------------
# Titelblatt native blocks: Beilagen reuse the recipient column style.
# Company is stored independently and defaults to hidden on the cover.
# ---------------------------------------------------------------------------
path = Path("src/components/cover/layouts.ts")
text = path.read_text()
text = replace_once(
    text,
    'import type { Block, ColorSlot, CoverData, CustomField, TemplateId } from "./types";\n',
    'import type { Block, ColorSlot, CoverData, CustomField, TemplateId } from "./types";\nimport { DEFAULT_COVER_BEILAGEN } from "./types";\n',
    "cover layouts attachment defaults import",
)
old_build_tail = '''  const blocks = buildBaseBlocks(template, data, customs, overrides, slots);\n  const decorations = templateDecorations(template, overrides);\n\n  // Decorations render first so text/photos/custom content remain above them.\n  // They are otherwise normal shape blocks, so the shared BlockLayer and\n  // ElementBar provide dragging, size, colour, opacity, reset and remove.\n  return [...decorations, ...blocks];\n}'''
new_build_tail = '''  const blocks = buildBaseBlocks(template, data, customs, overrides, slots);\n  const decorations = templateDecorations(template, overrides);\n\n  const companyVisible = data.showBetriebOnCover === true;\n  const beilagen = DEFAULT_COVER_BEILAGEN.map(\n    (fallback, index) => data.beilagen?.[index] ?? fallback,\n  ).filter((value) => value.trim());\n  const beilagenVisible = data.showBeilagenOnCover !== false && beilagen.length > 0;\n\n  // Ausblenden entfernt nur die Darstellung. Die Firmendaten bleiben im\n  // Titelblatt gespeichert und stehen weiterhin für das Motivationsschreiben\n  // zur Übernahme bereit.\n  const contentBlocks = blocks.map((block) =>\n    !companyVisible && (block.id === "anTitel" || block.id === "empfaenger")\n      ? { ...block, lines: [] }\n      : block,\n  );\n\n  if (beilagenVisible) {\n    const recipientTitle = blocks.find((block) => block.id === "anTitel");\n    const recipientBody = blocks.find((block) => block.id === "empfaenger");\n\n    if (recipientTitle && recipientBody) {\n      const titleBase = companyVisible\n        ? {\n            ...recipientTitle.style,\n            above: "beilagen",\n            follows: null,\n            anchorBottom: false,\n            gap: 1.5,\n            uppercase: false,\n            weight: Math.max(600, recipientTitle.style.weight),\n          }\n        : {\n            ...recipientTitle.style,\n            uppercase: false,\n            weight: Math.max(600, recipientTitle.style.weight),\n          };\n      const bodyBase = companyVisible\n        ? {\n            ...recipientBody.style,\n            above: "anTitel",\n            follows: null,\n            anchorBottom: false,\n            gap: 2,\n          }\n        : {\n            ...recipientBody.style,\n            follows: "beilagenTitel",\n            above: null,\n          };\n      const titleOverride = overrides.beilagenTitel ?? {};\n      const bodyOverride = overrides.beilagen ?? {};\n\n      contentBlocks.push(\n        {\n          id: "beilagenTitel",\n          label: "Titel Beilagen",\n          kind: "text",\n          lines: ["Beilagen:"],\n          style: {\n            ...titleBase,\n            ...titleOverride,\n            weight: Math.max(600, titleOverride.weight ?? titleBase.weight),\n          },\n        },\n        {\n          id: "beilagen",\n          label: "Beilagen",\n          kind: "text",\n          lines: beilagen,\n          style: { ...bodyBase, ...bodyOverride },\n        },\n      );\n    }\n  }\n\n  // Decorations render first so text/photos/custom content remain above them.\n  // They are otherwise normal shape blocks, so the shared BlockLayer and\n  // ElementBar provide dragging, size, colour, opacity, reset and remove.\n  return [...decorations, ...contentBlocks];\n}'''
text = replace_once(text, old_build_tail, new_build_tail, "native cover attachments blocks")
path.write_text(text)


# Semantic roles for the new native blocks.
path = Path("src/components/cover/BlockLayer.tsx")
text = path.read_text()
text = replace_once(
    text,
    '  if (["eyebrow", "kicker", "kontaktTitel", "anTitel"].includes(block.id)) return "heading";\n',
    '  if (["eyebrow", "kicker", "kontaktTitel", "anTitel", "beilagenTitel"].includes(block.id))\n    return "heading";\n',
    "cover attachment heading role",
)
text = replace_once(
    text,
    '  if (["kontakt", "empfaenger"].includes(block.id)) return "body";\n',
    '  if (["kontakt", "empfaenger", "beilagen"].includes(block.id)) return "body";\n',
    "cover attachment body role",
)
path.write_text(text)


# ---------------------------------------------------------------------------
# Titelblatt route: default company OFF, Beilagen ON and editable.
# ---------------------------------------------------------------------------
path = Path("src/routes/titelblatt.tsx")
text = path.read_text()
text = replace_once(
    text,
    '  FormBetrieb,\n  FormBewerbung,',
    '  FormBeilagen,\n  FormBetrieb,\n  FormBewerbung,',
    "cover route form import",
)
text = replace_once(
    text,
    '  customKind,\n  DEMO_DATA,',
    '  customKind,\n  DEFAULT_COVER_BEILAGEN,\n  DEMO_DATA,',
    "cover route attachment defaults import",
)
text = replace_once(
    text,
    '  betriebAdresse: "",\n  ort: "",',
    '  betriebAdresse: "",\n  showBetriebOnCover: false,\n  showBeilagenOnCover: true,\n  beilagen: [...DEFAULT_COVER_BEILAGEN],\n  ort: "",',
    "cover route initial visibility",
)
text = replace_once(
    text,
    ' * 7 = gemeinsame Dossier-Schrift für Titelblatt und Lebenslauf.\n */\nconst SAVE_VERSION = 7;',
    ' * 7 = gemeinsame Dossier-Schrift für Titelblatt und Lebenslauf.\n * 8 = Sichtbarkeit Firma / Lehrbetrieb und native Beilagenrubrik.\n */\nconst SAVE_VERSION = 8;',
    "cover save version",
)
old_prefill = '''const prefill = (d: CoverData): CoverData => ({\n  ...d,\n  meta: { ...EMPTY_META, ...(d.meta ?? {}) },\n  datum: d.datum || today(),\n  ort: d.ort || DEFAULTS.LOCATION,\n  kicker: d.kicker || DEFAULTS.KICKER,\n});'''
new_prefill = '''const prefill = (d: CoverData): CoverData => ({\n  ...d,\n  meta: { ...EMPTY_META, ...(d.meta ?? {}) },\n  datum: d.datum || today(),\n  ort: d.ort || DEFAULTS.LOCATION,\n  kicker: d.kicker || DEFAULTS.KICKER,\n  showBetriebOnCover: d.showBetriebOnCover === true,\n  showBeilagenOnCover: d.showBeilagenOnCover !== false,\n  beilagen: DEFAULT_COVER_BEILAGEN.map(\n    (fallback, index) => d.beilagen?.[index] ?? fallback,\n  ),\n});'''
text = replace_once(text, old_prefill, new_prefill, "cover prefill visibility normalization")
text = replace_once(
    text,
    '  | "betrieb"\n  | "ortDatum"',
    '  | "betrieb"\n  | "beilagen"\n  | "ortDatum"',
    "cover section key",
)
text = replace_once(
    text,
    '    betrieb: false,\n    ortDatum: false,',
    '    betrieb: false,\n    beilagen: true,\n    ortDatum: false,',
    "cover initial open sections",
)
old_company_section = '''            <Section\n              title="Lehrbetrieb"\n              open={open.betrieb}\n              onToggle={() => toggleSection("betrieb")}\n              hint={`${filled([data.lehrbetrieb, data.ansprechperson, data.betriebAdresse])} / 3`}\n            >\n              <FormBetrieb data={data} onChange={patch} />\n            </Section>\n\n'''
new_company_section = '''            <Section\n              title="Firma / Lehrbetrieb"\n              open={open.betrieb}\n              onToggle={() => toggleSection("betrieb")}\n              hint={\n                data.showBetriebOnCover === true\n                  ? `${filled([data.lehrbetrieb, data.ansprechperson, data.betriebAdresse])} / 3 · angezeigt`\n                  : "ausgeblendet"\n              }\n            >\n              <FormBetrieb data={data} onChange={patch} />\n            </Section>\n\n            <Section\n              title="Beilagen"\n              open={open.beilagen}\n              onToggle={() => toggleSection("beilagen")}\n              hint={data.showBeilagenOnCover !== false ? "angezeigt" : "ausgeblendet"}\n            >\n              <FormBeilagen data={data} onChange={patch} />\n            </Section>\n\n'''
text = replace_once(text, old_company_section, new_company_section, "cover company + attachments sections")
path.write_text(text)


# ---------------------------------------------------------------------------
# Motivationsschreiben data model + defaults.
# ---------------------------------------------------------------------------
path = Path("src/components/letter/types.ts")
text = path.read_text()
text = replace_once(
    text,
    '  unterschrift: string;\n};',
    '  unterschrift: string;\n  /** Beilagen am Ende des Motivationsschreibens. */\n  showBeilagen?: boolean;\n  beilagen?: string[];\n};',
    "letter attachment fields",
)
text = replace_once(
    text,
    'export { LETTER_STORAGE_KEY };\n\nexport const EMPTY_LETTER: LetterData = {',
    'export { LETTER_STORAGE_KEY };\n\nexport const DEFAULT_LETTER_BEILAGEN = ["Lebenslauf", "Zeugnis"] as const;\n\nexport const EMPTY_LETTER: LetterData = {',
    "letter attachment defaults",
)
text = replace_once(
    text,
    '  unterschrift: "",\n};',
    '  unterschrift: "",\n  showBeilagen: true,\n  beilagen: [...DEFAULT_LETTER_BEILAGEN],\n};',
    "letter empty attachment defaults",
)
path.write_text(text)


# mergeNonEmptyLetterData only transfers string dossier fields; keep that true
# now that LetterData also contains boolean/array settings.
path = Path("src/components/letter/dossier-transfer.ts")
text = path.read_text()
old_merge = '''  const next = { ...current };\n  for (const [key, value] of Object.entries(incoming) as Array<\n    [keyof LetterData, string | undefined]\n  >) {\n    if (value?.trim()) next[key] = value;\n  }\n  return next;'''
new_merge = '''  const next = { ...current };\n  for (const [key, value] of Object.entries(incoming)) {\n    if (typeof value !== "string" || !value.trim()) continue;\n    (next as unknown as Record<string, unknown>)[key] = value;\n  }\n  return next;'''
text = replace_once(text, old_merge, new_merge, "string-only letter dossier transfer")
path.write_text(text)


# ---------------------------------------------------------------------------
# Motivationsschreiben preview/PDF: Beilagen after signature, heading bold.
# ---------------------------------------------------------------------------
path = Path("src/components/letter/LetterCanvas.tsx")
text = path.read_text()
text = replace_once(
    text,
    'import type { LetterData, LetterDesign, LetterTemplateId } from "./types";\n',
    'import { DEFAULT_LETTER_BEILAGEN, type LetterData, type LetterDesign, type LetterTemplateId } from "./types";\n',
    "letter canvas attachment defaults import",
)
text = replace_once(
    text,
    '  const dateAlign = design.dateAlign ?? "left";\n  const placeholder =',
    '  const dateAlign = design.dateAlign ?? "left";\n  const beilagen = DEFAULT_LETTER_BEILAGEN.map(\n    (fallback, index) => data.beilagen?.[index] ?? fallback,\n  ).filter((value) => value.trim());\n  const showBeilagen = data.showBeilagen !== false && beilagen.length > 0;\n  const placeholder =',
    "letter canvas attachment normalization",
)
closing_anchor = '''          <div className="mt-[9mm]">\n            <div data-letter-pdf-text="closing">\n              {data.gruss || (exportMode ? "" : "Freundliche Grüsse")}\n            </div>\n            <div data-letter-pdf-text="signature" className="mt-[9mm] font-medium">\n              {data.unterschrift || data.absenderName}\n            </div>\n          </div>'''
closing_with_attachments = closing_anchor + '''\n\n          {showBeilagen ? (\n            <div className="mt-[9mm] text-[10pt] leading-[1.45]">\n              <div data-letter-pdf-text="attachments-heading" className="font-semibold">\n                Beilagen:\n              </div>\n              <div data-letter-pdf-text="attachments-body" className="mt-[1.5mm]">\n                <Lines values={beilagen} />\n              </div>\n            </div>\n          ) : null}'''
text = replace_once(text, closing_anchor, closing_with_attachments, "letter preview attachments")
path.write_text(text)


# ---------------------------------------------------------------------------
# Motivationsschreiben editor: same section name, independent checkbox.
# ---------------------------------------------------------------------------
path = Path("src/routes/anschreiben.tsx")
text = path.read_text()
text = replace_once(
    text,
    '  EMPTY_LETTER,\n  LETTER_STORAGE_KEY,',
    '  DEFAULT_LETTER_BEILAGEN,\n  EMPTY_LETTER,\n  LETTER_STORAGE_KEY,',
    "letter route attachment defaults import",
)
text = replace_once(
    text,
    '    brief: true,\n    vorlage: false,',
    '    brief: true,\n    beilagen: true,\n    vorlage: false,',
    "letter attachment section open state",
)
brief_end = '''                <Field\n                  label="Name unter der Unterschrift"\n                  value={data.unterschrift}\n                  onChange={(value) => patch({ unterschrift: value })}\n                />\n              </div>\n            </Section>'''
attachments_section = brief_end + '''\n\n            <Section\n              title="Beilagen"\n              open={open.beilagen}\n              onToggle={() => toggle("beilagen")}\n              hint={data.showBeilagen !== false ? "angezeigt" : "ausgeblendet"}\n            >\n              <div className="flex flex-col gap-3">\n                <label className="flex items-center gap-2 text-sm">\n                  <input\n                    type="checkbox"\n                    checked={data.showBeilagen !== false}\n                    onChange={(event) => patch({ showBeilagen: event.target.checked })}\n                  />\n                  <span>Im Motivationsschreiben anzeigen</span>\n                </label>\n                {DEFAULT_LETTER_BEILAGEN.map((fallback, index) => (\n                  <Field\n                    key={index}\n                    label={`Beilage ${index + 1}`}\n                    value={data.beilagen?.[index] ?? fallback}\n                    onChange={(value) => {\n                      const next = DEFAULT_LETTER_BEILAGEN.map(\n                        (entryFallback, entryIndex) =>\n                          data.beilagen?.[entryIndex] ?? entryFallback,\n                      );\n                      next[index] = value;\n                      patch({ beilagen: next });\n                    }}\n                  />\n                ))}\n              </div>\n            </Section>'''
text = replace_once(text, brief_end, attachments_section, "letter attachments section")
path.write_text(text)


# ---------------------------------------------------------------------------
# Browser regression: both UIs use Beilagen + independent visibility controls.
# ---------------------------------------------------------------------------
path = Path("tests/e2e/dossier-regression.spec.ts")
text = path.read_text()
marker = '  test("document editors expose one consistent overview home link", async ({ page }) => {'
test_block = '''  test("Titelblatt and Motivationsschreiben expose independent Beilagen controls", async ({ page }) => {\n    await page.goto(`${BASE_URL}/titelblatt`, { waitUntil: "domcontentloaded" });\n    await page.evaluate(() => localStorage.clear());\n    await page.reload({ waitUntil: "domcontentloaded" });\n\n    const coverDownload = page.getByRole("button", { name: "Download", exact: true });\n    await expect(coverDownload).toHaveAttribute("data-editor-ready", "true");\n\n    const companyHeader = page.getByRole("button", { name: /^Firma \/ Lehrbetrieb/ });\n    if ((await companyHeader.getAttribute("aria-expanded")) !== "true") await companyHeader.click();\n    const companyPanelId = await companyHeader.getAttribute("aria-controls");\n    expect(companyPanelId).toBeTruthy();\n    const companyPanel = page.locator(`[id="${companyPanelId}"]`);\n    const companyToggle = companyPanel.getByLabel("Auf Titelblatt anzeigen");\n    await expect(companyToggle).not.toBeChecked();\n    await companyPanel.getByLabel("Firma", { exact: true }).fill("Beispiel AG");\n\n    const coverBeilagenHeader = page.getByRole("button", { name: /^Beilagen/ });\n    if ((await coverBeilagenHeader.getAttribute("aria-expanded")) !== "true") {\n      await coverBeilagenHeader.click();\n    }\n    const coverBeilagenPanelId = await coverBeilagenHeader.getAttribute("aria-controls");\n    expect(coverBeilagenPanelId).toBeTruthy();\n    const coverBeilagenPanel = page.locator(`[id="${coverBeilagenPanelId}"]`);\n    const coverBeilagenToggle = coverBeilagenPanel.getByLabel("Auf Titelblatt anzeigen");\n    await expect(coverBeilagenToggle).toBeChecked();\n    await expect(page.locator('[data-block-id="beilagenTitel"]')).toContainText("Beilagen:");\n    await expect(page.locator('[data-block-id="beilagen"]')).toContainText("Motivationsschreiben");\n    await expect(page.locator('[data-block-id="empfaenger"]')).toHaveCount(0);\n\n    await companyToggle.check();\n    await expect(page.locator('[data-block-id="empfaenger"]')).toContainText("Beispiel AG");\n    await coverBeilagenToggle.uncheck();\n    await expect(page.locator('[data-block-id="beilagenTitel"]')).toHaveCount(0);\n    await expect(page.locator('[data-block-id="empfaenger"]')).toContainText("Beispiel AG");\n\n    await page.goto(`${BASE_URL}/anschreiben`, { waitUntil: "domcontentloaded" });\n    await page.evaluate(() => {\n      localStorage.removeItem("anschreiben:v1");\n      localStorage.removeItem("anschreiben:history");\n    });\n    await page.reload({ waitUntil: "domcontentloaded" });\n\n    const letterDownload = page.getByRole("button", { name: "Download", exact: true });\n    await expect(letterDownload).toHaveAttribute("data-editor-ready", "true");\n    const letterBeilagenHeader = page.getByRole("button", { name: /^Beilagen/ });\n    if ((await letterBeilagenHeader.getAttribute("aria-expanded")) !== "true") {\n      await letterBeilagenHeader.click();\n    }\n    const letterPanelId = await letterBeilagenHeader.getAttribute("aria-controls");\n    expect(letterPanelId).toBeTruthy();\n    const letterPanel = page.locator(`[id="${letterPanelId}"]`);\n    const letterToggle = letterPanel.getByLabel("Im Motivationsschreiben anzeigen");\n    await expect(letterToggle).toBeChecked();\n    const preview = page.getByLabel("Vorschau Motivationsschreiben");\n    await expect(preview.locator('[data-letter-pdf-text="attachments-heading"]')).toHaveText(\n      "Beilagen:",\n    );\n    await expect(preview.locator('[data-letter-pdf-text="attachments-body"]')).toContainText(\n      "Lebenslauf",\n    );\n    await expect(preview.locator('[data-letter-pdf-text="attachments-body"]')).toContainText(\n      "Zeugnis",\n    );\n\n    await letterToggle.uncheck();\n    await expect(preview.locator('[data-letter-pdf-text="attachments-heading"]')).toHaveCount(0);\n    await expect(page.locator('[data-block-id="beilagenTitel"]')).toHaveCount(0);\n  });\n\n'''
text = replace_once(text, marker, test_block + marker, "attachments regression insertion")
path.write_text(text)

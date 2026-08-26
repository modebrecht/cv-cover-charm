from pathlib import Path


def replace(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"anchor not found in {path}: {old[:100]!r}")
    p.write_text(text.replace(old, new, 1))

# ---------------------------------------------------------------------------
# Cover data model: backward-compatible optional fields + shared defaults.
# ---------------------------------------------------------------------------
replace(
    "src/components/cover/types.ts",
    '  betriebAdresse: string;\n  ort: string;\n',
    '  betriebAdresse: string;\n  /** Firma bleibt im Dossier gespeichert, ist auf dem Titelblatt aber standardmässig unsichtbar. */\n  showBetriebOnCover?: boolean;\n  /** Inhaltsrubrik des Bewerbungsdossiers; alte Saves erhalten die heutigen Defaults. */\n  showInhaltOnCover?: boolean;\n  inhalt?: string[];\n  ort: string;\n',
)
replace(
    "src/components/cover/types.ts",
    'export const EMPTY_META: PdfMeta = { title: "", author: "", subject: "", keywords: "" };\n',
    'export const EMPTY_META: PdfMeta = { title: "", author: "", subject: "", keywords: "" };\n\nexport const DEFAULT_COVER_CONTENT = ["Motivationsschreiben", "Lebenslauf", "Zeugnis"] as const;\n',
)

# ---------------------------------------------------------------------------
# Forms: visibility checkbox for company + dedicated content rubric.
# ---------------------------------------------------------------------------
replace(
    "src/components/cover/CoverForm.tsx",
    'import { LEHRBERUFE } from "./types";\n',
    'import { DEFAULT_COVER_CONTENT, LEHRBERUFE } from "./types";\n',
)
replace(
    "src/components/cover/CoverForm.tsx",
    'export function FormBetrieb({ data, onChange }: Props) {\n  return (\n    <div className="flex flex-col gap-3">\n      <Field label="Firma">\n',
    '''export function FormBetrieb({ data, onChange }: Props) {\n  return (\n    <div className="flex flex-col gap-3">\n      <label className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm">\n        <input\n          type="checkbox"\n          checked={data.showBetriebOnCover === true}\n          onChange={(event) => onChange({ showBetriebOnCover: event.target.checked })}\n          className="h-4 w-4 accent-primary"\n        />\n        <span>Auf Titelblatt anzeigen</span>\n      </label>\n      <Field label="Firma">\n''',
)
replace(
    "src/components/cover/CoverForm.tsx",
    'export function FormOrtDatum({ data, onChange }: Props) {\n',
    '''export function FormInhalt({ data, onChange }: Props) {\n  const items = Array.from({ length: 3 }, (_, index) =>\n    data.inhalt?.[index] ?? DEFAULT_COVER_CONTENT[index] ?? "",\n  );\n  const patchItem = (index: number, value: string) => {\n    const next = [...items];\n    next[index] = value;\n    onChange({ inhalt: next });\n  };\n\n  return (\n    <div className="flex flex-col gap-3">\n      <label className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm">\n        <input\n          type="checkbox"\n          checked={data.showInhaltOnCover !== false}\n          onChange={(event) => onChange({ showInhaltOnCover: event.target.checked })}\n          className="h-4 w-4 accent-primary"\n        />\n        <span>Auf Titelblatt anzeigen</span>\n      </label>\n      {items.map((item, index) => (\n        <Field key={index} label={`Eintrag ${index + 1}`}>\n          <input\n            className={inputCls}\n            value={item}\n            onChange={(event) => patchItem(index, event.target.value)}\n          />\n        </Field>\n      ))}\n    </div>\n  );\n}\n\nexport function FormOrtDatum({ data, onChange }: Props) {\n''',
)

# ---------------------------------------------------------------------------
# Layout wrapper: content uses the recipient column's native template styling.
# If both are visible, content stacks above company instead of overlapping it.
# ---------------------------------------------------------------------------
replace(
    "src/components/cover/layouts.ts",
    'import type { Block, ColorSlot, CoverData, CustomField, TemplateId } from "./types";\n',
    'import { DEFAULT_COVER_CONTENT, type Block, type ColorSlot, type CoverData, type CustomField, type TemplateId } from "./types";\n',
)
replace(
    "src/components/cover/layouts.ts",
    '''  const blocks = buildBaseBlocks(template, data, customs, overrides, slots);\n  const decorations = templateDecorations(template, overrides);\n\n  // Decorations render first so text/photos/custom content remain above them.\n  // They are otherwise normal shape blocks, so the shared BlockLayer and\n  // ElementBar provide dragging, size, colour, opacity, reset and remove.\n  return [...decorations, ...blocks];\n''',
    '''  const baseBlocks = buildBaseBlocks(template, data, customs, overrides, slots);\n  const decorations = templateDecorations(template, overrides);\n  const showCompany = data.showBetriebOnCover === true;\n  const showContent = data.showInhaltOnCover !== false;\n  const contentLines = (data.inhalt?.length ? data.inhalt : DEFAULT_COVER_CONTENT)\n    .map((item) => item.trim())\n    .filter(Boolean);\n\n  // Firmendaten bleiben im Dokumentmodell und damit für das Motivationsschreiben\n  // verfügbar. Die Checkbox steuert nur, ob die beiden Empfängerblöcke auf dem\n  // Titelblatt Text zeichnen. Leere Zeilen erscheinen auch nicht als "versteckte\n  // Elemente" in der Editor-UI.\n  const blocks = baseBlocks.map((block) =>\n    !showCompany && (block.id === "anTitel" || block.id === "empfaenger")\n      ? { ...block, lines: [] }\n      : block,\n  );\n\n  const recipientTitle = baseBlocks.find((block) => block.id === "anTitel");\n  const recipientBody = baseBlocks.find((block) => block.id === "empfaenger");\n  const contentBlocks: Block[] = [];\n\n  if (recipientTitle && recipientBody) {\n    const bothVisible = showCompany && showContent;\n    const titleDefault = bothVisible\n      ? {\n          ...recipientTitle.style,\n          follows: null,\n          above: "inhalt",\n          anchorBottom: false,\n          gap: 1.5,\n        }\n      : recipientTitle.style;\n    const bodyDefault = bothVisible\n      ? {\n          ...recipientBody.style,\n          follows: null,\n          above: "anTitel",\n          anchorBottom: false,\n          gap: 4,\n        }\n      : recipientBody.style;\n\n    contentBlocks.push(\n      {\n        id: "inhaltTitel",\n        label: "Titel Inhalt",\n        kind: "text",\n        lines: showContent && contentLines.length ? ["Inhalt"] : [],\n        style: { ...titleDefault, ...(overrides.inhaltTitel ?? {}) },\n      },\n      {\n        id: "inhalt",\n        label: "Inhalt",\n        kind: "text",\n        lines: showContent ? contentLines : [],\n        style: { ...bodyDefault, ...(overrides.inhalt ?? {}) },\n      },\n    );\n  }\n\n  // Decorations render first so text/photos/custom content remain above them.\n  // They are otherwise normal shape blocks, so the shared BlockLayer and\n  // ElementBar provide dragging, size, colour, opacity, reset and remove.\n  return [...decorations, ...blocks, ...contentBlocks];\n''',
)

# Semantic roles for the new native blocks.
replace(
    "src/components/cover/BlockLayer.tsx",
    '  if (["eyebrow", "kicker", "kontaktTitel", "anTitel"].includes(block.id)) return "heading";\n',
    '  if (["eyebrow", "kicker", "kontaktTitel", "anTitel", "inhaltTitel"].includes(block.id))\n    return "heading";\n',
)
replace(
    "src/components/cover/BlockLayer.tsx",
    '  if (["kontakt", "empfaenger"].includes(block.id)) return "body";\n',
    '  if (["kontakt", "empfaenger", "inhalt"].includes(block.id)) return "body";\n',
)

# ---------------------------------------------------------------------------
# Title page route: defaults, migration, section, save version.
# ---------------------------------------------------------------------------
replace(
    "src/routes/titelblatt.tsx",
    '  FormFoto,\n  FormMeta,\n',
    '  FormFoto,\n  FormInhalt,\n  FormMeta,\n',
)
replace(
    "src/routes/titelblatt.tsx",
    '  customKind,\n  DEMO_DATA,\n',
    '  customKind,\n  DEFAULT_COVER_CONTENT,\n  DEMO_DATA,\n',
)
replace(
    "src/routes/titelblatt.tsx",
    '  betriebAdresse: "",\n  ort: "",\n',
    '  betriebAdresse: "",\n  showBetriebOnCover: false,\n  showInhaltOnCover: true,\n  inhalt: [...DEFAULT_COVER_CONTENT],\n  ort: "",\n',
)
replace(
    "src/routes/titelblatt.tsx",
    ' * 7 = gemeinsame Dossier-Schrift für Titelblatt und Lebenslauf.\n */\nconst SAVE_VERSION = 7;\n',
    ' * 7 = gemeinsame Dossier-Schrift für Titelblatt und Lebenslauf.\n * 8 = Sichtbarkeit Firma / Lehrbetrieb und native Inhaltsrubrik.\n */\nconst SAVE_VERSION = 8;\n',
)
replace(
    "src/routes/titelblatt.tsx",
    'const prefill = (d: CoverData): CoverData => ({\n  ...d,\n',
    'const prefill = (d: CoverData): CoverData => ({\n  ...d,\n  showBetriebOnCover: d.showBetriebOnCover === true,\n  showInhaltOnCover: d.showInhaltOnCover !== false,\n  inhalt: Array.isArray(d.inhalt) ? d.inhalt : [...DEFAULT_COVER_CONTENT],\n',
)
replace(
    "src/routes/titelblatt.tsx",
    '  | "betrieb"\n  | "ortDatum"\n',
    '  | "betrieb"\n  | "inhalt"\n  | "ortDatum"\n',
)
replace(
    "src/routes/titelblatt.tsx",
    '    betrieb: false,\n    ortDatum: false,\n',
    '    betrieb: false,\n    inhalt: true,\n    ortDatum: false,\n',
)
replace(
    "src/routes/titelblatt.tsx",
    '''            <Section\n              title="Lehrbetrieb"\n              open={open.betrieb}\n              onToggle={() => toggleSection("betrieb")}\n              hint={`${filled([data.lehrbetrieb, data.ansprechperson, data.betriebAdresse])} / 3`}\n            >\n              <FormBetrieb data={data} onChange={patch} />\n            </Section>\n\n            <Section\n              title="Ort & Datum"\n''',
    '''            <Section\n              title="Firma / Lehrbetrieb"\n              open={open.betrieb}\n              onToggle={() => toggleSection("betrieb")}\n              hint={\n                data.showBetriebOnCover\n                  ? `${filled([data.lehrbetrieb, data.ansprechperson, data.betriebAdresse])} / 3 · angezeigt`\n                  : "ausgeblendet"\n              }\n            >\n              <FormBetrieb data={data} onChange={patch} />\n            </Section>\n\n            <Section\n              title="Inhalt"\n              open={open.inhalt}\n              onToggle={() => toggleSection("inhalt")}\n              hint={data.showInhaltOnCover === false ? "ausgeblendet" : "angezeigt"}\n            >\n              <FormInhalt data={data} onChange={patch} />\n            </Section>\n\n            <Section\n              title="Ort & Datum"\n''',
)

# ---------------------------------------------------------------------------
# Regression test: old save without new flags gets desired defaults and toggles.
# ---------------------------------------------------------------------------
replace(
    "tests/e2e/dossier-regression.spec.ts",
    '  test("Horizont-Farbfläche schliesst ohne weisse Naht bis zum unteren Blattrand", async ({\n',
    '''  test("title page defaults to content visible and company hidden, both independently toggleable", async ({\n    page,\n  }) => {\n    await seedCoreDossier(page);\n    await page.goto(`${BASE_URL}/titelblatt`, { waitUntil: "domcontentloaded" });\n\n    const companySection = page.locator("section").filter({ hasText: "Firma / Lehrbetrieb" });\n    const contentSection = page.locator("section").filter({ hasText: /^Inhalt/ });\n    const companyToggle = companySection.getByLabel("Auf Titelblatt anzeigen");\n    const contentToggle = contentSection.getByLabel("Auf Titelblatt anzeigen");\n\n    await expect(companyToggle).not.toBeChecked();\n    await expect(contentToggle).toBeChecked();\n\n    const sheet = page.locator('[data-dossier-document="cover"]').first();\n    await expect(sheet.locator('[data-block-id="empfaenger"]')).toHaveCount(0);\n    await expect(sheet.locator('[data-block-id="inhaltTitel"]')).toContainText("Inhalt");\n    await expect(sheet.locator('[data-block-id="inhalt"]')).toContainText("Motivationsschreiben");\n    await expect(sheet.locator('[data-block-id="inhalt"]')).toContainText("Lebenslauf");\n    await expect(sheet.locator('[data-block-id="inhalt"]')).toContainText("Zeugnis");\n\n    await companyToggle.check();\n    await expect(sheet.locator('[data-block-id="empfaenger"]')).toContainText("Beispiel AG");\n    const contentBox = await sheet.locator('[data-block-id="inhalt"]').boundingBox();\n    const companyBox = await sheet.locator('[data-block-id="anTitel"]').boundingBox();\n    expect(contentBox).not.toBeNull();\n    expect(companyBox).not.toBeNull();\n    expect((contentBox?.y ?? 0) + (contentBox?.height ?? 0)).toBeLessThanOrEqual(\n      (companyBox?.y ?? 0) + 1,\n    );\n\n    await contentToggle.uncheck();\n    await expect(sheet.locator('[data-block-id="inhaltTitel"]')).toHaveCount(0);\n    await expect(sheet.locator('[data-block-id="inhalt"]')).toHaveCount(0);\n    await expect(sheet.locator('[data-block-id="empfaenger"]')).toContainText("Beispiel AG");\n  });\n\n  test("Horizont-Farbfläche schliesst ohne weisse Naht bis zum unteren Blattrand", async ({\n''',
)

print("cover content rubric migration applied")

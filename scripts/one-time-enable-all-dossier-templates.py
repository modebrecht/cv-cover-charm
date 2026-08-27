from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing patch anchor: {label}")
    if text.count(old) != 1:
        raise SystemExit(f"ambiguous patch anchor: {label} ({text.count(old)})")
    p.write_text(text.replace(old, new, 1))


# Shared title-page/CV picker: every registered dossier design is selectable.
replace_once(
    "src/components/cover/TemplatePicker.tsx",
    'const SELECTABLE_TEMPLATES = TEMPLATES.filter((template) => template.id !== "colorful").sort(\n  (a, b) => a.name.localeCompare(b.name, "de", { sensitivity: "base" }),\n);',
    'const SELECTABLE_TEMPLATES = [...TEMPLATES].sort((a, b) =>\n  a.name.localeCompare(b.name, "de", { sensitivity: "base" }),\n);',
    "shared picker filter",
)
replace_once(
    "src/components/cover/TemplatePicker.tsx",
    '''  // Colorful is retired. Old saved drafts still deserialize because the legacy\n  // id remains part of TemplateId, but the first render migrates them to Blockig.\n  // New drafts can no longer select Colorful.\n  useEffect(() => {\n    if (value === "colorful") {\n      onChange("blockig");\n      return;\n    }\n    applyDossierTheme(value, freshFamilyForTemplate(value) ?? familyForTemplate(value));\n  }, [onChange, value]);''',
    '''  useEffect(() => {\n    applyDossierTheme(value, freshFamilyForTemplate(value) ?? familyForTemplate(value));\n  }, [value]);''',
    "shared picker colorful migration",
)

# Letter picker must register the 18 fresh runtime templates itself, not rely on
# another route having imported them first.
replace_once(
    "src/components/letter/LetterTemplatePicker.tsx",
    'import { TEMPLATES } from "@/components/cover/types";\n',
    'import "@/components/cover/fresh-templates";\nimport { TEMPLATES } from "@/components/cover/types";\n',
    "letter fresh template registration",
)

# CV loading: preserve Colorful like every other valid design.
replace_once(
    "src/routes/lebenslauf.tsx",
    '''  if (merged.template === "colorful") {\n    merged.template = "blockig";\n    merged.colors = defaultColors("blockig");\n  }\n''',
    "",
    "cv colorful migration",
)

# Gallery: register fresh definitions and create a real complete-dossier PDF for
# every design. Colorful now remains Colorful in the CV as well.
replace_once(
    "tests/e2e/dossier-gallery.spec.ts",
    'import { join } from "node:path";\nimport { TEMPLATES, type TemplateId } from "../../src/components/cover/types";',
    'import { join } from "node:path";\nimport "../../src/components/cover/fresh-templates";\nimport { TEMPLATES, type TemplateId } from "../../src/components/cover/types";',
    "gallery fresh template registration",
)
replace_once(
    "tests/e2e/dossier-gallery.spec.ts",
    '      cvTemplate: template.id === "colorful" ? ("blockig" as const) : template.id,',
    '      cvTemplate: template.id,',
    "gallery colorful cv remap",
)
replace_once(
    "tests/e2e/dossier-gallery.spec.ts",
    '  expect(cases).toHaveLength(20);',
    '  expect(TEMPLATES).toHaveLength(37);\n  expect(cases).toHaveLength(38);',
    "gallery case count",
)
replace_once(
    "tests/e2e/dossier-gallery.spec.ts",
    '''  manifest.push(\n    "",\n    "Hinweis: Colorful ist beim CV historisch stillgelegt; deshalb nutzt die Colorful-Gesamtdossier-PDF für den CV die Vorlage Blockig.",\n  );\n''',
    "",
    "gallery retired-colorful note",
)
replace_once(
    "tests/e2e/dossier-gallery.spec.ts",
    '  expect(files.filter((file) => file.toLowerCase().endsWith(".pdf"))).toHaveLength(21);',
    '  expect(files.filter((file) => file.toLowerCase().endsWith(".pdf"))).toHaveLength(39);',
    "gallery pdf count",
)

# Add a focused UI regression: all design buttons must exist in all three editors;
# Colorful must persist instead of being rewritten.
p = Path("tests/e2e/dossier-regression.spec.ts")
text = p.read_text()
anchor = '  test("document editors expose one consistent overview home link", async ({ page }) => {'
if anchor not in text:
    raise SystemExit("missing regression insertion anchor")
block = '''  test("all dossier design templates are selectable in all three workspaces", async ({ page }) => {\n    const expectedDesigns = 37;\n\n    await page.goto(`${BASE_URL}/titelblatt`, { waitUntil: "domcontentloaded" });\n    await page.evaluate(() => localStorage.clear());\n    await page.reload({ waitUntil: "domcontentloaded" });\n    const coverDownload = page.getByRole("button", { name: "Download", exact: true });\n    await expect(coverDownload).toHaveAttribute("data-editor-ready", "true");\n    const coverTemplateHeader = page.getByRole("button", { name: /^Vorlage/ });\n    if ((await coverTemplateHeader.getAttribute("aria-expanded")) !== "true") await coverTemplateHeader.click();\n    const coverPanelId = await coverTemplateHeader.getAttribute("aria-controls");\n    const coverPanel = page.locator(`[id="${coverPanelId}"]`);\n    await expect(coverPanel.locator("button[aria-pressed]")).toHaveCount(expectedDesigns);\n    await coverPanel.getByRole("button", { name: "Colorful", exact: true }).click();\n    await page.waitForTimeout(400);\n    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("titelblatt:v3") ?? "null")?.template)).toBe("colorful");\n\n    await page.goto(`${BASE_URL}/lebenslauf`, { waitUntil: "domcontentloaded" });\n    const cvDownload = page.getByRole("button", { name: "Download", exact: true });\n    await expect(cvDownload).toHaveAttribute("data-editor-ready", "true");\n    const cvTemplateHeader = page.getByRole("button", { name: /^Vorlage/ });\n    if ((await cvTemplateHeader.getAttribute("aria-expanded")) !== "true") await cvTemplateHeader.click();\n    const cvPanelId = await cvTemplateHeader.getAttribute("aria-controls");\n    const cvPanel = page.locator(`[id="${cvPanelId}"]`);\n    // 37 design buttons plus the five separate CV layout cards.\n    await expect(cvPanel.getByRole("button", { name: "Colorful", exact: true })).toBeVisible();\n    await cvPanel.getByRole("button", { name: "Colorful", exact: true }).click();\n    await page.waitForTimeout(400);\n    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("lebenslauf:v1") ?? "null")?.design?.template)).toBe("colorful");\n\n    await page.goto(`${BASE_URL}/anschreiben`, { waitUntil: "domcontentloaded" });\n    const letterDownload = page.getByRole("button", { name: "Download", exact: true });\n    await expect(letterDownload).toHaveAttribute("data-editor-ready", "true");\n    const letterTemplateHeader = page.getByRole("button", { name: /^Vorlage/ });\n    if ((await letterTemplateHeader.getAttribute("aria-expanded")) !== "true") await letterTemplateHeader.click();\n    const letterPanelId = await letterTemplateHeader.getAttribute("aria-controls");\n    const letterPanel = page.locator(`[id="${letterPanelId}"]`);\n    await expect(letterPanel.locator("button[aria-pressed]")).toHaveCount(expectedDesigns + 1);\n    await letterPanel.getByRole("button", { name: "Colorful", exact: true }).click();\n    await page.waitForTimeout(400);\n    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("anschreiben:v1") ?? "null")?.design?.template)).toBe("colorful");\n  });\n\n'''
if block not in text:
    text = text.replace(anchor, block + anchor, 1)
p.write_text(text)

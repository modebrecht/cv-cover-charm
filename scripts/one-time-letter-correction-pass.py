from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"Expected text not found in {path}: {old[:180]!r}")
    file.write_text(text.replace(old, new, 1))


# Student-friendly terminology and section order.
route = Path("src/routes/anschreiben.tsx")
text = route.read_text()
text = text.replace('title="Absender"', 'title="Meine Kontaktdaten"', 1)
text = text.replace('title="Empfänger"', 'title="Firma / Lehrbetrieb"', 1)
text = text.replace('title="Brief"', 'title="Briefinhalt"', 1)
text = text.replace('label="Betreff"', 'label="Titel / Betreff"', 1)

layout_start = text.find('            <Section title="Layout"')
brief_start = text.find('            <Section title="Briefinhalt"')
if layout_start < 0 or brief_start < 0 or layout_start > brief_start:
    raise SystemExit("Layout/Brief section anchors not found in expected order")
vorlage_start = text.find('            <Section title="Vorlage"', brief_start)
if vorlage_start < 0:
    raise SystemExit("Vorlage section anchor missing")
layout_block = text[layout_start:brief_start]
brief_block = text[brief_start:vorlage_start]
text = text[:layout_start] + brief_block + layout_block + text[vorlage_start:]
route.write_text(text)

# Design model: optional subject rule, backward compatible.
replace_once(
    "src/components/letter/types.ts",
    "  ruleAfterRecipient?: boolean;\n",
    "  ruleAfterRecipient?: boolean;\n  ruleAfterSubject?: boolean;\n",
)
replace_once(
    "src/components/letter/types.ts",
    "    ruleAfterRecipient: false,\n",
    "    ruleAfterRecipient: false,\n    ruleAfterSubject: false,\n",
)
replace_once(
    "src/components/letter/types.ts",
    "    ruleAfterRecipient: incoming.ruleAfterRecipient === true,\n",
    "    ruleAfterRecipient: incoming.ruleAfterRecipient === true,\n    ruleAfterSubject: incoming.ruleAfterSubject === true,\n",
)

# Layout controls: student-facing wording + subject line option.
controls = Path("src/components/letter/LetterLayoutControls.tsx")
text = controls.read_text()
text = text.replace('label="Absender"', 'label="Meine Kontaktdaten"', 1)
text = text.replace('label="Empfänger"', 'label="Firma / Lehrbetrieb"', 1)
text = text.replace('Trennlinie nach Absender', 'Trennlinie nach meinen Kontaktdaten', 1)
text = text.replace('Trennlinie nach Empfänger', 'Trennlinie nach Firma / Lehrbetrieb', 1)
needle = '''        <label className="flex items-center gap-2 text-xs">\n          <input\n            type="checkbox"\n            checked={design.ruleAfterRecipient === true}\n            onChange={(event) => onChange({ ruleAfterRecipient: event.target.checked })}\n          />\n          Trennlinie nach Firma / Lehrbetrieb\n        </label>'''
replacement = needle + '''\n        <label className="flex items-center gap-2 text-xs">\n          <input\n            type="checkbox"\n            checked={design.ruleAfterSubject === true}\n            onChange={(event) => onChange({ ruleAfterSubject: event.target.checked })}\n          />\n          Trennlinie nach Titel / Betreff\n        </label>'''
if needle not in text:
    raise SystemExit("Recipient rule control anchor missing")
controls.write_text(text.replace(needle, replacement, 1))

# Subject: bold heading by default; separator becomes optional.
canvas = Path("src/components/letter/LetterCanvas.tsx")
text = canvas.read_text()
old = '''          <div\n            data-letter-pdf-text="subject"\n            className="mb-[8mm] border-b pb-[2.5mm] text-[12pt] font-semibold leading-tight"\n            style={{ borderColor: palette.accent }}\n          >\n            {data.betreff || (exportMode ? "" : "Bewerbung um eine Lehrstelle als …")}\n          </div>\n\n          <p data-letter-pdf-text="salutation" className="mb-[5mm]">'''
new = '''          <div\n            data-letter-pdf-text="subject"\n            className="text-[12pt] font-semibold leading-tight"\n          >\n            {data.betreff || (exportMode ? "" : "Bewerbung um eine Lehrstelle als …")}\n          </div>\n          {design.ruleAfterSubject ? (\n            <Separator color={palette.accent} marker="subject" />\n          ) : (\n            <div className="h-[8mm]" aria-hidden="true" />\n          )}\n\n          <p data-letter-pdf-text="salutation" className="mb-[5mm]">'''
if old not in text:
    raise SystemExit("Subject rendering anchor missing")
canvas.write_text(text.replace(old, new, 1))

# Regression: new language + optional subject separator.
test = Path("tests/e2e/dossier-regression.spec.ts")
text = test.read_text()
text = text.replace('{ name: "Absender Rechts" }', '{ name: "Meine Kontaktdaten Rechts" }', 1)
text = text.replace('{ name: "Empfänger Rechts" }', '{ name: "Firma / Lehrbetrieb Rechts" }', 1)
text = text.replace('getByLabel("Trennlinie nach Absender")', 'getByLabel("Trennlinie nach meinen Kontaktdaten")', 1)
text = text.replace('getByLabel("Trennlinie nach Empfänger")', 'getByLabel("Trennlinie nach Firma / Lehrbetrieb")', 1)
text = text.replace(
    '    await page.getByLabel("Trennlinie nach Firma / Lehrbetrieb").check();\n',
    '    await page.getByLabel("Trennlinie nach Firma / Lehrbetrieb").check();\n    await page.getByLabel("Trennlinie nach Titel / Betreff").check();\n',
    1,
)
text = text.replace(
    '    await expect(preview.locator(\'[data-letter-pdf-rule="recipient"]\')).toBeVisible();\n',
    '    await expect(preview.locator(\'[data-letter-pdf-rule="recipient"]\')).toBeVisible();\n    await expect(preview.locator(\'[data-letter-pdf-rule="subject"]\')).toBeVisible();\n    await expect(page.getByRole("textbox", { name: "Titel / Betreff", exact: true })).toBeVisible();\n',
    1,
)
text = text.replace(
    '          ruleAfterRecipient: true,\n',
    '          ruleAfterRecipient: true,\n          ruleAfterSubject: true,\n',
    1,
)
# Existing tests must target fields exactly because the new student-friendly layout labels reuse words.
text = text.replace(
    'page.getByLabel("Lehrbetrieb")',
    'page.getByRole("textbox", { name: "Lehrbetrieb", exact: true })',
)
text = text.replace(
    'page.getByRole("textbox", { name: "Betreff", exact: true })',
    'page.getByRole("textbox", { name: "Titel / Betreff", exact: true })',
)
test.write_text(text)

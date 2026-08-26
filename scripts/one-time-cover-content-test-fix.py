from pathlib import Path

p = Path("tests/e2e/dossier-regression.spec.ts")
text = p.read_text()
old = '''    const companyToggle = companySection.getByLabel("Auf Titelblatt anzeigen");
    const contentToggle = contentSection.getByLabel("Auf Titelblatt anzeigen");

    await expect(companyToggle).not.toBeChecked();'''
new = '''    await companySection.getByRole("button", { name: /Firma \/ Lehrbetrieb/ }).click();
    const companyToggle = companySection.getByLabel("Auf Titelblatt anzeigen");
    const contentToggle = contentSection.getByLabel("Auf Titelblatt anzeigen");

    await expect(companyToggle).not.toBeChecked();'''
if old not in text:
    raise SystemExit("test setup anchor not found")
p.write_text(text.replace(old, new, 1))
print("title-page rubric test setup fixed")

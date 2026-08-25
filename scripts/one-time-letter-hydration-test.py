from pathlib import Path

path = Path("tests/e2e/dossier-regression.spec.ts")
text = path.read_text()
old = '''    await page.goto(`${BASE_URL}/anschreiben`, { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: "Absender Rechts" }).click();'''
new = '''    await page.goto(`${BASE_URL}/anschreiben`, { waitUntil: "domcontentloaded" });
    // Das Feld wird erst clientseitig aus dem Dossier befüllt und ist damit unser Hydration-Signal.
    await expect(page.getByLabel("Vorname und Nachname")).toHaveValue("Lea Müller");

    await page.getByRole("button", { name: "Absender Rechts" }).click();'''
assert old in text
path.write_text(text.replace(old, new, 1))

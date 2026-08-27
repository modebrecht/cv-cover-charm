from pathlib import Path

path = Path("tests/e2e/dossier-regression.spec.ts")
text = path.read_text()
old = 'page.getByLabel("Titel / Betreff")'
new = 'page.getByRole("textbox", { name: "Titel / Betreff", exact: true })'
count = text.count(old)
if count != 2:
    raise SystemExit(f"expected two letter subject locators, found {count}")
path.write_text(text.replace(old, new))

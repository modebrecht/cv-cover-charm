from pathlib import Path

path = Path("tests/e2e/dossier-regression.spec.ts")
text = path.read_text()
replacements = {
    "page.locator('[data-block-id=\"beilagenTitel\"]')).toContainText(\"Beilagen:\")": "page.locator('[data-block-id=\"beilagenTitel\"]').first()).toContainText(\"Beilagen:\")",
    "page.locator('[data-block-id=\"beilagen\"]')).toContainText(\"Motivationsschreiben\")": "page.locator('[data-block-id=\"beilagen\"]').first()).toContainText(\"Motivationsschreiben\")",
    "page.locator('[data-block-id=\"empfaenger\"]')).toContainText(\"Beispiel AG\")": "page.locator('[data-block-id=\"empfaenger\"]').first()).toContainText(\"Beispiel AG\")",
}
for old, new in replacements.items():
    count = text.count(old)
    if count < 1:
        raise SystemExit(f"missing generated test anchor: {old}")
    text = text.replace(old, new)
path.write_text(text)

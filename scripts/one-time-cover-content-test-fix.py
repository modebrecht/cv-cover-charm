from pathlib import Path

p = Path("tests/e2e/dossier-regression.spec.ts")
text = p.read_text()
old = '''    const companySection = page.locator("section").filter({ hasText: "Firma / Lehrbetrieb" });
    const contentSection = page.locator("section").filter({ hasText: /^Inhalt/ });
    const companyToggle = companySection.getByLabel("Auf Titelblatt anzeigen");
    const contentToggle = contentSection.getByLabel("Auf Titelblatt anzeigen");

    await expect(companyToggle).not.toBeChecked();'''
new = '''    const companyHeader = page.getByRole("button", { name: /^Firma \/ Lehrbetrieb/ });
    const contentHeader = page.getByRole("button", { name: /^Inhalt/ });
    if ((await companyHeader.getAttribute("aria-expanded")) !== "true") {
      await companyHeader.click();
    }
    await expect(companyHeader).toHaveAttribute("aria-expanded", "true");
    const companyPanelId = await companyHeader.getAttribute("aria-controls");
    const contentPanelId = await contentHeader.getAttribute("aria-controls");
    expect(companyPanelId).toBeTruthy();
    expect(contentPanelId).toBeTruthy();
    const companyToggle = page
      .locator(`[id="${companyPanelId}"]`)
      .locator('input[type="checkbox"]')
      .first();
    const contentToggle = page
      .locator(`[id="${contentPanelId}"]`)
      .locator('input[type="checkbox"]')
      .first();

    await expect(companyToggle).not.toBeChecked();'''
if old not in text:
    raise SystemExit("test setup anchor not found")
p.write_text(text.replace(old, new, 1))
print("title-page rubric test setup fixed")

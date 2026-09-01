from pathlib import Path

path = Path("tests/e2e/dossier-regression.spec.ts")
text = path.read_text()

old = '''  test("all dossier design templates are selectable in all three workspaces", async ({ page }) => {
    const expectedDesigns = 37;
'''
new = '''  test("all dossier design templates are selectable in all three workspaces", async ({ page }) => {
    const expectedDesigns = 38;
'''
if old not in text:
    raise SystemExit("expectedDesigns target missing")
text = text.replace(old, new, 1)

old = '''    await expect(coverPanel.locator("button[aria-pressed]")).toHaveCount(expectedDesigns);
    await coverPanel.getByRole("button", { name: "Colorful", exact: true }).click();
    await page.waitForTimeout(400);
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("titelblatt:v3") ?? "null")?.template,
      ),
    ).toBe("colorful");
'''
new = '''    await expect(coverPanel.locator("button[aria-pressed]")).toHaveCount(expectedDesigns);
    await coverPanel.getByRole("button", { name: "Brief", exact: true }).click();
    await page.waitForTimeout(400);
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("titelblatt:v3") ?? "null")?.template,
      ),
    ).toBe("brief");
'''
if old not in text:
    raise SystemExit("cover picker target missing")
text = text.replace(old, new, 1)

old = '''    // 37 design buttons plus the five separate CV layout cards.
    await expect(cvPanel.getByRole("button", { name: "Colorful", exact: true })).toBeVisible();
    await cvPanel.getByRole("button", { name: "Colorful", exact: true }).click();
    await page.waitForTimeout(400);
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("lebenslauf:v1") ?? "null")?.design?.template,
      ),
    ).toBe("colorful");
'''
new = '''    // 38 design buttons plus the separate CV layout cards.
    await expect(cvPanel.getByRole("button", { name: "Brief", exact: true })).toBeVisible();
    await cvPanel.getByRole("button", { name: "Brief", exact: true }).click();
    await page.waitForTimeout(400);
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("lebenslauf:v1") ?? "null")?.design?.template,
      ),
    ).toBe("brief");
'''
if old not in text:
    raise SystemExit("cv picker target missing")
text = text.replace(old, new, 1)

old = '''    await expect(letterPanel.locator("button[aria-pressed]")).toHaveCount(expectedDesigns + 1);
    await letterPanel.getByRole("button", { name: "Colorful", exact: true }).click();
    await page.waitForTimeout(400);
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("anschreiben:v1") ?? "null")?.design?.template,
      ),
    ).toBe("colorful");
'''
new = '''    await expect(letterPanel.locator("button[aria-pressed]")).toHaveCount(expectedDesigns);
    await letterPanel.getByRole("button", { name: "Brief", exact: true }).click();
    await page.waitForTimeout(400);
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("anschreiben:v1") ?? "null")?.design?.template,
      ),
    ).toBe("brief");
'''
if old not in text:
    raise SystemExit("letter picker target missing")
text = text.replace(old, new, 1)

path.write_text(text)
Path(".github/scripts/update-brief-picker-smoke.py").unlink(missing_ok=True)
Path(".github/workflows/update-brief-picker-smoke.yml").unlink(missing_ok=True)

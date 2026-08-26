from pathlib import Path


def replace(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"anchor not found in {path}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))


# The migration creates the new cover model and generic Inhalt rubric first.
# Refine it to the user-facing Beilagen wording and make the heading bold.
replace(
    "src/components/cover/types.ts",
    "  /** Inhaltsrubrik des Bewerbungsdossiers; alte Saves erhalten die heutigen Defaults. */\n",
    "  /** Beilagenrubrik des Bewerbungsdossiers; alte Saves erhalten die heutigen Defaults. */\n",
)
replace(
    "src/components/cover/CoverForm.tsx",
    "        <Field key={index} label={`Eintrag ${index + 1}`}>\n",
    "        <Field key={index} label={`Beilage ${index + 1}`}>\n",
)
replace(
    "src/components/cover/layouts.ts",
    '        label: "Titel Inhalt",\n        kind: "text",\n        lines: showContent && contentLines.length ? ["Inhalt"] : [],\n        style: { ...titleDefault, ...(overrides.inhaltTitel ?? {}) },\n',
    '        label: "Titel Beilagen",\n        kind: "text",\n        lines: showContent && contentLines.length ? ["Beilagen:"] : [],\n        style: { ...titleDefault, weight: 700, ...(overrides.inhaltTitel ?? {}) },\n',
)
replace(
    "src/components/cover/layouts.ts",
    '        label: "Inhalt",\n        kind: "text",\n        lines: showContent ? contentLines : [],\n',
    '        label: "Beilagen",\n        kind: "text",\n        lines: showContent ? contentLines : [],\n',
)
replace(
    "src/routes/titelblatt.tsx",
    " * 8 = Sichtbarkeit Firma / Lehrbetrieb und native Inhaltsrubrik.\n",
    " * 8 = Sichtbarkeit Firma / Lehrbetrieb und native Beilagenrubrik.\n",
)
replace(
    "src/routes/titelblatt.tsx",
    '              title="Inhalt"\n              open={open.inhalt}\n',
    '              title="Beilagen"\n              open={open.inhalt}\n',
)

# Replace the ambiguous section locator from the generated test with the exact
# Section aria-controls panel. At this point the product UI is already Beilagen.
p = Path("tests/e2e/dossier-regression.spec.ts")
text = p.read_text()
old = '''    const companySection = page.locator("section").filter({ hasText: "Firma / Lehrbetrieb" });
    const contentSection = page.locator("section").filter({ hasText: /^Inhalt/ });
    const companyToggle = companySection.getByLabel("Auf Titelblatt anzeigen");
    const contentToggle = contentSection.getByLabel("Auf Titelblatt anzeigen");

    await expect(companyToggle).not.toBeChecked();'''
new = '''    const companyHeader = page.getByRole("button", { name: /^Firma \/ Lehrbetrieb/ });
    const attachmentsHeader = page.getByRole("button", { name: /^Beilagen/ });
    if ((await companyHeader.getAttribute("aria-expanded")) !== "true") {
      await companyHeader.click();
    }
    await expect(companyHeader).toHaveAttribute("aria-expanded", "true");
    const companyPanelId = await companyHeader.getAttribute("aria-controls");
    const attachmentsPanelId = await attachmentsHeader.getAttribute("aria-controls");
    expect(companyPanelId).toBeTruthy();
    expect(attachmentsPanelId).toBeTruthy();
    const companyToggle = page
      .locator(`[id="${companyPanelId}"]`)
      .locator('input[type="checkbox"]')
      .first();
    const attachmentsToggle = page
      .locator(`[id="${attachmentsPanelId}"]`)
      .locator('input[type="checkbox"]')
      .first();

    await expect(companyToggle).not.toBeChecked();'''
if old not in text:
    raise SystemExit("generated title-page test locator anchor not found")
text = text.replace(old, new, 1)
p.write_text(text)

replace(
    "tests/e2e/dossier-regression.spec.ts",
    'title page defaults to content visible and company hidden, both independently toggleable',
    'title page defaults to attachments visible and company hidden, both independently toggleable',
)
replace(
    "tests/e2e/dossier-regression.spec.ts",
    '    await page.goto(`${BASE_URL}/titelblatt`, { waitUntil: "domcontentloaded" });\n\n    const companyHeader =',
    '    await page.goto(`${BASE_URL}/titelblatt`, { waitUntil: "domcontentloaded" });\n    // Wait for client hydration/localStorage restore before clicking a Section header.\n    await expect(page.getByLabel("Vorname")).toHaveValue("Lea");\n\n    const companyHeader =',
)
replace(
    "tests/e2e/dossier-regression.spec.ts",
    "    await expect(contentToggle).toBeChecked();\n",
    "    await expect(attachmentsToggle).toBeChecked();\n",
)
replace(
    "tests/e2e/dossier-regression.spec.ts",
    '    await expect(sheet.locator(\'[data-block-id="inhaltTitel"]\')).toContainText("Inhalt");\n',
    '''    const attachmentsTitle = sheet.locator('[data-block-id="inhaltTitel"]');
    await expect(attachmentsTitle).toContainText("Beilagen:");
    expect(
      await attachmentsTitle.evaluate((element) =>
        Number.parseInt(getComputedStyle(element).fontWeight, 10),
      ),
    ).toBeGreaterThanOrEqual(600);
''',
)
replace(
    "tests/e2e/dossier-regression.spec.ts",
    "    await contentToggle.uncheck();\n",
    "    await attachmentsToggle.uncheck();\n",
)

# Betreff is automatically bold in the letter preview. The PDF text renderer uses
# the same computed weight and maps >= 600 to its bold font style.
replace(
    "tests/e2e/dossier-regression.spec.ts",
    '    await expect(page.getByRole("textbox", { name: "Titel / Betreff", exact: true })).toBeVisible();\n\n    await page.getByRole("button", { name: "Vorlage", exact: true }).click();\n',
    '''    await expect(page.getByRole("textbox", { name: "Titel / Betreff", exact: true })).toBeVisible();
    const subject = preview.locator('[data-letter-pdf-text="subject"]');
    expect(
      await subject.evaluate((element) => Number.parseInt(getComputedStyle(element).fontWeight, 10)),
    ).toBeGreaterThanOrEqual(600);

    await page.getByRole("button", { name: "Vorlage", exact: true }).click();
''',
)

print("title-page Beilagen rubric and regression setup fixed")

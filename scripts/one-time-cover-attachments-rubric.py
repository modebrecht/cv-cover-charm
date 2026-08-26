from pathlib import Path


def replace(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"anchor not found in {path}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))


# User-facing terminology: this is a Beilagen list, not a generic Inhalt block.
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

# The generated regression test is patched after the generic setup fixer has run.
replace(
    "tests/e2e/dossier-regression.spec.ts",
    'title page defaults to content visible and company hidden, both independently toggleable',
    'title page defaults to attachments visible and company hidden, both independently toggleable',
)
replace(
    "tests/e2e/dossier-regression.spec.ts",
    '    const contentHeader = page.getByRole("button", { name: /^Inhalt/ });\n',
    '    const attachmentsHeader = page.getByRole("button", { name: /^Beilagen/ });\n',
)
replace(
    "tests/e2e/dossier-regression.spec.ts",
    '    const contentPanelId = await contentHeader.getAttribute("aria-controls");\n',
    '    const attachmentsPanelId = await attachmentsHeader.getAttribute("aria-controls");\n',
)
replace(
    "tests/e2e/dossier-regression.spec.ts",
    '    expect(contentPanelId).toBeTruthy();\n',
    '    expect(attachmentsPanelId).toBeTruthy();\n',
)
replace(
    "tests/e2e/dossier-regression.spec.ts",
    '''    const contentToggle = page
      .locator(`[id="${contentPanelId}"]`)
      .locator('input[type="checkbox"]')
      .first();
''',
    '''    const attachmentsToggle = page
      .locator(`[id="${attachmentsPanelId}"]`)
      .locator('input[type="checkbox"]')
      .first();
''',
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

# Subject is intentionally automatic bold in preview; the PDF text layer uses the
# same computed font weight and maps >= 600 to the PDF bold font style.
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

print("cover attachments rubric applied")

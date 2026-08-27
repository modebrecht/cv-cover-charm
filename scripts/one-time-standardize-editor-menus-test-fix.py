from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"missing patch anchor: {label}")
    if text.count(old) != 1:
        raise SystemExit(f"ambiguous patch anchor: {label} ({text.count(old)})")
    return text.replace(old, new, 1)


# Give the two existing Download toggles the same accessibility state as the
# new motivation-letter toggle. `data-editor-ready` becomes true only after
# client hydration has advanced the autosave state beyond its SSR default.
for filename in ("src/routes/titelblatt.tsx", "src/routes/lebenslauf.tsx"):
    path = Path(filename)
    text = path.read_text()
    text = replace_once(
        text,
        """                onClick={() => setMenuOpen((v) => !v)}\n                disabled={downloading}\n                className=""",
        """                onClick={() => setMenuOpen((v) => !v)}\n                disabled={downloading}\n                aria-expanded={menuOpen}\n                data-editor-ready={saveState === "idle" ? "false" : "true"}\n                className=""",
        f"{filename} menu state",
    )
    path.write_text(text)

# The motivation-letter menu already has aria-expanded in the main migration.
path = Path("src/routes/anschreiben.tsx")
text = path.read_text()
text = replace_once(
    text,
    """            aria-expanded={menuOpen}\n            className=""",
    """            aria-expanded={menuOpen}\n            data-editor-ready={saveState === "idle" ? "false" : "true"}\n            className=""",
    "letter menu ready marker",
)
path.write_text(text)

path = Path("tests/e2e/dossier-regression.spec.ts")
text = path.read_text()

old = '''    const button = page.getByRole("button", {\n      name: "Motivationsschreiben als PDF herunterladen",\n      exact: true,\n    });\n    await expect(button).toBeEnabled();\n    const downloadPromise = page.waitForEvent("download", { timeout: 90_000 });\n    await button.click();\n'''
new = '''    const downloadToggle = page.getByRole("button", { name: "Download", exact: true });\n    await expect(downloadToggle).toHaveAttribute("data-editor-ready", "true");\n    await expect(downloadToggle).toHaveAttribute("aria-expanded", "false");\n    await downloadToggle.click();\n    await expect(downloadToggle).toHaveAttribute("aria-expanded", "true");\n    const button = page\n      .locator("[data-editor-action-menu] button")\n      .filter({ hasText: "Nur Motivationsschreiben als PDF" });\n    await expect(button).toBeEnabled();\n    const downloadPromise = page.waitForEvent("download", { timeout: 90_000 });\n    await button.click();\n'''
text = replace_once(text, old, new, "standalone pdf uses top menu")

old = '''    const pdfButton = page.getByRole("button", {\n      name: "Motivationsschreiben als PDF herunterladen",\n      exact: true,\n    });\n    await expect(alert).toHaveCount(0);\n    await expect(pdfButton).toBeEnabled();\n\n    await body.fill(\n'''
new = '''    const downloadToggle = page.getByRole("button", { name: "Download", exact: true });\n    await expect(downloadToggle).toHaveAttribute("data-editor-ready", "true");\n    const openPdfMenu = async () => {\n      if ((await downloadToggle.getAttribute("aria-expanded")) !== "true") {\n        await downloadToggle.click();\n      }\n      await expect(downloadToggle).toHaveAttribute("aria-expanded", "true");\n      return page\n        .locator("[data-editor-action-menu] button")\n        .filter({ hasText: "Nur Motivationsschreiben als PDF" });\n    };\n    await expect(alert).toHaveCount(0);\n    await expect(await openPdfMenu()).toBeEnabled();\n\n    await body.fill(\n'''
text = replace_once(text, old, new, "overflow initial pdf state")
text = replace_once(
    text,
    '''    await expect(alert).toContainText("Dein Motivationsschreiben passt nicht auf eine Seite");\n    await expect(pdfButton).toBeDisabled();\n''',
    '''    await expect(alert).toContainText("Dein Motivationsschreiben passt nicht auf eine Seite");\n    await expect(await openPdfMenu()).toBeDisabled();\n''',
    "overflow disabled menu pdf",
)
text = replace_once(
    text,
    '''    await expect(alert).toHaveCount(0);\n    await expect(pdfButton).toBeEnabled();\n  });\n''',
    '''    await expect(alert).toHaveCount(0);\n    await expect(await openPdfMenu()).toBeEnabled();\n  });\n''',
    "overflow reenabled menu pdf",
)

# Wait for a real post-hydration signal instead of a timing guess.
text = replace_once(
    text,
    '''      await page.goto(`${BASE_URL}${item.path}`, { waitUntil: "domcontentloaded" });\n      await page.evaluate(() => localStorage.clear());\n      await page.reload({ waitUntil: "domcontentloaded" });\n\n      await page.getByRole("button", { name: "Download", exact: true }).click();\n      let menu = page.locator("[data-editor-action-menu]");\n      await expect(menu).toBeVisible();\n''',
    '''      await page.goto(`${BASE_URL}${item.path}`, { waitUntil: "domcontentloaded" });\n      const downloadToggle = page.getByRole("button", { name: "Download", exact: true });\n      await expect(downloadToggle).toHaveAttribute("data-editor-ready", "true");\n      await expect(downloadToggle).toHaveAttribute("aria-expanded", "false");\n      await downloadToggle.click();\n      await expect(downloadToggle).toHaveAttribute("aria-expanded", "true");\n      let menu = page.locator("[data-editor-action-menu]");\n      await expect(menu).toBeVisible();\n''',
    "menu test hydration",
)
text = replace_once(
    text,
    '''        await page.getByRole("button", { name: "Download", exact: true }).click();\n        menu = page.locator("[data-editor-action-menu]");\n        await expect(menu).toBeVisible();\n''',
    '''        await expect(downloadToggle).toHaveAttribute("aria-expanded", "false");\n        await downloadToggle.click();\n        await expect(downloadToggle).toHaveAttribute("aria-expanded", "true");\n        menu = page.locator("[data-editor-action-menu]");\n        await expect(menu).toBeVisible();\n''',
    "menu test reopen",
)
path.write_text(text)

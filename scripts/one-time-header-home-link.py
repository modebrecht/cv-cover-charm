from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"anchor missing in {path}: {old[:80]!r}")
    p.write_text(text.replace(old, new, 1))


home_link = '''<Link
            to="/"
            aria-label="Übersicht"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-input px-2.5 py-2 text-sm font-medium hover:bg-accent sm:px-3"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M2.5 7.2 8 2.8l5.5 4.4v5.5a.8.8 0 0 1-.8.8H9.8V9.6H6.2v3.9H3.3a.8.8 0 0 1-.8-.8Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="hidden sm:inline">Übersicht</span>
          </Link>'''

# Titelblatt: Home first, then form toggle; remove sibling-document link.
replace_once(
    "src/routes/titelblatt.tsx",
    '''        <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
          <button''',
    f'''        <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
          {home_link}
          <button''',
)
replace_once(
    "src/routes/titelblatt.tsx",
    '''          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/lebenslauf"
              className="hidden rounded-md border border-input px-3 py-2 text-sm hover:bg-accent sm:inline-flex"
            >
              Lebenslauf
            </Link>
            <ThemeToggle />''',
    '''          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />''',
)
replace_once(
    "src/routes/titelblatt.tsx",
    '"Lebenslauf gespeichert – öffne ihn über die Kopfzeile"',
    '"Lebenslauf gespeichert – öffne ihn über die Übersicht"',
)

# Lebenslauf: same consistent Home link; remove direct Titelblatt link.
replace_once(
    "src/routes/lebenslauf.tsx",
    '''        <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
          <button''',
    f'''        <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
          {home_link}
          <button''',
)
replace_once(
    "src/routes/lebenslauf.tsx",
    '''          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/titelblatt"
              className="hidden rounded-md border border-input px-3 py-2 text-sm hover:bg-accent sm:inline-flex"
            >
              Titelblatt
            </Link>
            <ThemeToggle />''',
    '''          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />''',
)
replace_once(
    "src/routes/lebenslauf.tsx",
    '"Titelblatt gespeichert – öffne es über die Kopfzeile"',
    '"Titelblatt gespeichert – öffne es über die Übersicht"',
)

# Anschreiben already links home, but make it visually and semantically identical.
replace_once(
    "src/routes/anschreiben.tsx",
    '''      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-3 sm:px-4">
        <button''',
    f'''      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-3 sm:px-4">
        {home_link.replace('          ', '        ')}
        <button''',
)
replace_once(
    "src/routes/anschreiben.tsx",
    '''        <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          ← Dossier
        </Link>
''',
    "",
)

# Add regression coverage before the card-template test.
test_path = Path("tests/e2e/dossier-regression.spec.ts")
test_text = test_path.read_text()
anchor = '  test("card-template sidebar clears the header and stays inside the card", async ({ page }) => {'
if anchor not in test_text:
    raise SystemExit("E2E insertion anchor missing")
new_test = '''  test("document editors expose one consistent overview home link", async ({ page }) => {
    for (const path of ["/titelblatt", "/lebenslauf", "/anschreiben"]) {
      await page.goto(path);
      const header = page.locator("header").first();
      const overview = header.getByRole("link", { name: "Übersicht" });
      await expect(overview).toHaveCount(1);
      await expect(overview).toHaveAttribute("href", "/");
    }

    await page.goto("/titelblatt");
    await expect(page.locator('header a[href="/lebenslauf"]')).toHaveCount(0);
    await page.goto("/lebenslauf");
    await expect(page.locator('header a[href="/titelblatt"]')).toHaveCount(0);
  });

'''
test_path.write_text(test_text.replace(anchor, new_test + anchor, 1))
